begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies are permissive by default and combine with OR. These restrictive
-- guards keep this bucket admin-only even if another broad Storage policy is
-- added later, while remaining neutral for every other bucket.
drop policy if exists vehicle_images_anon_guard
  on storage.objects;
drop policy if exists vehicle_images_authenticated_guard
  on storage.objects;
drop policy if exists vehicle_images_admin_select
  on storage.objects;
drop policy if exists vehicle_images_admin_insert
  on storage.objects;
drop policy if exists vehicle_images_admin_update
  on storage.objects;
drop policy if exists vehicle_images_admin_delete
  on storage.objects;

create policy vehicle_images_anon_guard
on storage.objects
as restrictive
for all
to anon
using (bucket_id <> 'vehicle-images')
with check (bucket_id <> 'vehicle-images');

create policy vehicle_images_authenticated_guard
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <> 'vehicle-images'
  or (select app_private.is_vehicle_admin())
)
with check (
  bucket_id <> 'vehicle-images'
  or (select app_private.is_vehicle_admin())
);

-- Public delivery bypasses object RLS for a public bucket. SELECT here is
-- intentionally limited to the admin for listing and future overwrite flows.
create policy vehicle_images_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (select app_private.is_vehicle_admin())
);

create policy vehicle_images_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-images'
  and (select app_private.is_vehicle_admin())
  and (storage.foldername(name))[1] = 'vehicles'
  and lower(storage.extension(name)) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'avif']::text[]
  )
);

create policy vehicle_images_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (select app_private.is_vehicle_admin())
)
with check (
  bucket_id = 'vehicle-images'
  and (select app_private.is_vehicle_admin())
  and (storage.foldername(name))[1] = 'vehicles'
  and lower(storage.extension(name)) = any (
    array['jpg', 'jpeg', 'png', 'webp', 'avif']::text[]
  )
);

create policy vehicle_images_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-images'
  and (select app_private.is_vehicle_admin())
);

commit;
