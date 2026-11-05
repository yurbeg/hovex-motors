begin;

-- The frontend may read only its own membership row. Membership changes are
-- intentionally limited to trusted SQL/bootstrap operations.
create table if not exists public.admin_users (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  singleton boolean not null default true,
  granted_at timestamptz not null default now(),

  constraint admin_users_singleton_check check (singleton),
  constraint admin_users_singleton_unique unique (singleton)
);

comment on table public.admin_users is
  'Single-user Hovex admin allowlist backed by Supabase Auth';

alter table public.admin_users enable row level security;

revoke all privileges
  on table public.admin_users
  from public, anon, authenticated;

grant select
  on table public.admin_users
  to authenticated;

drop policy if exists admin_users_read_self
  on public.admin_users;

create policy admin_users_read_self
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Keep the authorization predicate outside the schemas exposed by the Data
-- API. Authenticated requests only need permission to execute this one
-- boolean function from vehicle RLS policies.
create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_vehicle_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  );
$function$;

alter function app_private.is_vehicle_admin() owner to postgres;

revoke all privileges
  on function app_private.is_vehicle_admin()
  from public, anon, authenticated;

grant execute
  on function app_private.is_vehicle_admin()
  to authenticated;

alter table public.vehicles enable row level security;

-- Anonymous users can only read published rows. Authenticated users receive
-- write grants, but the policies below admit only the allowlisted admin.
revoke all privileges
  on table public.vehicles
  from anon, authenticated;

grant select
  on table public.vehicles
  to anon;

grant select, insert, update
  on table public.vehicles
  to authenticated;

-- Archiving is an update (`status = 'archived'`); hard delete stays disabled.
drop policy if exists vehicles_admin_delete
  on public.vehicles;

drop policy if exists vehicles_public_read_published
  on public.vehicles;

create policy vehicles_public_read_published
on public.vehicles
for select
to anon, authenticated
using (status = 'published');

drop policy if exists vehicles_admin_read_all
  on public.vehicles;

create policy vehicles_admin_read_all
on public.vehicles
for select
to authenticated
using ((select app_private.is_vehicle_admin()));

drop policy if exists vehicles_admin_insert
  on public.vehicles;

create policy vehicles_admin_insert
on public.vehicles
for insert
to authenticated
with check ((select app_private.is_vehicle_admin()));

drop policy if exists vehicles_admin_update
  on public.vehicles;

create policy vehicles_admin_update
on public.vehicles
for update
to authenticated
using ((select app_private.is_vehicle_admin()))
with check ((select app_private.is_vehicle_admin()));

commit;
