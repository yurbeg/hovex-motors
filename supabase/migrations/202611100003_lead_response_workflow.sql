begin;

-- Operational assignees are deliberately separate from admin authorization.
-- A manager may own leads without receiving a Supabase Auth login, while the
-- existing singleton admin allowlist remains the only browser authorization
-- boundary.
create table public.lead_managers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique
    references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lead_managers_display_name_check
    check (char_length(btrim(display_name)) between 2 and 120),
  constraint lead_managers_email_check
    check (
      email is null
      or char_length(btrim(email)) between 3 and 320
    )
);

comment on table public.lead_managers is
  'Operational lead assignees; manager records do not grant admin access';
comment on column public.lead_managers.auth_user_id is
  'Optional Supabase Auth identity for a manager who also has a login';

create index lead_managers_active_name_idx
  on public.lead_managers (display_name, id)
  where is_active;

create trigger lead_managers_set_updated_at
before update on public.lead_managers
for each row
execute function public.set_updated_at();

alter table public.lead_managers enable row level security;

revoke all privileges
  on table public.lead_managers
  from public, anon, authenticated, service_role;

grant select
  on table public.lead_managers
  to authenticated;

create policy lead_managers_admin_read_all
on public.lead_managers
for select
to authenticated
using ((select app_private.is_vehicle_admin()));

-- Preserve the current one-admin authorization model, but make that person
-- the initial operational manager so new leads can be assigned immediately.
insert into public.lead_managers (
  auth_user_id,
  display_name,
  email
)
select
  users.id,
  left(
    coalesce(
      case
        when char_length(btrim(users.raw_user_meta_data ->> 'full_name')) >= 2
          then btrim(users.raw_user_meta_data ->> 'full_name')
        else null
      end,
      nullif(btrim(users.email), ''),
      'Hovex admin'
    ),
    120
  ),
  nullif(left(btrim(users.email), 320), '')
from public.admin_users as admins
join auth.users as users
  on users.id = admins.user_id
on conflict (auth_user_id) do nothing;

alter table public.leads
  add column assigned_manager_id uuid
    references public.lead_managers(id) on delete restrict,
  add column first_response_due_at timestamptz,
  add column first_contacted_at timestamptz,
  add column next_action_at timestamptz;

-- Existing requests receive the same SLA measured from their original
-- receipt time. Historical first-contact timestamps cannot be reconstructed
-- truthfully, so they remain null even when the current status is later.
-- Preserve the last real operational revision while adding workflow metadata.
alter table public.leads
  disable trigger leads_set_updated_at;

with sole_active_manager as (
  select
    case
      when count(*) = 1 then (array_agg(id order by id))[1]
      else null
    end as manager_id
  from public.lead_managers
  where is_active
)
update public.leads as leads
set
  assigned_manager_id = coalesce(
    leads.assigned_manager_id,
    (select manager_id from sole_active_manager)
  ),
  first_response_due_at = leads.created_at + interval '30 minutes',
  first_contacted_at = null;

alter table public.leads
  enable trigger leads_set_updated_at;

alter table public.leads
  alter column first_response_due_at set not null,

  add constraint leads_first_response_due_at_check
    check (first_response_due_at >= created_at),
  add constraint leads_first_contacted_at_check
    check (
      first_contacted_at is null
      or first_contacted_at >= created_at
    ),
  add constraint leads_next_action_at_check
    check (
      next_action_at is null
      or next_action_at >= created_at
    );

comment on column public.leads.assigned_manager_id is
  'Operational owner of the lead; this does not grant database access';
comment on column public.leads.first_response_due_at is
  'Immutable SLA snapshot, normally thirty minutes after lead receipt';
comment on column public.leads.first_contacted_at is
  'Timestamp of the first recorded transition into contacted status';
comment on column public.leads.next_action_at is
  'Optional follow-up deadline maintained by the responsible manager';

