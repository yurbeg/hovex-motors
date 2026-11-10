import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_LEAD_ERROR_MESSAGES,
  AdminLeadRepositoryError,
  addAdminLeadNote,
  listAdminLeadActivities,
  listAdminLeadManagers,
  listAdminLeads,
  mapLeadActivityRow,
  mapLeadManagerRow,
  mapLeadRow,
  updateAdminLeadWorkflow,
  type AdminLeadActivityRow,
  type AdminLeadDataSource,
  type AdminLeadManagerRow,
  type AdminLeadRow,
} from "../src/infrastructure/supabase/adminLeadRepository";

const baseRow: AdminLeadRow = {
  id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
  name: "Անի Մկրտչյան",
  phone: "+374 95 123 456",
  contact_method: "whatsapp",
  request_kind: "full_calculation",
  vehicle_id: "deepal-sl03-2025",
  vehicle_label: "2025 Deepal SL03 Sport",
  lot_id: "70010001",
  vin: "1HGCM82633A004352",
  preferred_date: "2026-11-12",
  preferred_time: "13:00–16:00",
  note: "Խնդրում եմ կապվել WhatsApp-ով։",
  source: "website",
  status: "new",
  assigned_manager_id: null,
  first_response_due_at: "2026-11-10T10:30:00.000Z",
  first_contacted_at: null,
  next_action_at: null,
  consent_version: "contact-consent-v1",
  consent_at: "2026-11-10T10:15:29.000Z",
  created_at: "2026-11-10T10:15:30.000Z",
  updated_at: "2026-11-10T10:15:30.000Z",
};

const managerRow: AdminLeadManagerRow = {
  id: "191af152-391f-46e4-b68b-cd58fdb665a3",
  auth_user_id: "7a09a41a-04d3-42c1-9a41-bc03dfc594a8",
  display_name: "Արամ",
  email: "aram@example.com",
  is_active: true,
  created_at: "2026-11-10T08:00:00.000Z",
  updated_at: "2026-11-10T08:00:00.000Z",
};

const activityRow: AdminLeadActivityRow = {
  id: "bf26fc7e-c690-453b-8fc7-916f1110cd45",
  lead_id: baseRow.id,
  activity_type: "note_added",
  actor_user_id: managerRow.auth_user_id,
  actor_label: managerRow.display_name,
  from_status: null,
  to_status: null,
  from_manager_id: null,
  to_manager_id: null,
  from_manager_name: null,
  to_manager_name: null,
  from_next_action_at: null,
  to_next_action_at: null,
  note_body: "Կապվել վաղը։",
  created_at: "2026-11-10T11:00:00.000Z",
};

const unusedDataSource: AdminLeadDataSource = {
  list: async () => [],
  listManagers: async () => [],
  listActivities: async () => [],
  updateWorkflow: async () => { throw new Error("Unexpected update call"); },
  addNote: async () => { throw new Error("Unexpected note call"); },
};

function makeDataSource(overrides: Partial<AdminLeadDataSource>): AdminLeadDataSource {
  return { ...unusedDataSource, ...overrides };
}

test("lists leads newest first and maps workflow fields strictly", async () => {
  const rows: AdminLeadRow[] = [
    { ...baseRow, id: "00000000-0000-4000-8000-000000000001", created_at: "2026-11-08T09:00:00.000Z" },
    {
      ...baseRow,
      id: "00000000-0000-4000-8000-000000000002",
      status: "contacted",
      assigned_manager_id: managerRow.id,
      first_contacted_at: "2026-11-10T09:01:00.000Z",
      next_action_at: "2026-11-11T09:00:00.000Z",
      created_at: "2026-11-10T09:00:00.000Z",
    },
  ];
  const leads = await listAdminLeads({ dataSource: makeDataSource({ list: async () => rows }) });

  assert.deepEqual(leads.map(({ id }) => id), [rows[1].id, rows[0].id]);
  assert.equal(leads[0].assignedManagerId, managerRow.id);
  assert.equal(leads[0].firstContactedAt, "2026-11-10T09:01:00.000Z");
  assert.equal(leads[0].nextActionAt, "2026-11-11T09:00:00.000Z");
});

test("lists managers including non-login managers and newest-first activities", async () => {
  const passiveManager = { ...managerRow, id: "passive", auth_user_id: null, email: null, display_name: "Բաբկեն", is_active: false };
  const dataSource = makeDataSource({
    listManagers: async () => [passiveManager, managerRow],
    listActivities: async () => [
      { ...activityRow, id: "old", created_at: "2026-11-10T09:00:00.000Z" },
      activityRow,
    ],
  });

  const managers = await listAdminLeadManagers({ dataSource });
  const activities = await listAdminLeadActivities(baseRow.id, { dataSource });

  assert.equal(managers[0].displayName, "Արամ");
  assert.equal(managers[1].authUserId, null);
  assert.deepEqual(activities.map(({ id }) => id), [activityRow.id, "old"]);
  assert.equal(activities[0].note, "Կապվել վաղը։");
});

