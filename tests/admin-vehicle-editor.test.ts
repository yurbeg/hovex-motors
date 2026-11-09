import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyVehicle,
  firstVehicleEditorErrorField,
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