create index leads_manager_status_created_at_idx
  on public.leads (assigned_manager_id, status, created_at desc);

create index leads_first_response_due_idx
  on public.leads (first_response_due_at, created_at)
  where status = 'new';

create index leads_next_action_due_idx
  on public.leads (next_action_at, created_at)
  where status <> 'closed' and next_action_at is not null;

-- The original migration granted one directly writable column. Workflow
-- changes now go through the audited optimistic-concurrency RPC below.
revoke update (status)
  on table public.leads
  from authenticated;

drop policy if exists leads_admin_update_status
  on public.leads;

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null
    references public.leads(id) on delete restrict,
  activity_type text not null,
  actor_user_id uuid,
  actor_label text not null,
  from_status text,
  to_status text,
  from_manager_id uuid,
  to_manager_id uuid,
  from_manager_name text,
  to_manager_name text,
  from_next_action_at timestamptz,
  to_next_action_at timestamptz,
  note_body text,
  created_at timestamptz not null default now(),

  constraint lead_activities_type_check
    check (
      activity_type in (
        'created',
        'status_changed',
        'manager_assigned',
        'manager_unassigned',
        'next_action_changed',
        'note_added'
      )
    ),
  constraint lead_activities_actor_label_check
    check (char_length(btrim(actor_label)) between 1 and 320),
  constraint lead_activities_from_status_check
    check (
      from_status is null
      or from_status in ('new', 'contacted', 'booked', 'closed')
    ),
  constraint lead_activities_to_status_check
    check (
      to_status is null
      or to_status in ('new', 'contacted', 'booked', 'closed')
    ),
  constraint lead_activities_manager_name_check
    check (
      (from_manager_name is null or char_length(btrim(from_manager_name)) between 2 and 120)
      and (to_manager_name is null or char_length(btrim(to_manager_name)) between 2 and 120)
    ),
  constraint lead_activities_note_shape_check
    check (
      (activity_type = 'note_added')
      = (note_body is not null)
    ),
  constraint lead_activities_note_length_check
    check (
      note_body is null
      or char_length(btrim(note_body)) between 1 and 2000
    )
);

comment on table public.lead_activities is
  'Append-only lead timeline containing workflow changes and internal notes';
comment on column public.lead_activities.actor_label is
  'Server-created display snapshot of the authenticated actor';
comment on column public.lead_activities.note_body is
  'Internal admin-only note; customer-submitted text remains on leads.note';

create index lead_activities_lead_created_at_idx
  on public.lead_activities (lead_id, created_at desc, id desc);

alter table public.lead_activities enable row level security;

revoke all privileges
  on table public.lead_activities
  from public, anon, authenticated, service_role;

grant select
  on table public.lead_activities
  to authenticated;

create policy lead_activities_admin_read_all
on public.lead_activities
for select
to authenticated
using ((select app_private.is_vehicle_admin()));

create or replace function app_private.prevent_lead_activity_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'lead activities are append-only'
    using errcode = '55000';
end;
$function$;

alter function app_private.prevent_lead_activity_mutation()
  owner to postgres;

revoke all privileges
  on function app_private.prevent_lead_activity_mutation()
  from public, anon, authenticated, service_role;

create trigger lead_activities_prevent_mutation
before update or delete on public.lead_activities
for each row
execute function app_private.prevent_lead_activity_mutation();