test("sends the complete workflow snapshot with optimistic revision", async () => {
  let received: unknown;
  let receivedSignal: AbortSignal | undefined;
  const savedRow: AdminLeadRow = {
    ...baseRow,
    status: "contacted",
    assigned_manager_id: managerRow.id,
    first_contacted_at: "2026-11-10T11:15:30.000Z",
    next_action_at: "2026-11-11T08:00:00.000Z",
    updated_at: "2026-11-10T11:15:30.000Z",
  };
  const dataSource = makeDataSource({
    updateWorkflow: async (id, expectedUpdatedAt, values, signal) => {
      received = { id, expectedUpdatedAt, values };
      receivedSignal = signal;
      return savedRow;
    },
  });
  const lead = mapLeadRow(baseRow);
  const values = {
    status: "contacted" as const,
    assignedManagerId: managerRow.id,
    nextActionAt: "2026-11-11T08:00:00.000Z",
  };

  const controller = new AbortController();
  const updated = await updateAdminLeadWorkflow(lead, values, {
    dataSource,
    signal: controller.signal,
  });

  assert.deepEqual(received, { id: baseRow.id, expectedUpdatedAt: baseRow.updated_at, values });
  assert.equal(receivedSignal, controller.signal);
  assert.equal(updated.status, "contacted");
  assert.equal(updated.assignedManagerId, managerRow.id);
});

test("rejects invalid transitions and reports stale workflow conflicts", async () => {
  let calls = 0;
  const invalidSource = makeDataSource({ updateWorkflow: async () => { calls += 1; return baseRow; } });
  await assert.rejects(
    () => updateAdminLeadWorkflow(mapLeadRow(baseRow), {
      status: "booked",
      assignedManagerId: null,
      nextActionAt: null,
    }, { dataSource: invalidSource }),
    (error: unknown) => error instanceof AdminLeadRepositoryError && error.code === "ADMIN_LEAD_UPDATE_FAILED",
  );
  assert.equal(calls, 0);

  await assert.rejects(
    () => updateAdminLeadWorkflow(mapLeadRow(baseRow), {
      status: "contacted",
      assignedManagerId: null,
      nextActionAt: null,
    }, { dataSource: makeDataSource({ updateWorkflow: async () => null }) }),
    (error: unknown) => error instanceof AdminLeadRepositoryError
      && error.code === "ADMIN_LEAD_CONFLICT"
      && error.message === ADMIN_LEAD_ERROR_MESSAGES.ADMIN_LEAD_CONFLICT,
  );
});

test("trims and stores a private note without changing lead revision", async () => {
  let received = "";
  let receivedSignal: AbortSignal | undefined;
  const dataSource = makeDataSource({
    addNote: async (_leadId, body, signal) => {
      received = body;
      receivedSignal = signal;
      return activityRow;
    },
  });

  const controller = new AbortController();
  const activity = await addAdminLeadNote(baseRow.id, "  Կապվել վաղը։  ", {
    dataSource,
    signal: controller.signal,
  });
  assert.equal(received, "Կապվել վաղը։");
  assert.equal(receivedSignal, controller.signal);
  assert.equal(activity.type, "note_added");
});

test("strict mappers reject malformed workflow and activity values", () => {
  const malformedRows: unknown[] = [
    { ...baseRow, status: "deleted" },
    { ...baseRow, first_response_due_at: "not-a-timestamp" },
    { ...baseRow, next_action_at: "tomorrow" },
  ];
  for (const row of malformedRows) assert.throws(() => mapLeadRow(row), /Lead row has an invalid/);
  assert.throws(() => mapLeadManagerRow({ ...managerRow, is_active: "yes" }), /is_active/);
  assert.throws(() => mapLeadActivityRow({ ...activityRow, activity_type: "emailed" }), /activity_type/);
  assert.throws(() => mapLeadActivityRow({ ...activityRow, note_body: null }), /note_body/);
});

test("repository failures expose stable messages without raw details", async () => {
  const rawFailure = new Error("private schema and row detail");
  const failing = makeDataSource({
    list: async () => { throw rawFailure; },
    listManagers: async () => { throw rawFailure; },
    listActivities: async () => { throw rawFailure; },
    addNote: async () => { throw rawFailure; },
  });
  const cases = [
    [() => listAdminLeads({ dataSource: failing }), "ADMIN_LEADS_LOAD_FAILED"],
    [() => listAdminLeadManagers({ dataSource: failing }), "ADMIN_LEAD_MANAGERS_LOAD_FAILED"],
    [() => listAdminLeadActivities(baseRow.id, { dataSource: failing }), "ADMIN_LEAD_ACTIVITIES_LOAD_FAILED"],
    [() => addAdminLeadNote(baseRow.id, "նշում", { dataSource: failing }), "ADMIN_LEAD_NOTE_FAILED"],
  ] as const;
  for (const [action, code] of cases) {
    await assert.rejects(action, (error: unknown) => {
      assert.ok(error instanceof AdminLeadRepositoryError);
      assert.equal(error.code, code);
      assert.ok(!error.message.includes("private schema"));
      return true;
    });
  }
});
