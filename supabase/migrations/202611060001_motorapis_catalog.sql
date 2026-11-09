begin;

-- MotorAPIs data is intentionally stored separately from the curated Hovex
-- `vehicles` table. A provider vehicle can have several source-specific lots,
-- and provider IDs (not VINs) are the durable import identities.
create table public.motorapi_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_domain_id integer not null,
  mode text not null,
  status text not null default 'running',
  checkpoint_from timestamptz,
  checkpoint_to timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  lease_expires_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text,

  constraint motorapi_sync_runs_source_check
    check (source_domain_id > 0),
  constraint motorapi_sync_runs_mode_check
    check (mode in ('trial', 'full', 'incremental')),
  constraint motorapi_sync_runs_status_check
    check (status in ('running', 'succeeded', 'failed')),
  constraint motorapi_sync_runs_stats_check
    check (jsonb_typeof(stats) = 'object'),
  constraint motorapi_sync_runs_error_check
    check (error is null or char_length(error) <= 4000)
);

comment on table public.motorapi_sync_runs is
  'Server-only MotorAPIs synchronization run history';
comment on column public.motorapi_sync_runs.checkpoint_from is
  'Previous successful checkpoint returned when this run claimed the lease';
comment on column public.motorapi_sync_runs.checkpoint_to is
  'Candidate checkpoint recorded by a completed run';

create table public.motorapi_vehicles (
  provider_vehicle_id bigint primary key,
  vin text,
  title text,
  year smallint,
  manufacturer_id bigint,
  make text,
  model_id bigint,
  model text,
  generation_id bigint,
  generation text,
  vehicle_type text,
  body_type text,
  engine_name text,
  cylinders integer,
  fuel_type text,
  transmission text,
  drive_wheel text,
  color text,
  condition text,
  document_title text,
  characteristics jsonb not null default '{}'::jsonb,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint motorapi_vehicles_provider_id_check
    check (provider_vehicle_id > 0),
  constraint motorapi_vehicles_year_check
    check (year is null or year between 1886 and 2100),
  constraint motorapi_vehicles_cylinders_check
    check (cylinders is null or cylinders between 1 and 32),
  constraint motorapi_vehicles_characteristics_check
    check (jsonb_typeof(characteristics) = 'object')
);

comment on table public.motorapi_vehicles is
  'MotorAPIs vehicle identities and source-independent documented specifications';
comment on column public.motorapi_vehicles.provider_vehicle_id is
  'MotorAPIs vehicle id; the durable primary key for imports';
comment on column public.motorapi_vehicles.vin is
  'Optional, non-unique VIN; never used as the import identity';
comment on column public.motorapi_vehicles.characteristics is
  'Additional documented vehicle characteristics not promoted to typed columns';

create table public.motorapi_lots (
  source_domain_id integer not null,
  provider_lot_id bigint not null,
  provider_vehicle_id bigint not null
    references public.motorapi_vehicles(provider_vehicle_id) on delete restrict,
  lot_number text,
  source_slug text not null,
  provider_status_id bigint,
  provider_status text,
  odometer_mi numeric(14, 2),
  odometer_km numeric(14, 2),
  odometer_status text,
  primary_damage text,
  secondary_damage text,
  location_name text,
  location_city text,
  location_state_code text,
  location_country text,
  sale_at timestamptz,
  sale_updated_at timestamptz,
  current_bid numeric(18, 2),
  current_bid_updated_at timestamptz,
  buy_now_price numeric(18, 2),
  buy_now_updated_at timestamptz,
  final_bid numeric(18, 2),
  final_bid_updated_at timestamptz,
  seller_reserve numeric(18, 2),
  seller_reserve_updated_at timestamptz,
  currency text,
  buyer_country text,
  photo_urls text[] not null default '{}'::text[],
  active boolean not null default true,
  archived_at timestamptz,
  archive_seen_at timestamptz,
  deactivated_at timestamptz,
  inactive_reason text,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  characteristics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (source_domain_id, provider_lot_id),

  constraint motorapi_lots_source_check
    check (source_domain_id > 0),
  constraint motorapi_lots_provider_lot_id_check
    check (provider_lot_id > 0),
  constraint motorapi_lots_source_slug_check
    check (char_length(btrim(source_slug)) between 1 and 120),
  constraint motorapi_lots_odometer_mi_check
    check (odometer_mi is null or odometer_mi >= 0),
  constraint motorapi_lots_odometer_km_check
    check (odometer_km is null or odometer_km >= 0),
  constraint motorapi_lots_current_bid_check
    check (current_bid is null or current_bid >= 0),
  constraint motorapi_lots_buy_now_check
    check (buy_now_price is null or buy_now_price >= 0),
  constraint motorapi_lots_final_bid_check
    check (final_bid is null or final_bid >= 0),
  constraint motorapi_lots_seller_reserve_check
    check (seller_reserve is null or seller_reserve >= 0),
  constraint motorapi_lots_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint motorapi_lots_photo_urls_check
    check (array_position(photo_urls, null) is null),
  constraint motorapi_lots_characteristics_check
    check (jsonb_typeof(characteristics) = 'object')
);

