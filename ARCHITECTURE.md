# Hovex architecture

Hovex uses a browser application backed by Supabase. The repository has three
trust boundaries:

- `src/` is frontend code. Everything under this directory is bundled by Vite
  and can be inspected by a site visitor.
- `supabase/` is backend configuration. Its migrations define PostgreSQL,
  Auth authorization, Row Level Security (RLS), and Storage policies.
- `supabase/functions/` contains trusted server-side Edge Functions, including
  anonymous lead intake and the AuctionsAPI importer. Together with
  `scripts/motorapis-sync.ts`, these modules may use server secrets; none are
  imported by the Vite browser entrypoint.

There is no always-on Node.js application server in this repository. Files under
`src/infrastructure/supabase/` are browser-side adapters, not backend code.
They use only the public Supabase URL and publishable key. A `service_role` key
or another server secret must never be placed in `src/` or a `VITE_*` variable.
Scheduled AuctionsAPI work runs in the legacy-named `motorapis-sync` Supabase
Edge Function; the Node script is an operator CLI using the same tested
synchronization core. The provider secret is `AUCTIONSAPI_API_KEY` and remains
server-only. AuctionsAPI operates independently and is not affiliated with
Copart, IAAI, or Encar.

## Frontend layers

```text
src/
├── app/                          Route classification and app bootstrap helpers
├── application/                 Cross-adapter browser use cases
├── domain/                       Framework-independent application models
├── content/                      Static demo/catalog and editorial content
├── frontend/                     React pages, feature components, and UI
├── infrastructure/
│   ├── browser/                  localStorage demo persistence
│   └── supabase/                 Public browser client and data adapters
├── main.tsx                      Route-aware browser entry point
└── styles.css                    Global theme and unavoidable global rules
```

The dependency direction is:

```text
React features ──→ application use cases ──→ infrastructure adapters
      │                       │                         │
      ├──────────────→ domain models ←────────────────┤
      ├──────────────→ static content                 │
      └──────────────→ feature-specific adapters ─────┘
```

Domain models do not import React, browser APIs, or Supabase. Supabase row
shapes remain inside the infrastructure layer and are converted to camel-case
domain models by `vehicleMapper.ts`. The public-catalog application use case
chooses the browser demo fallback, so the Supabase adapter itself does not
depend on `localStorage`.

The short files at the root of `src/` such as `App.tsx`, `AdminApp.tsx`,
`adminStore.ts`, `assistantService.ts`, `vehicleRepository.ts`, and
`supabaseClient.ts` are compatibility facades.
Existing code may continue importing them while feature modules migrate to the
explicit layer paths. New infrastructure code should import the implementation
paths directly.

## Data ownership

- Curated homepage vehicles: Supabase PostgreSQL is authoritative when
  configured. The homepage presentation flow can fall back to bundled demo
  inventory when Supabase is unavailable.
- Copart catalog: AuctionsAPI is the upstream provider. Normalized
  `motorapi_vehicles` and `motorapi_lots` tables are authoritative. Browser
  clients can read only the safe, active-Copart `motorapi_catalog` view;
  `/catalog` never falls back to demo auction data. The `motorapi_*` database,
  migration, function, and file names are compatibility identifiers retained
  to avoid rewriting an applied schema; they do not identify the current
  provider brand. AuctionsAPI pagination is mutable rather than a frozen
  snapshot, so an absent row never deactivates a stored lot; only an explicit
  `/archived-lots` event does.
- Consultation leads: Supabase PostgreSQL is authoritative. The public browser
  submits a strict DTO to `submit-lead`; it has no direct table privileges.
  The Edge Function validates consent and fields, applies keyed rate limiting,
  and inserts with an idempotency key. RLS allows the allowlisted admin to read
  requests and update only their status.
- Vehicle images: public Supabase Storage URLs, with mutation restricted by
  RLS to the allowlisted admin.
- AI assistant: local demo logic by default. `VITE_ASSISTANT_API_URL` may point
  to a separately deployed server endpoint; that server is not implemented in
  this repository.

The remaining browser storage keys and custom events are compatibility
contracts for demo vehicle fallback. Change them only with an explicit data
migration:

- `hovex.admin.vehicles.v1`
- `hovex:vehicles-changed`

## Authorization boundary

`AdminAuthGate` improves the admin user experience, but it is not the security
boundary. PostgreSQL and Storage RLS policies are authoritative:

- anonymous and ordinary authenticated users can read only `published`
  vehicles;
- an authenticated user in `admin_users` can read all vehicles and insert or
  update them;
- hard deletion is not granted; archiving is a status update;
- vehicle image uploads and mutations require the same admin membership.
- anonymous users cannot directly select or mutate lead rows;
- the allowlisted admin can read leads and update only `status`; all lead PII
  fields remain non-writable from the browser.

The `admin_users` migration currently enforces one admin account through a
singleton constraint. Supporting multiple admins requires a new migration,
not an edit to a migration that has already been applied.

## Backend changes

Never edit an applied migration to change production behavior. Add a new,
timestamped file under `supabase/migrations/`, test it on a non-production
project, and then apply it in order. Keep local admin email values and all
secrets outside version control.

## Validation

Run the TypeScript check, focused unit tests, production build, and Sites worker
test before handoff. RLS behavior also needs a non-production Supabase smoke
test because repository unit tests do not execute deployed database policies.
