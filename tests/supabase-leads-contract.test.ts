import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202611100001_create_leads.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

test("lead migration denies direct public access and grants admins status-only updates", async () => {
  const sql = await migrationSql();

  assert.match(sql, /alter table public\.leads enable row level security/);
  assert.match(sql, /revoke all privileges on table public\.leads from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select on table public\.leads to authenticated/);
  assert.match(sql, /grant update \(status\) on table public\.leads to authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|delete)[^;]*public\.leads[^;]*to (?:anon|authenticated)/);
  assert.match(sql, /create policy leads_admin_read_all[^;]*app_private\.is_vehicle_admin\(\)/);
  assert.match(sql, /create policy leads_admin_update_status[^;]*app_private\.is_vehicle_admin\(\)/);
});

test("lead migration enforces idempotency, consent, and bounded public fields", async () => {
  const sql = await migrationSql();

  assert.match(sql, /client_request_id uuid not null unique/);
  assert.match(sql, /submission_hash text not null/);
  assert.match(sql, /consent_version text not null/);
  assert.match(sql, /consent_at timestamptz not null/);
  assert.match(sql, /contact_method in \('phone', 'whatsapp', 'video_call', 'showroom_visit'\)/);
  assert.match(sql, /preferred_time text not null default '10:00–13:00'/);
  assert.match(sql, /preferred_time in \('10:00–13:00', '13:00–16:00', '16:00–19:00'\)/);
  assert.match(sql, /char_length\(note\) <= 2000/);
  assert.match(sql, /status in \('new', 'contacted', 'booked', 'closed'\)/);
});

test("lead abuse-control storage keeps only a hashed fingerprint", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create table app_private\.lead_submission_limits/);
  assert.match(sql, /fingerprint text primary key/);
  assert.match(sql, /fingerprint ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.doesNotMatch(sql, /\bip_address\b|\buser_agent\b/);
  assert.match(sql, /revoke all privileges on table app_private\.lead_submission_limits from public, anon, authenticated, service_role/);
  assert.match(sql, /least\(limits\.request_count \+ 1, p_limit \+ 1\)/);
  assert.match(sql, /or limits\.request_count <= p_limit/);
  assert.match(sql, /if random\(\) < 0\.01 then delete from app_private\.lead_submission_limits/);
  assert.match(sql, /grant execute on function public\.consume_lead_submission_limit[^;]*to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.consume_lead_submission_limit[^;]*to (?:anon|authenticated)/);
});