comment on table public.motorapi_lots is
  'Source-specific MotorAPIs auction lots; one provider vehicle may have many lots';
comment on column public.motorapi_lots.provider_lot_id is
  'MotorAPIs internal lot id, unique only together with source_domain_id';
comment on column public.motorapi_lots.current_bid is
  'Current auction bid when supplied; never a confirmed purchase price';
comment on column public.motorapi_lots.buy_now_price is
  'Provider Buy Now price when supplied';
comment on column public.motorapi_lots.final_bid is
  'Provider final bid when explicitly supplied; legacy bid values are not final bids';
comment on column public.motorapi_lots.seller_reserve is
  'Seller reserve when supplied; not a current bid or purchase price';
comment on column public.motorapi_lots.currency is
  'Explicit provider currency only; null means the source did not identify it';
comment on column public.motorapi_lots.characteristics is
  'Additional documented lot characteristics not promoted to typed columns';

create table public.motorapi_sync_state (
  source_domain_id integer primary key,
  last_successful_at timestamptz,
  last_successful_run_id uuid,
  last_attempted_at timestamptz,
  lease_run_id uuid,
  lease_acquired_at timestamptz,
  lease_expires_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),

  constraint motorapi_sync_state_source_check
    check (source_domain_id > 0),
  constraint motorapi_sync_state_lease_check
    check (
      (lease_run_id is null and lease_acquired_at is null and lease_expires_at is null)
      or
      (lease_run_id is not null and lease_acquired_at is not null and lease_expires_at is not null)
    ),
  constraint motorapi_sync_state_error_check
    check (last_error is null or char_length(last_error) <= 4000)
);

comment on table public.motorapi_sync_state is
  'Server-only synchronization checkpoint and renewable lease per MotorAPIs source';
comment on column public.motorapi_sync_state.last_successful_at is
  'Advanced only by complete_motorapis_sync after every required page succeeds';
comment on column public.motorapi_sync_state.lease_run_id is
  'Atomic single-run lease owner; expired leases may be claimed by another run';

create index motorapi_sync_runs_source_started_idx
  on public.motorapi_sync_runs (source_domain_id, started_at desc);

create index motorapi_vehicles_make_model_year_idx
  on public.motorapi_vehicles (lower(make), lower(model), year desc);

create index motorapi_vehicles_characteristics_idx
  on public.motorapi_vehicles using gin (characteristics);

create index motorapi_lots_vehicle_idx
  on public.motorapi_lots (provider_vehicle_id);

create index motorapi_lots_active_sale_idx
  on public.motorapi_lots (source_domain_id, sale_at, provider_lot_id)
  where active;

create index motorapi_lots_active_price_idx
  on public.motorapi_lots (source_domain_id, current_bid, buy_now_price)
  where active;

create index motorapi_lots_characteristics_idx
  on public.motorapi_lots using gin (characteristics);

create trigger motorapi_vehicles_set_updated_at
before update on public.motorapi_vehicles
for each row execute function public.set_updated_at();

create trigger motorapi_lots_set_updated_at
before update on public.motorapi_lots
for each row execute function public.set_updated_at();

create trigger motorapi_sync_state_set_updated_at
before update on public.motorapi_sync_state
for each row execute function public.set_updated_at();

alter table public.motorapi_sync_runs enable row level security;
alter table public.motorapi_vehicles enable row level security;
alter table public.motorapi_lots enable row level security;
alter table public.motorapi_sync_state enable row level security;

