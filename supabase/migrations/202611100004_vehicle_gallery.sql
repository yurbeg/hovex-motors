begin;

alter table public.vehicles
  add column if not exists images text[] not null default '{}'::text[];

-- Preserve catalog revision timestamps while initializing the gallery from the
-- existing cover image.
alter table public.vehicles disable trigger vehicles_set_updated_at;

update public.vehicles
set images = array[image]
where cardinality(images) = 0;

alter table public.vehicles enable trigger vehicles_set_updated_at;

create or replace function app_private.vehicle_images_are_valid(candidate text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $function$
  select
    pg_catalog.array_ndims(candidate) = 1
    and pg_catalog.array_lower(candidate, 1) = 1
    and pg_catalog.cardinality(candidate) between 1 and 12
    and not exists (
      select 1
      from pg_catalog.unnest(candidate) as gallery(image_url)
      where image_url is null
        or image_url is distinct from pg_catalog.btrim(image_url)
        or pg_catalog.char_length(image_url) not between 1 and 2048
        or image_url !~* '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
    )
    and pg_catalog.cardinality(candidate) = (
      select pg_catalog.count(distinct gallery.image_url)
      from pg_catalog.unnest(candidate) as gallery(image_url)
    );
$function$;

alter function app_private.vehicle_images_are_valid(text[]) owner to postgres;

revoke all privileges
  on function app_private.vehicle_images_are_valid(text[])
  from public, anon, authenticated, service_role;

grant usage on schema app_private to authenticated, service_role;

grant execute
  on function app_private.vehicle_images_are_valid(text[])
  to authenticated, service_role;

create or replace function public.sync_vehicle_image_gallery()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  preserved_images text[];
begin
  -- Old clients omit `images`; an explicitly emptied gallery also keeps the
  -- current cover so every vehicle retains at least one image.
  if new.images is null or cardinality(new.images) = 0 then
    new.images := array[new.image];
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.image is distinct from old.image
      and new.images is not distinct from old.images then
      -- A legacy image-only update changes the cover without discarding the
      -- rest of the existing ordered gallery.
      select coalesce(
        array_agg(gallery.image_url order by gallery.position),
        '{}'::text[]
      )
      into preserved_images
      from unnest(old.images) with ordinality as gallery(image_url, position)
      where gallery.position > 1
        and gallery.image_url is distinct from new.image;

      new.images := array[new.image] || preserved_images;
    else
      -- Gallery-aware writes own the cover; the first URL is canonical.
      new.image := new.images[1];
    end if;
  else
    new.image := new.images[1];
  end if;

  return new;
end;
$function$;

drop trigger if exists vehicles_sync_image_gallery on public.vehicles;

create trigger vehicles_sync_image_gallery
before insert or update of image, images on public.vehicles
for each row
execute function public.sync_vehicle_image_gallery();

alter table public.vehicles
  drop constraint if exists vehicles_images_valid_check,
  drop constraint if exists vehicles_image_cover_check;

alter table public.vehicles
  add constraint vehicles_images_valid_check
    check (app_private.vehicle_images_are_valid(images)),
  add constraint vehicles_image_cover_check
    check (image = images[1]);

comment on column public.vehicles.images is
  'Ordered vehicle gallery (1-12 URLs); the first URL is the legacy cover image';

commit;
