import assert from "node:assert/strict";
import test from "node:test";
import type { Vehicle } from "../src/adminStore";
import {
  ADMIN_VEHICLE_ERROR_MESSAGES,
  AdminVehicleRepositoryError,
  createAdminVehicle,
  loadAdminVehicles,
  updateAdminVehicle,
} from "../src/adminVehicleRepository";
import type {
  AdminVehicleDataSource,
  AdminVehicleInsertRow,
  AdminVehicleUpdateRow,
} from "../src/adminVehicleRepository";
import type { VehicleRow } from "../src/database.types";
import { mapVehicleRow } from "../src/vehicleRepository";

const baseRow: VehicleRow = {
  id: "test-car-2026",
  make: "Test",
  model: "Car",
  year: 2026,
  body: "Sedan",
  mileage: "10 miles",
  fuel: "Electric",
  damage: "None",
  auction: "Demo",
  estimate_min: 10000,
  estimate_max: 12000,
  max_bid: 8000,
  image: "/assets/test.jpg",
  image_position: "50% 40%",
  badge: "Test",
  accent: "yellow",
  status: "published",
  inventory_status: "at_auction",
  featured: false,
  sort_order: 2,
  created_at: "2026-11-05T00:00:00.000Z",
  updated_at: "2026-11-05T01:00:00.000Z",
};

const unusedDataSource = {
  list: async () => [],
  create: async () => { throw new Error("Unexpected create call"); },
  update: async () => { throw new Error("Unexpected update call"); },
} satisfies AdminVehicleDataSource;

function makeDataSource(overrides: Partial<AdminVehicleDataSource>): AdminVehicleDataSource {
  return { ...unusedDataSource, ...overrides };
}

function asVehicle(row: VehicleRow = baseRow): Vehicle {
  return mapVehicleRow(row);
}

test("loads every admin status, forwards the abort signal, and sorts deterministically", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  const rows: VehicleRow[] = [
    { ...baseRow, id: "draft-last", status: "draft", sort_order: 4 },
    { ...baseRow, id: "archived-featured", status: "archived", featured: true, sort_order: 8 },
    { ...baseRow, id: "published-first", status: "published", sort_order: 1 },
  ];
  const dataSource = makeDataSource({
    list: async (signal) => {
      receivedSignal = signal;
      return rows;
    },
  });

  const vehicles = await loadAdminVehicles({ signal: controller.signal, dataSource });

  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.id), [
    "archived-featured",
    "published-first",
    "draft-last",
  ]);
  assert.deepEqual(new Set(vehicles.map((vehicle) => vehicle.status)), new Set([
    "published",
    "draft",
    "archived",
  ]));
});

test("create maps only writable columns and trusts database timestamps", async () => {
  let inserted: AdminVehicleInsertRow | undefined;
  const databaseRow: VehicleRow = {
    ...baseRow,
    created_at: "2026-11-05T10:00:00.000Z",
    updated_at: "2026-11-05T10:00:01.000Z",
  };
  const dataSource = makeDataSource({
    create: async (row) => {
      inserted = row;
      return databaseRow;
    },
  });
  const input = {
    ...asVehicle(),
    createdAt: "2000-01-01T00:00:00.000Z",
    updatedAt: "2000-01-01T00:00:00.000Z",
    ignoredField: "must not reach the database",
  } as Vehicle;

  const created = await createAdminVehicle(input, { dataSource });

  assert.deepEqual(inserted, {
    id: baseRow.id,
    make: baseRow.make,
    model: baseRow.model,
    year: baseRow.year,
    body: baseRow.body,
    mileage: baseRow.mileage,
    fuel: baseRow.fuel,
    damage: baseRow.damage,
    auction: baseRow.auction,
    estimate_min: baseRow.estimate_min,
    estimate_max: baseRow.estimate_max,
    max_bid: baseRow.max_bid,
    image: baseRow.image,
    image_position: baseRow.image_position,
    badge: baseRow.badge,
    accent: baseRow.accent,
    status: baseRow.status,
    inventory_status: baseRow.inventory_status,
    featured: baseRow.featured,
    sort_order: baseRow.sort_order,
  });
  assert.ok(!("created_at" in (inserted || {})));
  assert.ok(!("updated_at" in (inserted || {})));
  assert.equal(created.createdAt, databaseRow.created_at);
  assert.equal(created.updatedAt, databaseRow.updated_at);
});