-- Keep direct PostgREST upserts portable across hosted and local Supabase
-- environments. Hosted service roles normally bypass RLS, but these explicit
-- policies ensure the server-only role remains the sole direct table client
-- even when that role does not carry the global BYPASSRLS attribute.
create policy "Service role manages MotorAPIs sync runs"
  on public.motorapi_sync_runs
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages MotorAPIs vehicles"
  on public.motorapi_vehicles
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages MotorAPIs lots"
  on public.motorapi_lots
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages MotorAPIs sync state"
  on public.motorapi_sync_state
  for all
  to service_role
  using (true)
  with check (true);

-- Base provider and synchronization tables are never browser-readable. The
-- service role writes them, while visitors receive only the safe view below.
revoke all privileges on table public.motorapi_sync_runs
  from public, anon, authenticated;
revoke all privileges on table public.motorapi_vehicles
  from public, anon, authenticated;
revoke all privileges on table public.motorapi_lots
  from public, anon, authenticated;
revoke all privileges on table public.motorapi_sync_state
  from public, anon, authenticated;

grant select, insert, update on table public.motorapi_sync_runs to service_role;
grant select, insert, update on table public.motorapi_vehicles to service_role;
grant select, insert, update on table public.motorapi_lots to service_role;
grant select, insert, update on table public.motorapi_sync_state to service_role;

-- The view deliberately contains only display-safe fields and only active
-- Copart (domain 3) lots. Internal leases, run IDs, and inactive rows stay in
-- server-only tables.
create view public.motorapi_catalog
with (security_barrier = true)
as
select
  'copart-' || lots.provider_lot_id::text as id,
  lots.provider_vehicle_id,
  lots.provider_lot_id,
  lots.source_domain_id,
  lots.source_slug,
  lots.lot_number,
  vehicles.vin,
  vehicles.title,
  vehicles.year,
  vehicles.manufacturer_id,
  vehicles.make,
  vehicles.model_id,
  vehicles.model,
  vehicles.generation_id,
  vehicles.generation,
  vehicles.vehicle_type,
  vehicles.body_type,
  vehicles.engine_name,
  vehicles.engine_name as engine,
  vehicles.cylinders,
  vehicles.fuel_type,
  vehicles.transmission,
  vehicles.drive_wheel,
  vehicles.color,
  vehicles.condition,
  vehicles.document_title,
  lots.provider_status_id,
  lots.provider_status,
  lots.odometer_mi,
  lots.odometer_km,
  case
    when lots.odometer_mi is not null then lots.odometer_mi
    else lots.odometer_km
  end as odometer_value,
  case
    when lots.odometer_mi is not null then 'mi'
    when lots.odometer_km is not null then 'km'
    else null
  end as odometer_unit,
  lots.odometer_status,
  lots.primary_damage,
  lots.secondary_damage,
  lots.location_name,
  lots.location_city,
  lots.location_state_code,
  lots.location_country,
  coalesce(
    nullif(btrim(lots.location_name), ''),
    nullif(concat_ws(
      ', ',
      nullif(btrim(lots.location_city), ''),
      nullif(btrim(lots.location_state_code), ''),
      nullif(btrim(lots.location_country), '')
    ), '')
  ) as location,
  lots.sale_at,
  lots.sale_at as sale_date,
  lots.sale_updated_at,
  lots.provider_status as status,
  lots.current_bid,
  lots.current_bid_updated_at,
  lots.buy_now_price,
  lots.buy_now_updated_at,
  lots.final_bid,
  lots.final_bid_updated_at,
  lots.seller_reserve,
  lots.seller_reserve_updated_at,
  greatest(
    lots.current_bid_updated_at,
    lots.buy_now_updated_at,
    lots.final_bid_updated_at,
    lots.seller_reserve_updated_at
  ) as price_updated_at,
  lots.currency,
  lots.buyer_country,
  lots.photo_urls,
  -- Provider payloads allow arbitrary additional properties, so the public
  -- view exposes only an explicit display-safe subset. The complete imported
  -- JSON remains service-role-only in the normalized base tables.
  jsonb_strip_nulls(jsonb_build_object(
    'keys_available', lots.characteristics -> 'keys_available',
    'airbags', coalesce(
      lots.characteristics #> '{airbags,name}',
      case
        when jsonb_typeof(lots.characteristics -> 'airbags') in ('string', 'number', 'boolean')
          then lots.characteristics -> 'airbags'
      end
    ),
    'condition', coalesce(
      lots.characteristics #> '{condition,name}',
      case
        when jsonb_typeof(lots.characteristics -> 'condition') in ('string', 'number', 'boolean')
          then lots.characteristics -> 'condition'
      end
    ),
    'title_type', lots.characteristics #> '{title,name}',
    'detailed_title', lots.characteristics #> '{detailed_title,name}',
    'tags', case
      when jsonb_typeof(lots.characteristics -> 'tags') = 'array'
        then lots.characteristics -> 'tags'
    end,
    'is_timed_auction', lots.characteristics -> 'is_timed_auction',
    'auction_type', lots.characteristics #> '{auction_type,name}'
  )) as characteristics,
  vehicles.provider_updated_at as vehicle_provider_updated_at,
  lots.provider_updated_at as lot_provider_updated_at,
  greatest(vehicles.provider_updated_at, lots.provider_updated_at) as provider_updated_at,
  greatest(vehicles.fetched_at, lots.fetched_at) as fetched_at,
  lower(concat_ws(
    ' ',
    vehicles.make,
    vehicles.model,
    vehicles.generation,
    vehicles.year::text,
    vehicles.vin,
    vehicles.body_type,
    vehicles.fuel_type,
    vehicles.transmission,
    vehicles.drive_wheel,
    vehicles.color,
    lots.lot_number,
    lots.primary_damage,
    lots.secondary_damage,
    lots.location_name,
    lots.location_city,
    lots.location_state_code,
    lots.location_country
  )) as search_text
