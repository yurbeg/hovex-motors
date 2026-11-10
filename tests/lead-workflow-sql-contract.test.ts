import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202611100003_lead_response_workflow.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

test("lead workflow migration keeps managers and activities admin-readable only", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create table public\.lead_managers/);
  assert.match(sql, /auth_user_id uuid unique references auth\.users\(id\) on delete set null/);
  assert.match(sql, /email text, is_active boolean not null default true/);
  assert.match(sql, /alter table public\.lead_managers enable row level security/);
  assert.match(sql, /revoke all privileges on table public\.lead_managers from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select on table public\.lead_managers to authenticated/);
  assert.match(sql, /create policy lead_managers_admin_read_all[^;]*app_private\.is_vehicle_admin\(\)/);

  assert.match(sql, /create table public\.lead_activities/);
  assert.match(sql, /alter table public\.lead_activities enable row level security/);
  assert.match(sql, /revoke all privileges on table public\.lead_activities from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select on table public\.lead_activities to authenticated/);
  assert.match(sql, /create policy lead_activities_admin_read_all[^;]*app_private\.is_vehicle_admin\(\)/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]*public\.lead_(?:managers|activities)[^;]*to authenticated/);
});

test("workflow RPC owns writes, checks revisions, and enforces the practical transition graph", async () => {
  const sql = await migrationSql();

  assert.match(sql, /revoke update \(status\) on table public\.leads from authenticated/);
  assert.match(sql, /drop policy if exists leads_admin_update_status on public\.leads/);
  assert.doesNotMatch(sql, /grant update[^;]*public\.leads[^;]*to authenticated/);
  assert.match(sql, /create or replace function public\.update_lead_workflow\( p_lead_id uuid, p_expected_updated_at timestamptz, p_new_status text, p_new_manager_id uuid, p_new_next_action_at timestamptz \)/);
  assert.match(sql, /security definer set search_path = ''/);
  assert.match(sql, /v_current\.updated_at is distinct from p_expected_updated_at/);
  assert.match(sql, /using errcode = '40001'/);
  assert.match(sql, /p_from_status = 'new' and p_to_status in \('contacted', 'closed'\)/);
  assert.match(sql, /p_from_status = 'contacted' and p_to_status in \('booked', 'closed'\)/);
  assert.match(sql, /p_from_status = 'booked' and p_to_status in \('contacted', 'closed'\)/);
  assert.match(sql, /p_from_status = 'closed' and p_to_status = 'contacted'/);
  assert.match(sql, /lead manager is missing or inactive/);
  assert.match(sql, /grant execute on function public\.update_lead_workflow\([^;]+\) to authenticated/);
});

test("first-response SLA is server-derived from receipt time and immutable", async () => {
  const sql = await migrationSql();

  assert.match(sql, /add column first_response_due_at timestamptz,/);
  assert.doesNotMatch(sql, /add column first_response_due_at timestamptz default/);
  assert.match(sql, /first_response_due_at = leads\.created_at \+ interval '30 minutes'/);
  assert.match(sql, /new\.first_response_due_at := new\.created_at \+ interval '30 minutes'/);
  assert.match(sql, /old\.first_response_due_at is distinct from new\.first_response_due_at/);
  assert.match(sql, /raise exception 'first response deadline is immutable'/);
  assert.match(sql, /alter column first_response_due_at set not null/);
  assert.match(sql, /first_contacted_at = null/);
  assert.doesNotMatch(sql, /min\(id\)/);
  assert.equal((sql.match(/\(array_agg\(id order by id\)\)\[1\]/g) ?? []).length, 2);

  const disableTrigger = sql.indexOf("alter table public.leads disable trigger leads_set_updated_at");
  const backfill = sql.indexOf("with sole_active_manager as");
  const enableTrigger = sql.indexOf("alter table public.leads enable trigger leads_set_updated_at");
  assert.ok(disableTrigger >= 0 && disableTrigger < backfill);
  assert.ok(backfill < enableTrigger);
});

test("lead activities are append-only and internal notes are bounded server writes", async () => {
  const sql = await migrationSql();

  for (const activityType of [
    "created",
    "status_changed",
    "manager_assigned",
    "manager_unassigned",
    "next_action_changed",
    "note_added",
  ]) {
    assert.match(sql, new RegExp(`'${activityType}'`));
  }
  assert.match(sql, /before update or delete on public\.lead_activities/);
  assert.match(sql, /raise exception 'lead activities are append-only'/);
  assert.match(sql, /char_length\(btrim\(note_body\)\) between 1 and 2000/);
  assert.match(sql, /create or replace function public\.add_lead_note\( p_lead_id uuid, p_body text \)/);
  assert.match(sql, /char_length\(v_body\) not between 1 and 2000/);
  assert.match(sql, /grant execute on function public\.add_lead_note\(uuid, text\) to authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]*public\.lead_activities/);
});

test("new leads enqueue one enabled Telegram outbox job transactionally", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create table app_private\.lead_notification_channels/);
  assert.match(sql, /values \('telegram', 'telegram', 'telegram', true, 8\)/);
  assert.match(sql, /create table app_private\.lead_notification_outbox/);
  assert.match(sql, /unique \(lead_id, channel_key\)/);
  assert.match(sql, /create trigger leads_enqueue_notifications_after_insert after insert on public\.leads/);
  assert.match(sql, /from app_private\.lead_notification_channels as channels where channels\.channel_type = 'telegram' and channels\.is_enabled/);
  assert.match(sql, /on conflict \(lead_id, channel_key\) do nothing/);
  assert.match(sql, /revoke all privileges on table app_private\.lead_notification_channels, app_private\.lead_notification_outbox from public, anon, authenticated, service_role/);
});

test("notification workers use service-role-only leases with bounded retry and dead-letter semantics", async () => {
  const sql = await migrationSql();

  for (const [name, signature] of [
    ["claim_lead_notification_jobs", "integer, integer"],
    ["complete_lead_notification_job", "uuid, uuid, text"],
    ["fail_lead_notification_job", "uuid, uuid, boolean, integer, text, text"],
  ] as const) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedSignature = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      sql,
      new RegExp(`revoke all privileges on function public\\.${escapedName}\\(\\s*${escapedSignature}\\s*\\) from public, anon, authenticated, service_role`),
    );
    assert.match(
      sql,
      new RegExp(`grant execute on function public\\.${escapedName}\\(\\s*${escapedSignature}\\s*\\) to service_role`),
    );
  }

  assert.match(sql, /for update of jobs skip locked/);
  assert.match(sql, /lease_token = gen_random_uuid\(\)/);
  assert.match(sql, /jobs\.lease_token = p_lease_token/);
  assert.match(sql, /p_retry_after_seconds is not null and p_retry_after_seconds not between 1 and 86400/);
  assert.match(sql, /case v_attempt_count when 1 then 60 when 2 then 120 when 3 then 300 when 4 then 900 when 5 then 1800 else 3600 end/);
  assert.match(sql, /when p_retryable and v_attempt_count < v_max_attempts then 'retry' else 'dead'/);
  assert.match(sql, /last_error_code = 'attempts_exhausted'/);
});

test("workflow tables participate in guarded admin realtime refresh", async () => {
  const sql = await migrationSql();

  assert.match(sql, /pubname = 'supabase_realtime'[^;]+tablename = 'lead_managers'[^;]+alter publication supabase_realtime add table public\.lead_managers/);
  assert.match(sql, /pubname = 'supabase_realtime'[^;]+tablename = 'lead_activities'[^;]+alter publication supabase_realtime add table public\.lead_activities/);
});
