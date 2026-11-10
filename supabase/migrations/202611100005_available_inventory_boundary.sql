begin;

-- Admin-managed vehicles are Hovex's on-hand inventory. Copart lots live in
-- motorapi_catalog and are synchronized by the provider integration instead.
alter table public.vehicles
  alter column inventory_status set default 'available';

comment on column public.vehicles.inventory_status is
  'Admin-managed inventory state; new rows default to available. Legacy non-available rows remain admin-visible for cleanup.';

-- Public reads expose only published, on-hand vehicles. The separate admin
-- read-all policy is OR-composed by Postgres RLS, so legacy rows remain
-- visible to the allowlisted admin.
drop policy if exists vehicles_public_read_published
  on public.vehicles;

drop policy if exists vehicles_public_read_available
  on public.vehicles;

create policy vehicles_public_read_available
on public.vehicles
for select
to anon, authenticated
using (
  status = 'published'
  and inventory_status = 'available'
);

-- Enforce the same boundary for direct Data API inserts. Updates remain
-- governed by the existing admin policy so legacy rows can still be edited,
-- published/unpublished, or archived without silently changing their state.
drop policy if exists vehicles_admin_insert
  on public.vehicles;

create policy vehicles_admin_insert
on public.vehicles
for insert
to authenticated
with check (
  (select app_private.is_vehicle_admin())
  and inventory_status = 'available'
);

commit;
