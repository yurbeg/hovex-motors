import assert from "node:assert/strict";
import test from "node:test";
import type { Vehicle } from "../src/domain/vehicle";
import {
  ADMIN_VEHICLE_MAX_IMAGES,
  createVehicleEditorForm,
  emptyVehicle,
  firstVehicleEditorErrorField,
  toVehicleSavePayload,
  validateVehicleEditorForm,
  vehicleEditorImages,
} from "../src/frontend/admin/vehicles/vehicleEditorModel";

test("invalid new vehicle points Save to the first required field", () => {
  const errors = validateVehicleEditorForm({ ...emptyVehicle }, 0);

  assert.deepEqual(errors, {
    make: "Նշեք մակնիշը",
    model: "Նշեք մոդելը",
    estimateMin: "Նշեք նվազագույն արժեքը",
    maxBid: "Նշեք առավելագույն խաղադրույքը",
    image: "Ընտրեք առնվազն մեկ նկար",
  });
  assert.equal(firstVehicleEditorErrorField(errors), "make");
});

test("validation focus order follows the form instead of object insertion order", () => {
  assert.equal(firstVehicleEditorErrorField({ image: "required", maxBid: "required" }), "maxBid");
  assert.equal(firstVehicleEditorErrorField({}), null);
});

test("new vehicles are forced to available while existing legacy statuses round-trip", () => {
  assert.equal(emptyVehicle.inventoryStatus, "available");

  const existingVehicle = {
    ...emptyVehicle,
    id: "test-car-2026",
    year: 2026,
    estimateMin: 10_000,
    estimateMax: 12_000,
    maxBid: 8_000,
    image: "/assets/test-cover.jpg",
    images: ["/assets/test-cover.jpg", "/assets/test-side.jpg"],
    inventoryStatus: "in_transit",
    sortOrder: 0,
    createdAt: "2026-11-05T00:00:00.000Z",
    updatedAt: "2026-11-05T01:00:00.000Z",
  } satisfies Vehicle;

  const editorForm = createVehicleEditorForm(existingVehicle);
  assert.equal(editorForm.inventoryStatus, "in_transit");
  assert.deepEqual(editorForm.images, ["/assets/test-cover.jpg", "/assets/test-side.jpg"]);

  const existingPayload = toVehicleSavePayload(editorForm, editorForm.images);
  assert.equal(existingPayload.inventoryStatus, "in_transit");

  const payload = toVehicleSavePayload({
    ...emptyVehicle,
    make: "Test",
    model: "Car",
    estimateMin: "10000",
    estimateMax: "12000",
    maxBid: "8000",
    inventoryStatus: "at_auction",
  }, ["/assets/test.jpg", "/assets/test-side.jpg"]);

  assert.equal(payload.inventoryStatus, "available");
  assert.equal(payload.image, "/assets/test.jpg");
  assert.deepEqual(payload.images, ["/assets/test.jpg", "/assets/test-side.jpg"]);
});

test("gallery reconciliation replaces the legacy cover without losing ordered secondary images", () => {
  assert.deepEqual(vehicleEditorImages({
    image: "https://cdn.example.test/new-cover.jpg",
    images: [
      "https://cdn.example.test/old-cover.jpg",
      "https://cdn.example.test/side.jpg",
      "https://cdn.example.test/side.jpg",
    ],
  }), [
    "https://cdn.example.test/new-cover.jpg",
    "https://cdn.example.test/side.jpg",
  ]);
});

test("gallery validation accepts queued files as the first images and enforces the total limit", () => {
  const validForm = {
    ...emptyVehicle,
    make: "Test",
    model: "Car",
    estimateMin: "10000",
    estimateMax: "12000",
    maxBid: "8000",
  };

  assert.equal(validateVehicleEditorForm(validForm, 2).image, undefined);
  assert.match(
    validateVehicleEditorForm({
      ...validForm,
      image: "/assets/cover.jpg",
      images: Array.from(
        { length: ADMIN_VEHICLE_MAX_IMAGES },
        (_, index) => `/assets/car-${index}.jpg`,
      ),
    }, 1).image ?? "",
    /առավելագույնը 12 նկար/,
  );
});
