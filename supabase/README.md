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
- `migrations/202611100001_create_leads.sql` creates the protected consultation
  lead store, consent/idempotency fields, admin read/status-only RLS, and the
  private hashed rate-limit counter.
- `migrations/202611100002_lead_vehicle_context.sql` adds request intent, lot,
  VIN, and versioned idempotency context used by the current intake function.
- `migrations/202611100003_lead_response_workflow.sql` replaces direct status
  updates with audited workflow RPCs, adds managers, a server-owned 30-minute
  first-response SLA, append-only activities/internal notes, and the private
  leased Telegram notification outbox.
- `functions/motorapis-sync/` is the legacy-named, server-only AuctionsAPI
  scheduled importer. Shared client, mapping, repository, and orchestration
  code lives in `functions/_shared/`.
- `functions/submit-lead/` is the anonymous public intake boundary. It strictly
  validates and normalizes the form, requires consent, rate-limits a keyed
  network fingerprint, and performs idempotent server-only inserts.
- `functions/process-lead-notifications/` is the private, scheduled Telegram
  worker. It claims leased outbox jobs through service-role-only RPCs, escapes
  customer data, and records delivery, retry, or dead-letter outcomes without
  delaying public lead submission.
- `schedule-motorapis.example.sql` is the manual Vault + Cron setup template;
  its default schedule is hourly.
- `schedule-lead-notifications.example.sql` is the one-minute Vault + Cron
  setup template for the notification worker.
- `seed.sql` inserts the demo vehicle catalog.
- `admin-bootstrap.example.sql` is a manual, safely repeatable template for
  assigning or rotating the confirmed Supabase Auth admin singleton.

Apply migrations in filename order. Do not modify migrations that have already
been applied to a shared project; create a new timestamped migration instead.

## Browser versus backend

The modules in `src/infrastructure/supabase/` run in the browser. They may use
only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These values
identify the project but do not bypass RLS.

Never expose a `service_role` key, database password, provider secret, or admin
password in a `VITE_*` variable, browser source, SQL example, or committed env
file. Privileged workloads run in Supabase Edge Functions and keep their
secrets in that environment's secret manager.

`submit-lead` requires `LEAD_RATE_LIMIT_SECRET` with at least 32 characters
and fails closed when it is absent. Generate and deploy it separately from
browser configuration, then deploy the function without JWT verification:

```bash
supabase secrets set LEAD_RATE_LIMIT_SECRET="$(openssl rand -hex 32)"
supabase functions deploy submit-lead --no-verify-jwt
```

The endpoint is intentionally anonymous, but it never receives a database
service credential from the caller. It resolves the hosted server credential
from `SUPABASE_SECRET_KEY`/`SUPABASE_SECRET_KEYS` or the legacy
`SUPABASE_SERVICE_ROLE_KEY` inside the Edge environment.

## Lead notifications

New-lead notifications use a transactional PostgreSQL outbox rather than
calling Telegram inside `submit-lead`. A committed lead therefore remains
stored when Telegram is unavailable, and the scheduled worker can retry the
leased job independently. Telegram receives the request type, customer contact
details, vehicle context, preferred time, assigned manager, source, timestamp,
and lead ID. Customer free-text notes are deliberately omitted.

Create a Telegram bot, add it to a private operations chat with permission to
send messages, and collect that chat's numeric ID. Then configure these values
under **Edge Functions → Secrets** in the Supabase Dashboard or with the CLI:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="REPLACE_WITH_BOT_TOKEN"
supabase secrets set TELEGRAM_CHAT_ID="REPLACE_WITH_PRIVATE_CHAT_ID"
supabase secrets set ADMIN_APP_URL="https://your-site.example/admin/requests"
```

For a forum group topic, also set `TELEGRAM_MESSAGE_THREAD_ID` to its positive
numeric topic ID. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and the optional
topic ID remain server-only and must never use a `VITE_*` name.

Deploy the worker without gateway JWT verification; the handler still requires
an `apikey` equal to an injected server secret before it performs any work:

```bash
supabase functions deploy process-lead-notifications --no-verify-jwt
```

Finally, copy `schedule-lead-notifications.example.sql` to
`schedule-lead-notifications.local.sql` (the `supabase/*.local.sql` pattern is
gitignored), replace its project placeholders, and open it in SQL Editor. Run
the setup/review section first, inspect the queued-job summaries, then execute
the clearly marked scheduling block separately. It stores the Cron
authentication material in Vault and invokes the worker every minute. Optional
tuning values are `TELEGRAM_TIMEOUT_MS` (default 8000),
`LEAD_NOTIFICATION_STORAGE_TIMEOUT_MS` (default 8000),
`LEAD_NOTIFICATION_BATCH_SIZE` (default 5), and
`LEAD_NOTIFICATION_LEASE_SECONDS` (default 120). Invalid individual values use
their bounded defaults. The worker then validates the resulting settings as one
safety envelope before claiming work: the lease must exceed the claim storage
timeout, every sequential job's Telegram plus acknowledgement timeout, and a
10-second margin. An unsafe resulting combination fails closed without a
database or Telegram request; reduce the batch/timeouts or increase the lease.

Jobs created after this migration remain pending while the worker is not
scheduled. Activating Telegram later drains those queued notifications, so
review the outbox counts in the schedule example before enabling Cron.

Telegram does not provide an idempotency key for `sendMessage`. The outbox and
lease token prevent concurrent workers from creating ordinary duplicates, but
an ambiguous network failure after Telegram accepted a message can still lead
to a later retry. Every message includes the stable lead ID so that rare retry
duplicates are recognizable.

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
2. Copy `admin-bootstrap.example.sql` to `admin-bootstrap.local.sql`; this path
   is covered by the repository's `supabase/*.local.sql` ignore rule.
3. Replace `REPLACE_WITH_CONFIRMED_ADMIN_EMAIL@example.com` in the local copy.
4. Run the local copy once in the Supabase SQL Editor.

The current schema intentionally supports one admin account. Running the
bootstrap again replaces the existing singleton membership, deactivates the
previous admin's linked manager identity, and creates or reactivates the new
admin's manager identity when the lead workflow migration is installed.

## Security checks

On a non-production Supabase project, verify that:

- anonymous users can read only `published` vehicles and cannot write;
- an authenticated non-admin cannot read drafts or mutate catalog/storage;
- the allowlisted admin can read all vehicles, insert/update rows, and upload
  allowed image types under `vehicle-images/vehicles/`;
- public image delivery works without granting public object mutation.
- anonymous and ordinary authenticated clients cannot select, insert, update,
  or delete `leads` directly;
- `submit-lead` accepts a valid consented request, returns the same row for an
  identical idempotent retry, rejects a changed payload under the same key,
  and starts rejecting submissions after the configured rate limit;
- only a valid server-key `apikey` can invoke `process-lead-notifications`;
  public keys and bearer-only requests are rejected before database/provider
  access, and failed Telegram delivery leaves the lead intact;
- the allowlisted admin can read leads, managers, and activity history and can
  change only manager/status/next-action state or add an internal note through
  the audited RPCs; direct contact/consent updates and lead deletion remain
  unavailable;
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
