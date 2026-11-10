import assert from "node:assert/strict";
import test from "node:test";
import type { LeadStatus } from "../src/domain/lead";
import {
  ADMIN_LEAD_ERROR_MESSAGES,
  AdminLeadRepositoryError,
  listAdminLeads,
  mapLeadRow,
  updateAdminLeadStatus,
} from "../src/infrastructure/supabase/adminLeadRepository";
import type {
  AdminLeadDataSource,
  AdminLeadRow,
} from "../src/infrastructure/supabase/adminLeadRepository";

const baseRow: AdminLeadRow = {
  id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
  name: "Անի Մկրտչյան",
  phone: "+374 95 123 456",
  contact_method: "whatsapp",
  vehicle_id: "deepal-sl03-2025",
  vehicle_label: "2025 Deepal SL03 Sport",
  preferred_date: "2026-11-12",
  preferred_time: "13:00–16:00",
  note: "Խնդրում եմ կապվել WhatsApp-ով։",
  source: "website",
  status: "new",
  consent_version: "contact-consent-v1",
  consent_at: "2026-11-10T10:15:29.000Z",
  created_at: "2026-11-10T10:15:30.000Z",
  updated_at: "2026-11-10T10:15:30.000Z",
};

const unusedDataSource = {
  list: async () => [],
  updateStatus: async () => { throw new Error("Unexpected update call"); },
} satisfies AdminLeadDataSource;

function makeDataSource(
  overrides: Partial<AdminLeadDataSource>,
): AdminLeadDataSource {
  return { ...unusedDataSource, ...overrides };
}

test("lists leads newest first, forwards abort, and maps DB names strictly", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  const rows: AdminLeadRow[] = [
    {
      ...baseRow,
      id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-11-08T09:00:00.000Z",
    },
    {
      ...baseRow,
      id: "00000000-0000-4000-8000-000000000002",
      contact_method: "phone",
      vehicle_id: null,
      preferred_date: null,
      source: "ai-assistant",
      status: "contacted",
      created_at: "2026-11-10T09:00:00.000Z",
    },
  ];
  const dataSource = makeDataSource({
    list: async (signal) => {
      receivedSignal = signal;
      return rows;
    },
  });

  const leads = await listAdminLeads({
    dataSource,
    signal: controller.signal,
  });

  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(leads.map(({ id }) => id), [rows[1].id, rows[0].id]);
  assert.equal(leads[0].method, "phone");
  assert.equal(leads[0].source, "ai-assistant");
  assert.equal(leads[0].vehicleId, null);
  assert.equal(leads[0].date, "");
  assert.equal(leads[0].consentVersion, "contact-consent-v1");
});

test("updates status with the expected revision and trusts the returned row", async () => {
  let updatedId = "";
  let updatedStatus: LeadStatus | undefined;
  let receivedRevision = "";
  const savedRow: AdminLeadRow = {
    ...baseRow,
    status: "booked",
    updated_at: "2026-11-10T11:15:30.000Z",
  };
  const dataSource = makeDataSource({
    updateStatus: async (id, status, expectedUpdatedAt) => {
      updatedId = id;
      updatedStatus = status;
      receivedRevision = expectedUpdatedAt;
      return savedRow;
    },
  });

  const updated = await updateAdminLeadStatus(baseRow.id, "booked", {
    dataSource,
    expectedUpdatedAt: baseRow.updated_at,
  });

  assert.equal(updatedId, baseRow.id);
  assert.equal(updatedStatus, "booked");
  assert.equal(receivedRevision, baseRow.updated_at);
  assert.equal(updated.status, "booked");
  assert.equal(updated.updatedAt, savedRow.updated_at);
});

test("reports an optimistic-concurrency conflict for a stale revision", async () => {
  const dataSource = makeDataSource({ updateStatus: async () => null });

  await assert.rejects(
    () => updateAdminLeadStatus(baseRow.id, "closed", {
      dataSource,
      expectedUpdatedAt: baseRow.updated_at,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AdminLeadRepositoryError);
      assert.equal(error.code, "ADMIN_LEAD_CONFLICT");
      assert.equal(error.message, ADMIN_LEAD_ERROR_MESSAGES.ADMIN_LEAD_CONFLICT);
      return true;
    },
  );
});

test("strict mapper rejects unexpected enums, malformed dates, and timestamps", () => {
  const malformedRows: unknown[] = [
    { ...baseRow, contact_method: "Telegram" },
    { ...baseRow, source: "unknown" },
    { ...baseRow, status: "deleted" },
    { ...baseRow, preferred_date: "2026-02-30" },
    { ...baseRow, created_at: "not-a-timestamp" },
    { ...baseRow, vehicle_id: "" },
  ];

  for (const row of malformedRows) {
    assert.throws(() => mapLeadRow(row), /Lead row has an invalid/);
  }
});

test("repository failures expose stable messages and no raw database details", async () => {
  const rawFailure = new Error("private schema and row detail");
  const failingDataSource = makeDataSource({
    list: async () => { throw rawFailure; },
    updateStatus: async () => { throw rawFailure; },
  });

  const cases = [
    {
      action: () => listAdminLeads({ dataSource: failingDataSource }),
      code: "ADMIN_LEADS_LOAD_FAILED",
    },
    {
      action: () => updateAdminLeadStatus(baseRow.id, "contacted", {
        dataSource: failingDataSource,
        expectedUpdatedAt: baseRow.updated_at,
      }),
      code: "ADMIN_LEAD_UPDATE_FAILED",
    },
  ] as const;

  for (const { action, code } of cases) {
    await assert.rejects(action, (error: unknown) => {
      assert.ok(error instanceof AdminLeadRepositoryError);
      assert.equal(error.code, code);
      assert.equal(error.message, ADMIN_LEAD_ERROR_MESSAGES[code]);
      assert.equal(error.cause, rawFailure);
      assert.ok(!error.message.includes("private schema"));
      return true;
    });
  }
});

test("invalid id or revision is rejected before calling persistence", async () => {
  let calls = 0;
  const dataSource = makeDataSource({
    updateStatus: async () => {
      calls += 1;
      return baseRow;
    },
  });

  for (const [id, expectedUpdatedAt] of [
    ["", baseRow.updated_at],
    [baseRow.id, "not-a-timestamp"],
  ] as const) {
    await assert.rejects(
      () => updateAdminLeadStatus(id, "contacted", {
        dataSource,
        expectedUpdatedAt,
      }),
      (error: unknown) => error instanceof AdminLeadRepositoryError
        && error.code === "ADMIN_LEAD_UPDATE_FAILED",
    );
  }
  assert.equal(calls, 0);
});
