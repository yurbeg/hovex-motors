import assert from "node:assert/strict";
import test from "node:test";
import type { Vehicle, VehicleInventoryStatus } from "../src/adminStore";
import { resolveSupabaseConfig } from "../src/supabaseClient";
import { loadPublicVehicles, mapVehicleRow } from "../src/vehicleRepository";

const row = {
  id: "test-car-2026",
  make: "Test",
  model: "Car",
  year: 2026,
  body: "Սեդան",
  mileage: "10 մղոն",
  fuel: "Էլեկտրական",
  damage: "Առանց վնասի",
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
  featured: true,
  sort_order: 2,
  created_at: "2026-11-05T00:00:00.000Z",
  updated_at: "2026-11-05T01:00:00.000Z",
};

const fallbackVehicle: Vehicle = {
  ...mapVehicleRow(row),
  id: "fallback-car",
};

test("Supabase config is optional, trimmed, and limited to safe URLs", () => {
  assert.equal(resolveSupabaseConfig({}), null);
  assert.equal(resolveSupabaseConfig({ VITE_SUPABASE_URL: "https://example.supabase.co" }), null);
  assert.equal(resolveSupabaseConfig({
    VITE_SUPABASE_URL: "http://example.com",
    VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
  }), null);
  assert.deepEqual(resolveSupabaseConfig({
    VITE_SUPABASE_URL: " https://example.supabase.co/ ",
    VITE_SUPABASE_PUBLISHABLE_KEY: " public-key ",
  }), {
    url: "https://example.supabase.co",
    publishableKey: "public-key",
  });
  assert.ok(resolveSupabaseConfig({
    VITE_SUPABASE_URL: "http://127.0.0.1:54321",
    VITE_SUPABASE_ANON_KEY: "legacy-public-key",
  }));
});

test("Supabase vehicle rows map explicitly to the frontend model", () => {
  const vehicle = mapVehicleRow(row);
  assert.equal(vehicle.estimateMin, 10000);
  assert.equal(vehicle.estimateMax, 12000);
  assert.equal(vehicle.maxBid, 8000);
  assert.equal(vehicle.imagePosition, "50% 40%");
  assert.equal(vehicle.inventoryStatus, "at_auction");
  assert.equal(vehicle.sortOrder, 2);
  assert.equal(vehicle.updatedAt, "2026-11-05T01:00:00.000Z");
});

test("Supabase vehicle rows accept only supported inventory statuses", () => {
  const inventoryStatuses = [
    "available",
    "in_transit",
    "at_auction",
  ] satisfies VehicleInventoryStatus[];

  for (const inventoryStatus of inventoryStatuses) {
    assert.equal(
      mapVehicleRow({ ...row, inventory_status: inventoryStatus }).inventoryStatus,
      inventoryStatus,
    );
  }

  assert.throws(
    () => mapVehicleRow({ ...row, inventory_status: "unknown" }),
    /invalid inventory(?:_| )status/i,
  );
});

test("a successful empty Supabase catalog remains empty", async () => {
  let fallbackCalls = 0;
  const result = await loadPublicVehicles({
    fetchRows: async () => [],
    fallback: () => {
      fallbackCalls += 1;
      return [fallbackVehicle];
    },
  });
  assert.equal(result.source, "supabase");
  assert.deepEqual(result.items, []);
  assert.equal(fallbackCalls, 0);
});

test("returns every published vehicle in stable featured, sort-order, and id order", async () => {
  const result = await loadPublicVehicles({
    fetchRows: async () => [
      { ...row, id: "regular-later", featured: false, sort_order: 4 },
      { ...row, id: "featured-zeta", featured: true, sort_order: 2 },
      { ...row, id: "archived-hidden", status: "archived", featured: true, sort_order: 0 },
      { ...row, id: "featured-alpha", featured: true, sort_order: 2 },
      { ...row, id: "regular-first", featured: false, sort_order: 1 },
      { ...row, id: "draft-hidden", status: "draft", featured: true, sort_order: 0 },
    ],
    fallback: () => [fallbackVehicle],
  });

  assert.equal(result.source, "supabase");
  assert.deepEqual(result.items.map((vehicle) => vehicle.id), [
    "featured-alpha",
    "featured-zeta",
    "regular-first",
    "regular-later",
  ]);
  assert.ok(result.items.every((vehicle) => vehicle.status === "published"));
});

test("Supabase query failures preserve local demo vehicles", async () => {
  const result = await loadPublicVehicles({
    fetchRows: async () => { throw new Error("offline"); },
    fallback: () => [
      { ...fallbackVehicle, id: "draft-local", status: "draft" },
      fallbackVehicle,
      { ...fallbackVehicle, id: "archived-local", status: "archived" },
    ],
  });
  assert.equal(result.source, "local-demo");
  assert.deepEqual(result.items.map((vehicle) => vehicle.id), ["fallback-car"]);
  assert.equal(result.error, "offline");
});

test("malformed or unpublished remote rows never become public vehicles", async () => {
  const malformed = await loadPublicVehicles({
    fetchRows: async () => [{ ...row, status: "unknown" }],
    fallback: () => [fallbackVehicle],
  });
  assert.equal(malformed.source, "local-demo");

  const hidden = await loadPublicVehicles({
    fetchRows: async () => [{ ...row, status: "draft" }],
    fallback: () => [fallbackVehicle],
  });
  assert.equal(hidden.source, "supabase");
  assert.deepEqual(hidden.items, []);
});