create or replace function app_private.is_valid_lead_status_transition(
  p_from_status text,
  p_to_status text
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select
    p_from_status = p_to_status
    or (p_from_status = 'new' and p_to_status in ('contacted', 'closed'))
    or (p_from_status = 'contacted' and p_to_status in ('booked', 'closed'))
    or (p_from_status = 'booked' and p_to_status in ('contacted', 'closed'))
    or (p_from_status = 'closed' and p_to_status = 'contacted');
$function$;

alter function app_private.is_valid_lead_status_transition(text, text)
  owner to postgres;

revoke all privileges
  on function app_private.is_valid_lead_status_transition(text, text)
  from public, anon, authenticated, service_role;

create or replace function app_private.prepare_new_lead_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_manager_id uuid;
begin
  -- Ignore every caller-supplied deadline. The database owns the SLA snapshot
  -- and always derives it from the authoritative receipt timestamp.
  new.first_response_due_at := new.created_at + interval '30 minutes';

  if new.assigned_manager_id is null then
    select case
      when count(*) = 1 then (array_agg(id order by id))[1]
      else null
    end
    into v_manager_id
    from public.lead_managers
    where is_active;

    new.assigned_manager_id := v_manager_id;
  elsif not exists (
    select 1
    from public.lead_managers as managers
    where managers.id = new.assigned_manager_id
      and managers.is_active
  ) then
    raise exception 'lead manager is missing or inactive'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

alter function app_private.prepare_new_lead_workflow()
  owner to postgres;

revoke all privileges
  on function app_private.prepare_new_lead_workflow()
  from public, anon, authenticated, service_role;

create trigger leads_prepare_workflow_on_insert
before insert on public.leads
for each row
execute function app_private.prepare_new_lead_workflow();

create or replace function app_private.validate_lead_workflow_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.first_response_due_at is distinct from new.first_response_due_at then
    raise exception 'first response deadline is immutable'
      using errcode = '23514';
  end if;

  -- first_contacted_at is server-owned. Preserve the original value unless
  -- this is the first recorded transition into the contacted stage.
  new.first_contacted_at := old.first_contacted_at;

  if old.status is distinct from new.status then
    if not app_private.is_valid_lead_status_transition(old.status, new.status) then
      raise exception 'invalid lead status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;

    if new.status = 'contacted'
      and new.first_contacted_at is null
    then
      new.first_contacted_at := clock_timestamp();
    end if;

    if new.status = 'closed' then
      new.next_action_at := null;
    end if;
  end if;

  if old.assigned_manager_id is distinct from new.assigned_manager_id
    and new.assigned_manager_id is not null
    and not exists (
      select 1
      from public.lead_managers as managers
      where managers.id = new.assigned_manager_id
        and managers.is_active
    )
  then
    raise exception 'lead manager is missing or inactive'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

alter function app_private.validate_lead_workflow_update()
  owner to postgres;

revoke all privileges
  on function app_private.validate_lead_workflow_update()
  from public, anon, authenticated, service_role;

create trigger leads_validate_workflow_update
before update on public.leads
for each row
execute function app_private.validate_lead_workflow_update();

create or replace function app_private.record_lead_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_user_id uuid := null;
  v_actor_label text := 'Համակարգ';
  v_from_manager_name text := null;
  v_to_manager_name text := null;
begin
  if (select auth.role()) = 'authenticated' then
    v_actor_user_id := (select auth.uid());
    v_actor_label := left(
      coalesce(
        nullif(btrim((select auth.jwt()) ->> 'email'), ''),
        'Admin'
      ),
      320
    );
  end if;

  if tg_op = 'INSERT' then
    if new.assigned_manager_id is not null then
      select managers.display_name
      into v_to_manager_name
      from public.lead_managers as managers
      where managers.id = new.assigned_manager_id;
    end if;

    insert into public.lead_activities (
      lead_id,
      activity_type,
      actor_user_id,
      actor_label,
      to_status,
      created_at
    )
    values (
      new.id,
      'created',
      v_actor_user_id,
      v_actor_label,
      new.status,
      new.created_at
    );

    if new.assigned_manager_id is not null then
      insert into public.lead_activities (
        lead_id,
        activity_type,
        actor_user_id,
        actor_label,
        to_manager_id,
        to_manager_name,
        created_at
      )
      values (
        new.id,
        'manager_assigned',
        v_actor_user_id,
        v_actor_label,
        new.assigned_manager_id,
        v_to_manager_name,
        new.created_at
      );
    end if;

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.lead_activities (
      lead_id,
      activity_type,
      actor_user_id,
      actor_label,
      from_status,
      to_status
    )
    values (
      new.id,
      'status_changed',
      v_actor_user_id,
      v_actor_label,
      old.status,
      new.status
    );
  end if;

  if old.assigned_manager_id is distinct from new.assigned_manager_id then
    if old.assigned_manager_id is not null then
      select managers.display_name
      into v_from_manager_name
      from public.lead_managers as managers
      where managers.id = old.assigned_manager_id;
    end if;

    if new.assigned_manager_id is not null then
      select managers.display_name
      into v_to_manager_name
      from public.lead_managers as managers
      where managers.id = new.assigned_manager_id;
    end if;

    insert into public.lead_activities (
      lead_id,
      activity_type,
      actor_user_id,
      actor_label,
      from_manager_id,
      to_manager_id,
      from_manager_name,
      to_manager_name
    )
    values (
      new.id,
      case
        when new.assigned_manager_id is null then 'manager_unassigned'
        else 'manager_assigned'
      end,
      v_actor_user_id,
      v_actor_label,
      old.assigned_manager_id,
      new.assigned_manager_id,
      v_from_manager_name,
      v_to_manager_name
    );
  end if;

  if old.next_action_at is distinct from new.next_action_at then
    insert into public.lead_activities (
      lead_id,
      activity_type,
      actor_user_id,
      actor_label,
      from_next_action_at,
      to_next_action_at
    )
    values (
      new.id,
      'next_action_changed',
      v_actor_user_id,
      v_actor_label,
      old.next_action_at,
      new.next_action_at
    );
  end if;

  return new;
end;
$function$;

alter function app_private.record_lead_activity()
  owner to postgres;

revoke all privileges
  on function app_private.record_lead_activity()
  from public, anon, authenticated, service_role;

create trigger leads_record_activity_after_insert
after insert on public.leads
for each row
execute function app_private.record_lead_activity();

create trigger leads_record_activity_after_update
after update on public.leads
for each row
execute function app_private.record_lead_activity();

-- Backfill a truthful baseline without inventing historical transition times.
insert into public.lead_activities (
  lead_id,
  activity_type,
  actor_label,
  to_status,
  created_at
)
select
  leads.id,
  'created',
  'Համակարգ · ներմուծված',
  leads.status,
  leads.created_at
from public.leads as leads;

insert into public.lead_activities (
  lead_id,
  activity_type,
  actor_label,
  to_manager_id,
  to_manager_name,
  created_at
)
select
  leads.id,
  'manager_assigned',
  'Համակարգ · ներմուծված',
  managers.id,
  managers.display_name,
  clock_timestamp()
from public.leads as leads
join public.lead_managers as managers
  on managers.id = leads.assigned_manager_id;

create or replace function public.update_lead_workflow(
  p_lead_id uuid,
  p_expected_updated_at timestamptz,
  p_new_status text,
  p_new_manager_id uuid,
  p_new_next_action_at timestamptz
)
returns public.leads
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_current public.leads%rowtype;
  v_saved public.leads%rowtype;
  v_next_action_at timestamptz := p_new_next_action_at;
begin
  if (select auth.role()) <> 'authenticated'
    or not (select app_private.is_vehicle_admin())
  then
    raise exception 'admin access required'
      using errcode = '42501';
  end if;

  if p_lead_id is null
    or p_expected_updated_at is null
    or p_new_status is null
    or p_new_status not in ('new', 'contacted', 'booked', 'closed')
  then
    raise exception 'invalid lead workflow arguments'
      using errcode = '22023';
  end if;

  select leads.*
  into v_current
  from public.leads as leads
  where leads.id = p_lead_id
  for update;

  if not found then
    raise exception 'lead not found'
      using errcode = 'P0002';
  end if;

  if v_current.updated_at is distinct from p_expected_updated_at then
    raise exception 'lead revision conflict'
      using errcode = '40001';
  end if;

  if not app_private.is_valid_lead_status_transition(
    v_current.status,
    p_new_status
  ) then
    raise exception 'invalid lead status transition: % -> %',
      v_current.status,
      p_new_status
      using errcode = '23514';
  end if;

  if v_current.assigned_manager_id is distinct from p_new_manager_id
    and p_new_manager_id is not null
    and not exists (
      select 1
      from public.lead_managers as managers
      where managers.id = p_new_manager_id
        and managers.is_active
    )
  then
    raise exception 'lead manager is missing or inactive'
      using errcode = '23514';
  end if;

  if p_new_status = 'closed' then
    v_next_action_at := null;
  end if;

  if v_current.status = p_new_status
    and v_current.assigned_manager_id is not distinct from p_new_manager_id
    and v_current.next_action_at is not distinct from v_next_action_at
  then
    return v_current;
  end if;

  update public.leads as leads
  set
    status = p_new_status,
    assigned_manager_id = p_new_manager_id,
    next_action_at = v_next_action_at
  where leads.id = p_lead_id
    and leads.updated_at = p_expected_updated_at
  returning leads.* into v_saved;

  if not found then
    raise exception 'lead revision conflict'
      using errcode = '40001';
  end if;

  return v_saved;
end;
$function$;

alter function public.update_lead_workflow(
  uuid,
  timestamptz,
  text,
  uuid,
  timestamptz
)
owner to postgres;

revoke all privileges
  on function public.update_lead_workflow(
    uuid,
    timestamptz,
    text,
    uuid,
    timestamptz
  )
  from public, anon, authenticated, service_role;

grant execute
  on function public.update_lead_workflow(
    uuid,
    timestamptz,
    text,
    uuid,
    timestamptz
  )
  to authenticated;

create or replace function public.add_lead_note(
  p_lead_id uuid,
  p_body text
)
returns public.lead_activities
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_actor_user_id uuid;
  v_actor_label text;
  v_body text := btrim(coalesce(p_body, ''));
  v_activity public.lead_activities%rowtype;
begin
  if (select auth.role()) <> 'authenticated'
    or not (select app_private.is_vehicle_admin())
  then
    raise exception 'admin access required'
      using errcode = '42501';
  end if;

  if p_lead_id is null or char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid lead note'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.leads as leads
    where leads.id = p_lead_id
  ) then
    raise exception 'lead not found'
      using errcode = 'P0002';
  end if;

  v_actor_user_id := (select auth.uid());
  v_actor_label := left(
    coalesce(
      nullif(btrim((select auth.jwt()) ->> 'email'), ''),
      'Admin'
    ),
    320
  );

  insert into public.lead_activities (
    lead_id,
    activity_type,
    actor_user_id,
    actor_label,
    note_body
  )
  values (
    p_lead_id,
    'note_added',
    v_actor_user_id,
    v_actor_label,
    v_body
  )
  returning * into v_activity;

  return v_activity;