test("update whitelists mutable fields and returns the database row", async () => {
  let updatedId = "";
  let updatedPatch: AdminVehicleUpdateRow | undefined;
  let expectedUpdatedAt: string | undefined;
  const databaseRow: VehicleRow = {
    ...baseRow,
    badge: "",
    inventory_status: "in_transit",
    featured: false,
    sort_order: 0,
    updated_at: "2026-11-05T12:00:00.000Z",
  };
  const dataSource = makeDataSource({
    update: async (id, patch, expectedRevision) => {
      updatedId = id;
      updatedPatch = patch;
      expectedUpdatedAt = expectedRevision;
      return databaseRow;
    },
  });
  const patch = {
    id: "attempted-id-change",
    badge: "",
    inventoryStatus: "in_transit",
    featured: false,
    sortOrder: 0,
    createdAt: "2000-01-01T00:00:00.000Z",
    updatedAt: "2000-01-01T00:00:00.000Z",
    ignoredField: "must not reach the database",
  } as Partial<Vehicle>;

  const updated = await updateAdminVehicle(baseRow.id, patch, {
    dataSource,
    expectedUpdatedAt: baseRow.updated_at,
  });

  assert.equal(updatedId, baseRow.id);
  assert.deepEqual(updatedPatch, {
    badge: "",
    inventory_status: "in_transit",
    featured: false,
    sort_order: 0,
  });
  assert.equal(expectedUpdatedAt, baseRow.updated_at);
  assert.equal(updated.id, baseRow.id);
  assert.equal(updated.updatedAt, databaseRow.updated_at);
});

test("update reports a stable conflict when the expected revision is stale", async () => {
  const dataSource = makeDataSource({ update: async () => null });

  await assert.rejects(
    () => updateAdminVehicle(baseRow.id, { status: "draft" }, {
      dataSource,
      expectedUpdatedAt: baseRow.updated_at,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AdminVehicleRepositoryError);
      assert.equal(error.code, "ADMIN_VEHICLE_CONFLICT");
      assert.equal(error.message, ADMIN_VEHICLE_ERROR_MESSAGES.ADMIN_VEHICLE_CONFLICT);
      return true;
    },
  );
});

test("repository operations reject with stable errors and never fall back locally", async () => {
  const sourceError = new Error("raw database detail that must not become the public message");
  const failingDataSource = makeDataSource({
    list: async () => { throw sourceError; },
    create: async () => { throw sourceError; },
    update: async () => { throw sourceError; },
  });

  const cases = [
    {
      action: () => loadAdminVehicles({ dataSource: failingDataSource }),
      code: "ADMIN_VEHICLES_LOAD_FAILED",
    },
    {
      action: () => createAdminVehicle(asVehicle(), { dataSource: failingDataSource }),
      code: "ADMIN_VEHICLE_CREATE_FAILED",
    },
    {
      action: () => updateAdminVehicle(baseRow.id, { status: "draft" }, { dataSource: failingDataSource }),
      code: "ADMIN_VEHICLE_UPDATE_FAILED",
    },
  ] as const;

  for (const { action, code } of cases) {
    await assert.rejects(action, (error: unknown) => {
      assert.ok(error instanceof AdminVehicleRepositoryError);
      assert.equal(error.code, code);
      assert.equal(error.message, ADMIN_VEHICLE_ERROR_MESSAGES[code]);
      assert.equal(error.cause, sourceError);
      return true;
    });
  }
});

test("invalid returned rows and empty updates use the same stable operation errors", async () => {
  const malformed = { ...baseRow, updated_at: "not-a-date" } as VehicleRow;
  const malformedSource = makeDataSource({ create: async () => malformed });

  await assert.rejects(
    () => createAdminVehicle(asVehicle(), { dataSource: malformedSource }),
    (error: unknown) => error instanceof AdminVehicleRepositoryError
      && error.code === "ADMIN_VEHICLE_CREATE_FAILED",
  );

  await assert.rejects(
    () => updateAdminVehicle(baseRow.id, { id: "ignored" }, { dataSource: unusedDataSource }),
    (error: unknown) => error instanceof AdminVehicleRepositoryError
      && error.code === "ADMIN_VEHICLE_UPDATE_FAILED",
  );
});
