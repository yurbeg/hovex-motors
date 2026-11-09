import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Vehicle } from "../src/domain/vehicle";
import { VehiclesPage } from "../src/frontend/admin/pages/VehiclesPage";
import { VehiclePricingFields } from "../src/frontend/admin/vehicles/VehiclePricingFields";
import {
  emptyVehicle,
  type VehicleFieldUpdater,
} from "../src/frontend/admin/vehicles/vehicleEditorModel";

const ignoreUpdate: VehicleFieldUpdater = () => () => {};

const vehicle: Vehicle = {
  ...emptyVehicle,
  id: "test-car-2026",
  make: "Test",
  model: "Car",
  year: 2026,
  estimateMin: 10_000,
  estimateMax: 12_000,
  maxBid: 8_000,
  inventoryStatus: "available",
  sortOrder: 0,
  createdAt: "2026-11-09T00:00:00.000Z",
  updatedAt: "2026-11-09T01:00:00.000Z",
};

test("vehicle editor exposes every inventory status separately from publication", () => {
  const html = renderToStaticMarkup(
    <VehiclePricingFields
      form={{ ...emptyVehicle, inventoryStatus: "in_transit" }}
      errors={{}}
      update={ignoreUpdate}
    />,
  );

  assert.match(html, /Մեքենայի գտնվելու վիճակ/);
  assert.match(html, /value="available"[^>]*>Առկա/);
  assert.match(html, /value="in_transit"[^>]*selected=""[^>]*>Ճանապարհին/);
  assert.match(html, /value="at_auction"[^>]*>Աճուրդում/);
  assert.match(html, /Հրապարակման վիճակ/);
});

test("admin vehicle list renders inventory summary, filter, and row badge", () => {
  const html = renderToStaticMarkup(
    <VehiclesPage
      vehicles={[vehicle]}
      onEdit={() => {}}
      onNew={() => {}}
      onChangeStatus={async () => {}}
      onToggleFeatured={async () => {}}
      onRefresh={() => {}}
      pendingVehicleId={null}
      refreshing={false}
    />,
  );

  assert.match(html, /1 առկա · 0 ճանապարհին · 0 աճուրդում/);
  assert.match(html, /Գտնվելու վիճակ/);
  assert.match(html, /Առկա/);
  assert.match(html, /Տեսանելիություն/);
});