end;
$function$;

alter function public.add_lead_note(uuid, text)
  owner to postgres;

revoke all privileges
  on function public.add_lead_note(uuid, text)
  from public, anon, authenticated, service_role;

grant execute
  on function public.add_lead_note(uuid, text)
  to authenticated;

-- Notification configuration contains no provider secrets or recipient IDs.
-- Those remain Edge Function secrets; this table controls durable channel
-- enablement and delivery policy only.
create table app_private.lead_notification_channels (
  channel_key text primary key,
  channel_type text not null unique,
  display_name text not null,
  is_enabled boolean not null default true,
  max_attempts integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lead_notification_channels_key_check
    check (channel_key ~ '^[a-z][a-z0-9_-]{1,63}$'),
  constraint lead_notification_channels_type_check
    check (channel_type in ('telegram')),
  constraint lead_notification_channels_name_check
    check (char_length(btrim(display_name)) between 2 and 120),
  constraint lead_notification_channels_attempts_check
    check (max_attempts between 1 and 20)
);

comment on table app_private.lead_notification_channels is
  'Private notification channel enablement; provider credentials live in Edge secrets';

create trigger lead_notification_channels_set_updated_at
before update on app_private.lead_notification_channels
for each row
execute function public.set_updated_at();

insert into app_private.lead_notification_channels (
  channel_key,
  channel_type,
  display_name,
  is_enabled,
  max_attempts
)
values ('telegram', 'telegram', 'Telegram', true, 8);

