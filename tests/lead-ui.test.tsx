import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Lead } from "../src/domain/lead";
import { RequestDetailsDrawer } from "../src/frontend/admin/leads/RequestDetailsDrawer";
import { RequestTable } from "../src/frontend/admin/leads/RequestTable";
import { buildLeadsCsv } from "../src/frontend/admin/leads/exportLeadsCsv";
import { RequestsPage } from "../src/frontend/admin/pages/RequestsPage";
import { ConsultationModal } from "../src/frontend/public/consultation/ConsultationModal";

const lead: Lead = {
  id: "1a6d780a-2986-4bec-a729-c8f4673b253c",
  name: "Անի",
  phone: "+374 99 123 456",
  method: "video_call",
  vehicleId: null,
  vehicleLabel: "Անհատական ընտրություն",
  date: "2026-11-12",
  time: "10:00–13:00",
  note: "=HYPERLINK(\"https://example.test\")",
  status: "new",
  source: "auction-catalog",
  createdAt: "2026-11-10T08:00:00.000Z",
  updatedAt: "2026-11-10T08:00:00.000Z",
};

test("consultation form uses canonical contact codes and real submission copy", () => {
  const html = renderToStaticMarkup(
    <ConsultationModal
      selectedVehicle={null}
      onClose={() => {}}
      onSubmitLead={async () => ({
        id: "164857e9-c072-4682-b21b-b55d74919a56",
        receivedAt: "2026-11-10T08:30:00.000Z",
        duplicate: false,
      })}
    />,
  );

  assert.match(html, /value="phone"[^>]*selected=""[^>]*>Հեռախոսազանգ/);
  assert.match(html, /value="video_call"[^>]*>Տեսազանգ/);
  assert.match(html, /Ուղարկել հարցումը/);
  assert.doesNotMatch(html, /տեղային ցուցակ|storage հասանելիություն|Պատրաստել հարցումը/);
});

test("admin requests show a loading state instead of a false empty state", () => {
  const html = renderToStaticMarkup(
    <RequestsPage
      leads={[]}
      loading
      onOpenLead={() => {}}
      onExport={() => {}}
    />,
  );

  assert.match(html, /Հարցումները բեռնվում են/);
  assert.doesNotMatch(html, /Հարցումներ չկան/);
  assert.match(html, /Supabase հարցումների բազա/);
});

test("admin lead views present canonical values and lock status while saving", () => {
  const table = renderToStaticMarkup(
    <RequestTable leads={[lead]} onSelect={() => {}} />,
  );
  const drawer = renderToStaticMarkup(
    <RequestDetailsDrawer
      lead={lead}
      pending
      onClose={() => {}}
      onStatusChange={() => {}}
    />,
  );

  assert.match(table, /Տեսազանգ/);
  assert.doesNotMatch(table, /ԴԵՄՈ/);
  assert.match(drawer, /Աճուրդների կատալոգ/);
  assert.match(drawer, /<select[^>]*disabled=""/);
});

test("lead CSV exports labels and neutralizes spreadsheet formulas", () => {
  const csv = buildLeadsCsv([
    lead,
    { ...lead, id: "second", note: "\t=1+1" },
  ]);

  assert.match(csv, /Տեսազանգ/);
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"'\t=1\+1"/);
  assert.match(csv, /"'\+374 99 123 456"/);
});
