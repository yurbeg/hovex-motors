begin;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  submission_hash text not null,
  name text not null,
  phone text not null,
  contact_method text not null,
  vehicle_id text,
  vehicle_label text not null default 'Անհատական ընտրություն',
  preferred_date date,
  preferred_time text not null default '10:00–13:00',
  note text not null default '',
  source text not null default 'website',
  status text not null default 'new',
  consent_version text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_name_check
    check (char_length(btrim(name)) between 2 and 100),
  constraint leads_phone_check
    check (
      char_length(btrim(phone)) between 8 and 32
      and btrim(phone) ~ '^\+?[0-9][0-9 ()-]{6,31}$'
    ),
  constraint leads_contact_method_check
    check (contact_method in ('phone', 'whatsapp', 'video_call', 'showroom_visit')),
  constraint leads_submission_hash_check
    check (submission_hash ~ '^[a-f0-9]{64}$'),
  constraint leads_vehicle_id_check
    check (
      vehicle_id is null
      or char_length(btrim(vehicle_id)) between 1 and 160
    ),
  constraint leads_vehicle_label_check
    check (char_length(btrim(vehicle_label)) between 1 and 220),
  constraint leads_preferred_time_check
    check (
      preferred_time in ('10:00–13:00', '13:00–16:00', '16:00–19:00')
    ),
  constraint leads_note_check
    check (char_length(note) <= 2000),
  constraint leads_source_check
    check (source in ('website', 'ai-assistant', 'auction-catalog')),
  constraint leads_status_check
    check (status in ('new', 'contacted', 'booked', 'closed')),
  constraint leads_consent_version_check
    check (char_length(btrim(consent_version)) between 1 and 80)
);

comment on table public.leads is
  'Customer consultation requests submitted through trusted server code';
comment on column public.leads.client_request_id is
  'Browser-generated idempotency key; safe retries return the original request';
comment on column public.leads.submission_hash is
  'Server-computed hash used to reject changed payloads under the same idempotency key';
comment on column public.leads.consent_version is
  'Version of the contact-consent copy accepted by the customer';

create index leads_status_created_at_idx
  on public.leads (status, created_at desc);

create index leads_created_at_idx
  on public.leads (created_at desc);

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;

revoke all privileges
  on table public.leads
  from public, anon, authenticated, service_role;

grant select
  on table public.leads
  to authenticated;

grant update (status)
  on table public.leads
  to authenticated;

grant select, insert
  on table public.leads
  to service_role;

create policy leads_admin_read_all
on public.leads
for select
to authenticated
using ((select app_private.is_vehicle_admin()));

create policy leads_admin_update_status
on public.leads
for update
to authenticated
using ((select app_private.is_vehicle_admin()))
with check ((select app_private.is_vehicle_admin()));

-- Store only a keyed hash of network metadata used for abuse protection. Raw
-- IP addresses and user-agent strings are never persisted.
create table app_private.lead_submission_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null,
  request_count integer not null,

  constraint lead_submission_limits_fingerprint_check
    check (fingerprint ~ '^[a-f0-9]{64}$'),
  constraint lead_submission_limits_request_count_check
    check (request_count between 1 and 1000000)
);

create index lead_submission_limits_window_idx
  on app_private.lead_submission_limits (window_started_at);

revoke all privileges
  on table app_private.lead_submission_limits
  from public, anon, authenticated, service_role;

create or replace function public.consume_lead_submission_limit(
  p_fingerprint text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer := null;
begin
  if p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_limit not between 1 and 100
    or p_window_seconds not between 60 and 86400
  then
    return false;
  end if;

  insert into app_private.lead_submission_limits as limits (
    fingerprint,
    window_started_at,
    request_count
  )
  values (p_fingerprint, v_now, 1)
  on conflict (fingerprint) do update
  set
    window_started_at = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else least(limits.request_count + 1, p_limit + 1)
    end
  -- Once a fingerprint is over the limit, keep returning false without
  -- creating another row version for every rejected request. Expired windows
  -- are still reset atomically.
  where
    limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
    or limits.request_count <= p_limit
  returning request_count into v_count;

  -- Amortize housekeeping rather than running the same delete on every
  -- submission. The indexed timestamp keeps this bounded when it does run.
  if random() < 0.01 then
    delete from app_private.lead_submission_limits
    where window_started_at < v_now - interval '2 days';
  end if;

  return coalesce(v_count <= p_limit, false);
end;
$function$;

alter function public.consume_lead_submission_limit(text, integer, integer)
  owner to postgres;

revoke all privileges
  on function public.consume_lead_submission_limit(text, integer, integer)
  from public, anon, authenticated, service_role;

grant execute
  on function public.consume_lead_submission_limit(text, integer, integer)
  to service_role;

-- New requests should appear in an already-open admin workspace without a
-- manual refresh. The guard keeps this migration portable to local projects
-- where the publication may not exist yet.
do $block$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end;
$block$;

commit;