create table app_private.lead_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null
    references public.leads(id) on delete restrict,
  channel_key text not null
    references app_private.lead_notification_channels(channel_key) on delete restrict,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_message_id text,
  last_error_code text,
  last_safe_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lead_notification_outbox_lead_channel_unique
    unique (lead_id, channel_key),
  constraint lead_notification_outbox_status_check
    check (status in ('pending', 'processing', 'retry', 'sent', 'dead')),
  constraint lead_notification_outbox_attempt_count_check
    check (attempt_count between 0 and 100),
  constraint lead_notification_outbox_lease_shape_check
    check (
      (
        status = 'processing'
        and lease_token is not null
        and lease_expires_at is not null
      )
      or (
        status <> 'processing'
        and lease_token is null
        and lease_expires_at is null
      )
    ),
  constraint lead_notification_outbox_sent_shape_check
    check (
      status <> 'sent'
      or (sent_at is not null and provider_message_id is not null)
    ),
  constraint lead_notification_outbox_provider_id_check
    check (
      provider_message_id is null
      or char_length(btrim(provider_message_id)) between 1 and 200
    ),
  constraint lead_notification_outbox_error_code_check
    check (
      last_error_code is null
      or (
        char_length(last_error_code) between 1 and 80
        and last_error_code ~ '^[a-z0-9][a-z0-9_.-]*$'
      )
    ),
  constraint lead_notification_outbox_safe_error_check
    check (
      last_safe_error is null
      or char_length(last_safe_error) between 1 and 500
    )
);