from public.motorapi_lots as lots
join public.motorapi_vehicles as vehicles
  on vehicles.provider_vehicle_id = lots.provider_vehicle_id
where lots.source_domain_id = 3
  and lots.active;

comment on view public.motorapi_catalog is
  'Public display-safe active Copart catalog backed by locally synchronized data';

alter view public.motorapi_catalog owner to postgres;

revoke all privileges on table public.motorapi_catalog
  from public, anon, authenticated;
grant select on table public.motorapi_catalog to anon, authenticated, service_role;

create or replace function public.claim_motorapis_sync(
  p_source_domain_id integer default 3,
  p_run_id uuid default gen_random_uuid(),
  p_lease_seconds integer default 900,
  p_mode text default 'incremental'
)
returns table (
  claimed boolean,
  run_id uuid,
  last_successful_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_last_successful_at timestamptz;
  v_lease_expires_at timestamptz;
  v_current_run_id uuid;
  v_mode text := lower(btrim(p_mode));
begin
  if p_source_domain_id is null or p_source_domain_id <= 0 then
    raise exception 'source_domain_id must be a positive integer'
      using errcode = '22023';
  end if;
  if p_run_id is null then
    raise exception 'run_id is required' using errcode = '22023';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease_seconds must be between 30 and 3600'
      using errcode = '22023';
  end if;
  if v_mode not in ('trial', 'full', 'incremental') then
    raise exception 'mode must be trial, full, or incremental'
      using errcode = '22023';
  end if;

  insert into public.motorapi_sync_state (source_domain_id)
  values (p_source_domain_id)
  on conflict (source_domain_id) do nothing;

  update public.motorapi_sync_state as state
  set
    lease_run_id = p_run_id,
    lease_acquired_at = v_now,
    lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
    last_attempted_at = v_now,
    last_error = null
  where state.source_domain_id = p_source_domain_id
    and (
      state.lease_run_id is null
      or state.lease_expires_at <= v_now
    )
  returning state.last_successful_at, state.lease_expires_at
  into v_last_successful_at, v_lease_expires_at;

  if found then
    insert into public.motorapi_sync_runs (
      id,
      source_domain_id,
      mode,
      status,
      checkpoint_from,
      started_at,
      lease_expires_at
    ) values (
      p_run_id,
      p_source_domain_id,
      v_mode,
      'running',
      v_last_successful_at,
      v_now,
      v_lease_expires_at
    );

    return query
      select true, p_run_id, v_last_successful_at, v_lease_expires_at;
    return;
  end if;

  select
    state.lease_run_id,
    state.last_successful_at,
    state.lease_expires_at
  into
    v_current_run_id,
    v_last_successful_at,
    v_lease_expires_at
  from public.motorapi_sync_state as state
  where state.source_domain_id = p_source_domain_id;

  return query
    select false, v_current_run_id, v_last_successful_at, v_lease_expires_at;
end;
$function$;

comment on function public.claim_motorapis_sync(integer, uuid, integer, text) is
  'Atomically claims one source lease and returns its previous successful checkpoint';

create or replace function public.renew_motorapis_sync(
  p_source_domain_id integer,
  p_run_id uuid,
  p_lease_seconds integer default 900
)
returns table (
  renewed boolean,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_lease_expires_at timestamptz;
begin
  if p_source_domain_id is null or p_source_domain_id <= 0 or p_run_id is null then
    raise exception 'source_domain_id and run_id are required'
      using errcode = '22023';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease_seconds must be between 30 and 3600'
      using errcode = '22023';
  end if;

  update public.motorapi_sync_state as state
  set lease_expires_at = v_now + make_interval(secs => p_lease_seconds)
  where state.source_domain_id = p_source_domain_id
    and state.lease_run_id = p_run_id
    and state.lease_expires_at > v_now
  returning state.lease_expires_at into v_lease_expires_at;

  if not found then
    return query select false, null::timestamptz;
    return;
  end if;

  update public.motorapi_sync_runs as run
  set lease_expires_at = v_lease_expires_at
  where run.id = p_run_id
    and run.source_domain_id = p_source_domain_id
    and run.status = 'running';

  return query select true, v_lease_expires_at;
end;
$function$;

comment on function public.renew_motorapis_sync(integer, uuid, integer) is
  'Renews a non-expired synchronization lease owned by the supplied run';

create or replace function public.complete_motorapis_sync(
  p_source_domain_id integer,
  p_run_id uuid,
  p_checkpoint timestamptz,
  p_stats jsonb default '{}'::jsonb
)
returns table (
  completed boolean,
  last_successful_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_last_successful_at timestamptz;
  v_mode text;
begin
  if p_source_domain_id is null or p_source_domain_id <= 0
    or p_run_id is null then
    raise exception 'source_domain_id and run_id are required'
      using errcode = '22023';
  end if;
  if p_stats is null or jsonb_typeof(p_stats) <> 'object' then
    raise exception 'stats must be a JSON object' using errcode = '22023';
  end if;

  select run.mode
  into v_mode
  from public.motorapi_sync_runs as run
  where run.id = p_run_id
    and run.source_domain_id = p_source_domain_id
    and run.status = 'running';

  if not found then
    select state.last_successful_at
    into v_last_successful_at
    from public.motorapi_sync_state as state
    where state.source_domain_id = p_source_domain_id;
    return query select false, v_last_successful_at;
    return;
  end if;

  if v_mode <> 'trial' and p_checkpoint is null then
    raise exception 'checkpoint is required for a non-trial run'
      using errcode = '22023';
  end if;
  if p_checkpoint is not null and p_checkpoint > v_now + interval '5 minutes' then
    raise exception 'checkpoint cannot be in the future'
      using errcode = '22023';
  end if;

  update public.motorapi_sync_state as state
  set
    last_successful_at = case
      when v_mode = 'trial' then state.last_successful_at
      when state.last_successful_at is null then p_checkpoint
      else greatest(state.last_successful_at, p_checkpoint)
    end,
    last_successful_run_id = case
      when v_mode = 'trial' then state.last_successful_run_id
      else p_run_id
    end,
    lease_run_id = null,
    lease_acquired_at = null,
    lease_expires_at = null,
    last_error = null
  where state.source_domain_id = p_source_domain_id
    and state.lease_run_id = p_run_id
    and state.lease_expires_at > v_now
  returning state.last_successful_at into v_last_successful_at;

  if not found then
    select state.last_successful_at
    into v_last_successful_at
    from public.motorapi_sync_state as state
    where state.source_domain_id = p_source_domain_id;
    return query select false, v_last_successful_at;
    return;
  end if;

  update public.motorapi_sync_runs as run
  set
    status = 'succeeded',
    checkpoint_to = p_checkpoint,
    finished_at = v_now,
    lease_expires_at = null,
    stats = p_stats,
    error = null
  where run.id = p_run_id
    and run.source_domain_id = p_source_domain_id
    and run.status = 'running';

  return query select true, v_last_successful_at;
end;
$function$;

comment on function public.complete_motorapis_sync(integer, uuid, timestamptz, jsonb) is
  'Completes the lease after all pages; trial runs may pass null and never advance the checkpoint';

create or replace function public.fail_motorapis_sync(
  p_source_domain_id integer,
  p_run_id uuid,
  p_error text
)
returns table (
  failed boolean,
  last_successful_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_failed boolean := false;
  v_last_successful_at timestamptz;
  v_error text := left(
    coalesce(nullif(btrim(p_error), ''), 'MotorAPIs synchronization failed'),
    4000
  );
begin
  if p_source_domain_id is null or p_source_domain_id <= 0 or p_run_id is null then
    raise exception 'source_domain_id and run_id are required'
      using errcode = '22023';
  end if;

  update public.motorapi_sync_state as state
  set
    lease_run_id = null,
    lease_acquired_at = null,
    lease_expires_at = null,
    last_error = v_error
  where state.source_domain_id = p_source_domain_id
    and state.lease_run_id = p_run_id
  returning state.last_successful_at into v_last_successful_at;

  v_failed := found;

  if not v_failed then
    select state.last_successful_at
    into v_last_successful_at
    from public.motorapi_sync_state as state
    where state.source_domain_id = p_source_domain_id;
  end if;

  update public.motorapi_sync_runs as run
  set
    status = 'failed',
    finished_at = v_now,
    lease_expires_at = null,
    error = v_error
  where run.id = p_run_id
    and run.source_domain_id = p_source_domain_id
    and run.status = 'running';

  return query select v_failed, v_last_successful_at;
end;
$function$;

comment on function public.fail_motorapis_sync(integer, uuid, text) is
  'Releases a failed run lease while preserving the last successful checkpoint';

create or replace function public.apply_motorapis_archive_events(
  p_events jsonb,
  p_fetched_at timestamptz
)
returns table (
  processed integer,
  deactivated integer,
  unmatched integer
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'archive events must be a JSON array' using errcode = '22023';
  end if;
  if p_fetched_at is null then
    raise exception 'fetched_at is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_events) as item(event)
    where jsonb_typeof(item.event) <> 'object'
      or coalesce(
        item.event ->> 'source_domain_id',
        item.event #>> '{domain,id}',
        ''
      ) !~ '^[1-9][0-9]*$'
      or coalesce(
        item.event ->> 'provider_lot_id',
        item.event ->> 'lot_id',
        ''
      ) !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'each archive event requires positive source_domain_id and provider_lot_id'
      using errcode = '22023';
  end if;

  return query
  with raw_events as (
    select item.event, item.ordinality
    from jsonb_array_elements(p_events) with ordinality as item(event, ordinality)
  ),
  parsed_events as (
    select
      coalesce(
        event ->> 'source_domain_id',
        event #>> '{domain,id}'
      )::integer as source_domain_id,
      coalesce(
        event ->> 'provider_lot_id',
        event ->> 'lot_id'
      )::bigint as provider_lot_id,
      event,
      ordinality
    from raw_events
  ),
  normalized_events as (
    select distinct on (source_domain_id, provider_lot_id)
      source_domain_id,
      provider_lot_id,
      event
    from parsed_events
    order by source_domain_id, provider_lot_id, ordinality desc
  ),
  updated_lots as (
    update public.motorapi_lots as lot
    set
      active = false,
      provider_status_id = case
        when event.event ? 'provider_status_id'
          then nullif(event.event ->> 'provider_status_id', '')::bigint
        when event.event #>> '{status,id}' is not null
          then nullif(event.event #>> '{status,id}', '')::bigint
        else lot.provider_status_id
      end,
      provider_status = case
        when event.event ? 'provider_status'
          then nullif(event.event ->> 'provider_status', '')
        when event.event #>> '{status,name}' is not null
          then nullif(event.event #>> '{status,name}', '')
        else lot.provider_status
      end,
      current_bid = case
        when event.event ? 'current_bid' then
          case when jsonb_typeof(event.event -> 'current_bid') = 'object'
            then nullif(event.event #>> '{current_bid,value}', '')::numeric
            else nullif(event.event ->> 'current_bid', '')::numeric
          end
        when event.event ? 'bid' then
          case when jsonb_typeof(event.event -> 'bid') = 'object'
            then nullif(event.event #>> '{bid,value}', '')::numeric
            else nullif(event.event ->> 'bid', '')::numeric
          end
        else lot.current_bid
      end,
      current_bid_updated_at = case
        when event.event ? 'current_bid_updated_at'
          then nullif(event.event ->> 'current_bid_updated_at', '')::timestamptz
        when event.event #>> '{current_bid,updated_at}' is not null
          then nullif(event.event #>> '{current_bid,updated_at}', '')::timestamptz
        when event.event #>> '{bid,updated_at}' is not null
          then nullif(event.event #>> '{bid,updated_at}', '')::timestamptz
        when event.event ? 'final_bid_updated_at' and event.event ? 'bid'
          then nullif(event.event ->> 'final_bid_updated_at', '')::timestamptz
        else lot.current_bid_updated_at
      end,
      buy_now_price = case
        when event.event ? 'buy_now_price'
          then nullif(event.event ->> 'buy_now_price', '')::numeric
        when event.event ? 'buy_now' then
          case when jsonb_typeof(event.event -> 'buy_now') = 'object'
            then nullif(event.event #>> '{buy_now,value}', '')::numeric
            else nullif(event.event ->> 'buy_now', '')::numeric
          end
        else lot.buy_now_price
      end,
      buy_now_updated_at = case
        when event.event ? 'buy_now_updated_at'
          then nullif(event.event ->> 'buy_now_updated_at', '')::timestamptz
        when event.event #>> '{buy_now,updated_at}' is not null
          then nullif(event.event #>> '{buy_now,updated_at}', '')::timestamptz
        else lot.buy_now_updated_at
      end,
      final_bid = case
        when event.event ? 'final_bid' then
          case when jsonb_typeof(event.event -> 'final_bid') = 'object'
            then nullif(event.event #>> '{final_bid,value}', '')::numeric
            else nullif(event.event ->> 'final_bid', '')::numeric
          end
        else lot.final_bid
      end,
      final_bid_updated_at = case
        when event.event ? 'final_bid_updated_at' and not (event.event ? 'bid')
          then nullif(event.event ->> 'final_bid_updated_at', '')::timestamptz
        when event.event #>> '{final_bid,updated_at}' is not null
          then nullif(event.event #>> '{final_bid,updated_at}', '')::timestamptz
        else lot.final_bid_updated_at
      end,
      seller_reserve = case
        when event.event ? 'seller_reserve' then
          case when jsonb_typeof(event.event -> 'seller_reserve') = 'object'
            then nullif(event.event #>> '{seller_reserve,price}', '')::numeric
            else nullif(event.event ->> 'seller_reserve', '')::numeric
          end
        else lot.seller_reserve
      end,
      seller_reserve_updated_at = case
        when event.event ? 'seller_reserve_updated_at'
          then nullif(event.event ->> 'seller_reserve_updated_at', '')::timestamptz
        when event.event #>> '{seller_reserve,updated_at}' is not null
          then nullif(event.event #>> '{seller_reserve,updated_at}', '')::timestamptz
        else lot.seller_reserve_updated_at
      end,
      sale_at = case
        when event.event ? 'sale_at'
          then nullif(event.event ->> 'sale_at', '')::timestamptz
        when event.event ? 'sale_date' then
          case when jsonb_typeof(event.event -> 'sale_date') = 'object'
            then nullif(event.event #>> '{sale_date,value}', '')::timestamptz
            else nullif(event.event ->> 'sale_date', '')::timestamptz
          end
        else lot.sale_at
      end,
      sale_updated_at = case
        when event.event ? 'sale_updated_at'
          then nullif(event.event ->> 'sale_updated_at', '')::timestamptz
        when event.event #>> '{sale_date,updated_at}' is not null
          then nullif(event.event #>> '{sale_date,updated_at}', '')::timestamptz
        else lot.sale_updated_at
      end,
      currency = case
        when event.event ? 'currency'
          then upper(nullif(btrim(event.event ->> 'currency'), ''))
        else lot.currency
      end,
      buyer_country = case
        when event.event ? 'buyer_country'
          then nullif(event.event ->> 'buyer_country', '')
        else lot.buyer_country
      end,
      archived_at = coalesce(
        nullif(event.event ->> 'archived_at', '')::timestamptz,
        lot.archived_at,
        p_fetched_at
      ),
      archive_seen_at = p_fetched_at,
      deactivated_at = p_fetched_at,
      inactive_reason = 'archived_event',
      provider_updated_at = greatest(
        lot.provider_updated_at,
        nullif(event.event ->> 'provider_updated_at', '')::timestamptz,
        nullif(event.event ->> 'archived_at', '')::timestamptz,
        nullif(event.event ->> 'current_bid_updated_at', '')::timestamptz,
        nullif(event.event ->> 'buy_now_updated_at', '')::timestamptz,
        case when event.event ? 'final_bid' then
          nullif(event.event ->> 'final_bid_updated_at', '')::timestamptz
        end,
        nullif(event.event ->> 'seller_reserve_updated_at', '')::timestamptz,
        nullif(event.event ->> 'sale_updated_at', '')::timestamptz
      ),
      fetched_at = greatest(lot.fetched_at, p_fetched_at)
    from normalized_events as event
    where lot.source_domain_id = event.source_domain_id
      and lot.provider_lot_id = event.provider_lot_id
    returning lot.source_domain_id, lot.provider_lot_id
  )
  select
    (select count(*)::integer from normalized_events),
    (select count(*)::integer from updated_lots),
    (
      (select count(*) from normalized_events)
      - (select count(*) from updated_lots)
    )::integer;
end;
$function$;

comment on function public.apply_motorapis_archive_events(jsonb, timestamptz) is
  'Atomically applies source-qualified archive events and removes matched lots from the active catalog';

create or replace function public.get_motorapi_catalog_facets(
  p_make text default null
)
returns table (
  makes jsonb,
  models jsonb,
  years jsonb,
  vehicle_types jsonb,
  body_types jsonb,
  fuel_types jsonb,
  transmissions jsonb,
  drive_wheels jsonb,
  colors jsonb,
  conditions jsonb,
  primary_damages jsonb,
  locations jsonb,
  lot_statuses jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  with catalog as (
    select *
    from public.motorapi_catalog
  ),
  scoped as (
    select *
    from catalog
    where nullif(btrim(p_make), '') is null
      or lower(make) = lower(btrim(p_make))
  )
  select
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct make as value
        from catalog
        where nullif(btrim(make), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct model as value
        from scoped
        where nullif(btrim(model), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by value desc)
      from (select distinct year as value from scoped where year is not null) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct vehicle_type as value
        from scoped
        where nullif(btrim(vehicle_type), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct body_type as value
        from scoped
        where nullif(btrim(body_type), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct fuel_type as value
        from scoped
        where nullif(btrim(fuel_type), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct transmission as value
        from scoped
        where nullif(btrim(transmission), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct drive_wheel as value
        from scoped
        where nullif(btrim(drive_wheel), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct color as value
        from scoped
        where nullif(btrim(color), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct condition as value
        from scoped
        where nullif(btrim(condition), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct primary_damage as value
        from scoped
        where nullif(btrim(primary_damage), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct location_name as value
        from scoped
        where nullif(btrim(location_name), '') is not null
      ) as facet_values
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(value order by lower(value), value)
      from (
        select distinct provider_status as value
        from scoped
        where nullif(btrim(provider_status), '') is not null
      ) as facet_values
    ), '[]'::jsonb);
$function$;

comment on function public.get_motorapi_catalog_facets(text) is
  'Public active Copart catalog facets; optional make scopes dependent arrays';

alter function public.claim_motorapis_sync(integer, uuid, integer, text)
  owner to postgres;
alter function public.renew_motorapis_sync(integer, uuid, integer)
  owner to postgres;
alter function public.complete_motorapis_sync(integer, uuid, timestamptz, jsonb)
  owner to postgres;
alter function public.fail_motorapis_sync(integer, uuid, text)
  owner to postgres;
alter function public.apply_motorapis_archive_events(jsonb, timestamptz)
  owner to postgres;
alter function public.get_motorapi_catalog_facets(text)
  owner to postgres;

revoke all privileges
  on function public.claim_motorapis_sync(integer, uuid, integer, text)
  from public, anon, authenticated;
revoke all privileges
  on function public.renew_motorapis_sync(integer, uuid, integer)
  from public, anon, authenticated;
revoke all privileges
  on function public.complete_motorapis_sync(integer, uuid, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all privileges
  on function public.fail_motorapis_sync(integer, uuid, text)
  from public, anon, authenticated;
revoke all privileges
  on function public.apply_motorapis_archive_events(jsonb, timestamptz)
  from public, anon, authenticated;

grant execute
  on function public.claim_motorapis_sync(integer, uuid, integer, text)
  to service_role;
grant execute
  on function public.renew_motorapis_sync(integer, uuid, integer)
  to service_role;
grant execute
  on function public.complete_motorapis_sync(integer, uuid, timestamptz, jsonb)
  to service_role;
grant execute
  on function public.fail_motorapis_sync(integer, uuid, text)
  to service_role;
grant execute
  on function public.apply_motorapis_archive_events(jsonb, timestamptz)
  to service_role;

revoke all privileges
  on function public.get_motorapi_catalog_facets(text)
  from public;
grant execute
  on function public.get_motorapi_catalog_facets(text)
  to anon, authenticated, service_role;

commit;
