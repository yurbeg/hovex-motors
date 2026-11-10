begin;

alter table public.leads
  add column request_kind text not null default 'consultation',
  add column lot_id text,
  add column vin text,
  add column submission_hash_version smallint not null default 1,

  add constraint leads_request_kind_check
    check (request_kind in ('consultation', 'full_calculation')),
  add constraint leads_lot_id_check
    check (
      lot_id is null
      or char_length(btrim(lot_id)) between 1 and 160
    ),
  add constraint leads_vin_check
    check (
      vin is null
      or char_length(btrim(vin)) between 1 and 64
    ),
  add constraint leads_submission_hash_version_check
    check (submission_hash_version in (1, 2));

comment on column public.leads.request_kind is
  'Customer intent selected at the lead-entry call to action';
comment on column public.leads.lot_id is
  'Optional provider lot identifier captured when the lead concerns an auction lot';
comment on column public.leads.vin is
  'Optional VIN snapshot captured with the selected vehicle';
comment on column public.leads.submission_hash_version is
  'Canonical payload-hash version used for backward-compatible idempotency checks';

commit;