comment on table app_private.lead_notification_outbox is
  'Durable, leased notification jobs created transactionally with new leads';
comment on column app_private.lead_notification_outbox.last_safe_error is
  'Bounded sanitized diagnostic; raw provider responses and secrets are forbidden';

create index lead_notification_outbox_due_idx
  on app_private.lead_notification_outbox (status, available_at, created_at, id)
  where status in ('pending', 'retry');

create index lead_notification_outbox_expired_lease_idx
  on app_private.lead_notification_outbox (lease_expires_at, created_at, id)
  where status = 'processing';

create trigger lead_notification_outbox_set_updated_at
before update on app_private.lead_notification_outbox
for each row
execute function public.set_updated_at();

revoke all privileges
  on table app_private.lead_notification_channels,
    app_private.lead_notification_outbox
  from public, anon, authenticated, service_role;

create or replace function app_private.enqueue_lead_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into app_private.lead_notification_outbox (
    lead_id,
    channel_key
  )
  select
    new.id,
    channels.channel_key
  from app_private.lead_notification_channels as channels
  where channels.channel_type = 'telegram'
    and channels.is_enabled
  on conflict (lead_id, channel_key) do nothing;

  return new;
end;
$function$;

alter function app_private.enqueue_lead_notifications()
  owner to postgres;

revoke all privileges
  on function app_private.enqueue_lead_notifications()
  from public, anon, authenticated, service_role;

create trigger leads_enqueue_notifications_after_insert
after insert on public.leads
for each row
execute function app_private.enqueue_lead_notifications();

