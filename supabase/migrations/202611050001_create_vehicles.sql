begin;

create table public.vehicles (
  id text primary key,
  make text not null,
  model text not null,
  year smallint not null,
  body text not null default '',
  mileage text not null default '',
  fuel text not null default '',
  damage text not null default '',
  auction text not null default '',
  estimate_min integer not null,
  estimate_max integer not null,
  max_bid integer not null,
  image text not null,
  image_position text not null default '50% 50%',
  badge text not null default '',
  accent text not null default 'yellow',
  status text not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicles_id_format_check
    check (char_length(id) between 1 and 120 and id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint vehicles_make_check
    check (char_length(btrim(make)) between 1 and 100),
  constraint vehicles_model_check
    check (char_length(btrim(model)) between 1 and 160),
  constraint vehicles_year_check
    check (year between 1886 and 2100),
  constraint vehicles_estimate_min_check
    check (estimate_min > 0),
  constraint vehicles_estimate_max_check
    check (estimate_max >= estimate_min),
  constraint vehicles_max_bid_check
    check (max_bid > 0),
  constraint vehicles_image_check
    check (image ~* '^(https?://|/)'),
  constraint vehicles_accent_check
    check (accent in ('yellow', 'green', 'blue', 'orange', 'black')),
  constraint vehicles_status_check
    check (status in ('published', 'draft', 'archived')),
  constraint vehicles_sort_order_check
    check (sort_order >= 0)
);

comment on table public.vehicles is 'Hovex public and draft vehicle catalog';
comment on column public.vehicles.estimate_min is 'Estimated delivered price in whole USD';
comment on column public.vehicles.estimate_max is 'Estimated delivered price in whole USD';
comment on column public.vehicles.max_bid is 'Recommended maximum auction bid in whole USD';

create index vehicles_published_catalog_idx
  on public.vehicles (featured desc, sort_order asc, id)
  where status = 'published';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row
execute function public.set_updated_at();

alter table public.vehicles enable row level security;

revoke all on table public.vehicles from anon, authenticated;
grant select on table public.vehicles to anon, authenticated;

create policy vehicles_public_read_published
on public.vehicles
for select
to anon, authenticated
using (status = 'published');

commit;
