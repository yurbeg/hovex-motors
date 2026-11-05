# Hovex architecture

Hovex currently uses a browser application backed directly by Supabase. The
repository has two trust boundaries:

- `src/` is frontend code. Everything under this directory is bundled by Vite
  and can be inspected by a site visitor.
- `supabase/` is backend configuration. Its migrations define PostgreSQL,
  Auth authorization, Row Level Security (RLS), and Storage policies.

There is no Node.js application server in this repository. Files under
`src/infrastructure/supabase/` are browser-side adapters, not backend code.
They use only the public Supabase URL and publishable key. A `service_role` key
or another server secret must never be placed in `src/` or a `VITE_*` variable.

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

- Vehicles: Supabase PostgreSQL is authoritative when configured. The public
  catalog falls back to bundled demo inventory when Supabase is unavailable.
- Consultation leads: currently prototype-only browser `localStorage` data.
  It is not shared between devices and must not be treated as production CRM
  persistence.
- Vehicle images: public Supabase Storage URLs, with mutation restricted by
  RLS to the allowlisted admin.
- AI assistant: local demo logic by default. `VITE_ASSISTANT_API_URL` may point
  to a separately deployed server endpoint; that server is not implemented in
  this repository.

The browser storage keys and custom events are compatibility contracts. Change
them only with an explicit data migration:

- `hovex.admin.vehicles.v1`
- `hovex.admin.leads.v1`
- `hovex:vehicles-changed`
- `hovex:leads-changed`

## Authorization boundary

`AdminAuthGate` improves the admin user experience, but it is not the security
boundary. PostgreSQL and Storage RLS policies are authoritative:

- anonymous and ordinary authenticated users can read only `published`
  vehicles;
- an authenticated user in `admin_users` can read all vehicles and insert or
  update them;
- hard deletion is not granted; archiving is a status update;
- vehicle image uploads and mutations require the same admin membership.

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