create or replace function public.claim_lead_notification_jobs(
  p_limit integer default 10,
  p_lease_seconds integer default 60
)
returns table (
  job_id uuid,
  lease_token uuid,
  attempt_count integer,
  lead_id uuid,
  name text,
  phone text,
  contact_method text,
  request_kind text,
  vehicle_label text,
  lot_id text,
  vin text,
  preferred_date date,
  preferred_time text,
  source text,
  lead_created_at timestamptz,
  channel text,
  assigned_manager_name text
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service role required'
      using errcode = '42501';
  end if;

  if p_limit not between 1 and 100
    or p_lease_seconds not between 10 and 900
  then
    raise exception 'invalid notification claim arguments'
      using errcode = '22023';
  end if;

  -- A worker that repeatedly disappears must not leave a job retrying forever.
  update app_private.lead_notification_outbox as jobs
  set
    status = 'dead',
    lease_token = null,
    lease_expires_at = null,
    last_error_code = 'attempts_exhausted',
    last_safe_error = 'Notification delivery attempts were exhausted.'
  from app_private.lead_notification_channels as channels
  where channels.channel_key = jobs.channel_key
    and jobs.attempt_count >= channels.max_attempts
    and (
      jobs.status in ('pending', 'retry')
      or (
        jobs.status = 'processing'
        and jobs.lease_expires_at <= v_now
      )
    );

  return query
  with candidates as (
    select jobs.id
    from app_private.lead_notification_outbox as jobs
    join app_private.lead_notification_channels as channels
      on channels.channel_key = jobs.channel_key
    where channels.channel_type = 'telegram'
      and channels.is_enabled
      and jobs.attempt_count < channels.max_attempts
      and (
        (
          jobs.status in ('pending', 'retry')
          and jobs.available_at <= v_now
        )
        or (
          jobs.status = 'processing'
          and jobs.lease_expires_at <= v_now
        )
      )
    order by jobs.available_at, jobs.created_at, jobs.id
    limit p_limit
    for update of jobs skip locked
  ),
  claimed as (
    update app_private.lead_notification_outbox as jobs
    set
      status = 'processing',
      attempt_count = jobs.attempt_count + 1,
      lease_token = gen_random_uuid(),
      lease_expires_at = v_now + make_interval(secs => p_lease_seconds)
    from candidates
    where jobs.id = candidates.id
    returning
      jobs.id,
      jobs.lease_token,
      jobs.lead_id,
      jobs.attempt_count,
      jobs.channel_key,
      jobs.created_at as job_created_at
  )
  select
    claimed.id,
    claimed.lease_token,
    claimed.attempt_count,
    claimed.lead_id,
    leads.name,
    leads.phone,
    leads.contact_method,
    leads.request_kind,
    leads.vehicle_label,
    leads.lot_id,
    leads.vin,
    leads.preferred_date,
    leads.preferred_time,
    leads.source,
    leads.created_at,
    claimed.channel_key,
    managers.display_name
  from claimed
  join public.leads as leads
    on leads.id = claimed.lead_id
  left join public.lead_managers as managers
    on managers.id = leads.assigned_manager_id
  order by claimed.job_created_at, claimed.id;
end;
$function$;

alter function public.claim_lead_notification_jobs(integer, integer)
  owner to postgres;

revoke all privileges
  on function public.claim_lead_notification_jobs(integer, integer)
  from public, anon, authenticated, service_role;

grant execute
  on function public.claim_lead_notification_jobs(integer, integer)
  to service_role;

create or replace function public.complete_lead_notification_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_completed_id uuid;
  v_provider_message_id text := btrim(coalesce(p_provider_message_id, ''));
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service role required'
      using errcode = '42501';
  end if;

  if p_job_id is null
    or p_lease_token is null
    or char_length(v_provider_message_id) not between 1 and 200
  then
    raise exception 'invalid notification completion arguments'
      using errcode = '22023';
  end if;

  update app_private.lead_notification_outbox as jobs
  set
    status = 'sent',
    lease_token = null,
    lease_expires_at = null,
    provider_message_id = v_provider_message_id,
    last_error_code = null,
    last_safe_error = null,
    sent_at = clock_timestamp()
  where jobs.id = p_job_id
    and jobs.status = 'processing'
    and jobs.lease_token = p_lease_token
  returning jobs.id into v_completed_id;

  if v_completed_id is null then
    raise exception 'notification lease conflict'
      using errcode = '40001';
  end if;

  return true;
end;
$function$;

alter function public.complete_lead_notification_job(uuid, uuid, text)
  owner to postgres;

revoke all privileges
  on function public.complete_lead_notification_job(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute
  on function public.complete_lead_notification_job(uuid, uuid, text)
  to service_role;

create or replace function public.fail_lead_notification_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_retryable boolean,
  p_retry_after_seconds integer,
  p_error_code text,
  p_safe_error text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_attempt_count integer;
  v_max_attempts integer;
  v_next_status text;
  v_retry_after_seconds integer;
  v_error_code text := lower(btrim(coalesce(p_error_code, '')));
  v_safe_error text := btrim(coalesce(p_safe_error, ''));
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service role required'
      using errcode = '42501';
  end if;

  if p_job_id is null
    or p_lease_token is null
    or p_retryable is null
    or char_length(v_error_code) not between 1 and 80
    or v_error_code !~ '^[a-z0-9][a-z0-9_.-]*$'
    or char_length(v_safe_error) not between 1 and 500
    or (
      p_retry_after_seconds is not null
      and p_retry_after_seconds not between 1 and 86400
    )
  then
    raise exception 'invalid notification failure arguments'
      using errcode = '22023';
  end if;

  select
    jobs.attempt_count,
    channels.max_attempts
  into
    v_attempt_count,
    v_max_attempts
  from app_private.lead_notification_outbox as jobs
  join app_private.lead_notification_channels as channels
    on channels.channel_key = jobs.channel_key
  where jobs.id = p_job_id
    and jobs.status = 'processing'
    and jobs.lease_token = p_lease_token
  for update of jobs;

  if not found then
    raise exception 'notification lease conflict'
      using errcode = '40001';
  end if;

  v_next_status := case
    when p_retryable and v_attempt_count < v_max_attempts then 'retry'
    else 'dead'
  end;

  -- Provider Retry-After wins when present. Otherwise use a bounded
  -- operational backoff of 1, 2, 5, 15, 30, then 60 minutes.
  v_retry_after_seconds := coalesce(
    p_retry_after_seconds,
    case v_attempt_count
      when 1 then 60
      when 2 then 120
      when 3 then 300
      when 4 then 900
      when 5 then 1800
      else 3600
    end
  );

  update app_private.lead_notification_outbox as jobs
  set
    status = v_next_status,
    available_at = case
      when v_next_status = 'retry'
        then clock_timestamp() + make_interval(
          secs => v_retry_after_seconds
        )
      else jobs.available_at
    end,
    lease_token = null,
    lease_expires_at = null,
    last_error_code = v_error_code,
    last_safe_error = v_safe_error
  where jobs.id = p_job_id;

  return v_next_status;
end;
$function$;

alter function public.fail_lead_notification_job(
  uuid,
  uuid,
  boolean,
  integer,
  text,
  text
)
owner to postgres;

revoke all privileges
  on function public.fail_lead_notification_job(
    uuid,
    uuid,
    boolean,
    integer,
    text,
    text
  )
  from public, anon, authenticated, service_role;

grant execute
  on function public.fail_lead_notification_job(
    uuid,
    uuid,
    boolean,
    integer,
    text,
    text
  )
  to service_role;

-- Keep an already-open admin workspace current when another session adds a
-- note or when operational manager metadata is updated.
do $block$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'lead_managers'
    ) then
      alter publication supabase_realtime
        add table public.lead_managers;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'lead_activities'
    ) then
      alter publication supabase_realtime
        add table public.lead_activities;
    end if;
  end if;
end;
$block$;

commit;
