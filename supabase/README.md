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
- `migrations/202611060001_motorapis_catalog.sql` creates normalized
  AuctionsAPI vehicles/lots, the public active-Copart view, facets, sync
  leases, checkpoints, archive RPCs, and a legacy full-reconciliation RPC. Its
  `motorapi_*` names are retained for migration compatibility. The importer
  does not call the full-reconciliation RPC because provider pages are mutable;
  only explicit archive events may deactivate lots.
- `migrations/202611090001_motorapi_catalog_title_search.sql` keeps title-only
  AuctionsAPI vehicles searchable in the public catalog.
- `migrations/202611090002_vehicle_inventory_status.sql` adds the independent
  available / in-transit / at-auction stage used by admin and public cards.
- `functions/motorapis-sync/` is the legacy-named, server-only AuctionsAPI
  scheduled importer. Shared client, mapping, repository, and orchestration
  code lives in `functions/_shared/`.
- `schedule-motorapis.example.sql` is the manual Vault + Cron setup template;
  its default schedule is hourly.
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

The AuctionsAPI function reads `AUCTIONSAPI_API_KEY` from Edge Function
secrets. The operator CLI reads the provider key from an ignored
`.env.auctionsapi` and the Supabase server settings from `.env.local`. The
tracked `.env.example` contains names and safe defaults only. See
[`../MOTORAPIS.md`](../MOTORAPIS.md) for deployment, trial/full imports, and
schedule setup. The documentation filename, function path, SQL objects, and
cron identifiers keep the old `motorapis` label so existing deployments do not
need a destructive rename.

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
- anonymous users can read `motorapi_catalog` and its facets but cannot read or
  mutate the normalized provider/sync tables;
- the service role can claim only one active AuctionsAPI lease per source, and
  a failed run preserves the prior successful checkpoint;
- archive events remove matched lots from the public active view without
  deleting their stored history.
- a full or recovery traversal only upserts current inventory and never
  deactivates a lot merely because it was absent from mutable provider pages;
- after a gap longer than the provider's 4320-minute archive window, operators
  account for potentially stale old lots through provider-supported or manual
  reconciliation rather than absence-based mass deactivation.
