begin;

alter table public.vehicles
  add column if not exists inventory_status text not null default 'at_auction';

alter table public.vehicles
  drop constraint if exists vehicles_inventory_status_check;

alter table public.vehicles
  add constraint vehicles_inventory_status_check
  check (inventory_status in ('available', 'in_transit', 'at_auction'));

comment on column public.vehicles.inventory_status is
  'Vehicle logistics stage: available, in transit, or still at auction';

commit;
