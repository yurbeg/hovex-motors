# Supabase backend

This directory is the backend boundary for Hovex. Supabase supplies the hosted
PostgreSQL database, Auth service, Data API, and Storage service; the SQL here
defines the server-enforced authorization rules used by the browser app.

## Files

- `migrations/202611050001_create_vehicles.sql` creates the vehicle catalog,
  validation constraints, updated-at trigger, public read policy, and index.
- `migrations/202611050002_admin_vehicle_access.sql` creates the single-admin
  allowlist and permits that admin to read and mutate catalog rows.
- `migrations/202611050003_vehicle_images_storage.sql` configures the public
  image bucket and admin-only object mutation policies.
- `seed.sql` inserts the demo vehicle catalog.
- `admin-bootstrap.example.sql` is a manual, one-time template for assigning a
  confirmed Supabase Auth user to the admin singleton.

Apply migrations in filename order. Do not modify migrations that have already
been applied to a shared project; create a new timestamped migration instead.

## Browser versus backend

The modules in `src/infrastructure/supabase/` run in the browser. They may use
only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These values
identify the project but do not bypass RLS.

Never expose a `service_role` key, database password, provider secret, or admin
password in a `VITE_*` variable, browser source, SQL example, or committed env
file. Privileged future workloads should run in a server environment such as a
Supabase Edge Function and keep their secrets in that environment's secret
manager.

## Admin bootstrap

1. Create and confirm the user in Supabase Authentication.
2. Copy `admin-bootstrap.example.sql` to a local, ignored working file.
3. Replace `REPLACE_WITH_CONFIRMED_ADMIN_EMAIL@example.com` in the local copy.
4. Run the local copy once in the Supabase SQL Editor.

The current schema intentionally supports one admin account. Running the
bootstrap again replaces the existing singleton membership.

## Security checks

On a non-production Supabase project, verify that:

- anonymous users can read only `published` vehicles and cannot write;
- an authenticated non-admin cannot read drafts or mutate catalog/storage;
- the allowlisted admin can read all vehicles, insert/update rows, and upload
  allowed image types under `vehicle-images/vehicles/`;
- public image delivery works without granting public object mutation.
