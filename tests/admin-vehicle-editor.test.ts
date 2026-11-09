import assert from "node:assert/strict";
import test from "node:test";
import type { Vehicle } from "../src/domain/vehicle";
import {
  createVehicleEditorForm,
  emptyVehicle,
  firstVehicleEditorErrorField,
  toVehicleSavePayload,
  validateVehicleEditorForm,
} from "../src/frontend/admin/vehicles/vehicleEditorModel";

test("invalid new vehicle points Save to the first required field", () => {
  const errors = validateVehicleEditorForm({ ...emptyVehicle }, false);

  assert.deepEqual(errors, {
    make: "Նշեք մակնիշը",
    model: "Նշեք մոդելը",
    estimateMin: "Նշեք նվազագույն արժեքը",
    maxBid: "Նշեք առավելագույն խաղադրույքը",
  });
  assert.equal(firstVehicleEditorErrorField(errors), "make");
});

test("validation focus order follows the form instead of object insertion order", () => {
  assert.equal(firstVehicleEditorErrorField({ image: "required", maxBid: "required" }), "maxBid");
  assert.equal(firstVehicleEditorErrorField({}), null);
});

test("inventory status defaults to auction and round-trips through edit and save", () => {
  assert.equal(emptyVehicle.inventoryStatus, "at_auction");

  const existingVehicle = {
    ...emptyVehicle,
    id: "test-car-2026",
    year: 2026,
    estimateMin: 10_000,
    estimateMax: 12_000,
    maxBid: 8_000,
    inventoryStatus: "in_transit",
    sortOrder: 0,
    createdAt: "2026-11-05T00:00:00.000Z",
    updatedAt: "2026-11-05T01:00:00.000Z",
  } satisfies Vehicle;

  assert.equal(createVehicleEditorForm(existingVehicle).inventoryStatus, "in_transit");

  const payload = toVehicleSavePayload({
    ...emptyVehicle,
    make: "Test",
    model: "Car",
    estimateMin: "10000",
    estimateMax: "12000",
    maxBid: "8000",
    inventoryStatus: "available",
  }, "/assets/test.jpg");

  assert.equal(payload.inventoryStatus, "available");
});
