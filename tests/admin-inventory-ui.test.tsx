import assert from "node:assert/strict";
import test from "node:test";
import React, { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Vehicle } from "../src/domain/vehicle";
import { VehiclesPage } from "../src/frontend/admin/pages/VehiclesPage";
import { VehiclePricingFields } from "../src/frontend/admin/vehicles/VehiclePricingFields";
import { VehicleImageField } from "../src/frontend/admin/vehicles/VehicleImageField";
import { VehiclePreview } from "../src/frontend/admin/vehicles/VehiclePreview";
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
  image: "/assets/test.jpg",
  images: ["/assets/test.jpg"],
  inventoryStatus: "available",
  sortOrder: 0,
  createdAt: "2026-11-09T00:00:00.000Z",
  updatedAt: "2026-11-09T01:00:00.000Z",
};

test("vehicle editor locks manual creation to available inventory", () => {
  const html = renderToStaticMarkup(
    <VehiclePricingFields
      form={{ ...emptyVehicle }}
      errors={{}}
      update={ignoreUpdate}
    />,
  );

  assert.match(html, /Մեքենայի գտնվելու վիճակ/);
  assert.match(html, /Առկա/);
  assert.match(html, /Copart API/);
  assert.doesNotMatch(html, /name="inventoryStatus"/);
  assert.doesNotMatch(html, /<option[^>]*value="at_auction"/);
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

test("vehicle image editor supports ordered existing and multiple queued images", () => {
  const selectedFiles = [
    new File([new Uint8Array(4)], "front.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(5)], "side.webp", { type: "image/webp" }),
  ];
  const html = renderToStaticMarkup(
    <VehicleImageField
      form={{
        ...emptyVehicle,
        image: "/assets/cover.jpg",
        images: ["/assets/cover.jpg", "/assets/rear.jpg"],
      }}
      errors={{}}
      update={ignoreUpdate}
      existingImageUrls={["/assets/cover.jpg", "/assets/rear.jpg"]}
      selectedImageFiles={selectedFiles}
      selectedImagePreviewUrls={["blob:front", "blob:side"]}
      fileInputRef={createRef<HTMLInputElement>()}
      onSelectImages={() => {}}
      onClearSelectedImages={() => {}}
      onRemoveSelectedImage={() => {}}
      onRemoveExistingImage={() => {}}
      onMakeExistingImageCover={() => {}}
    />,
  );

  assert.match(html, /type="file"[^>]*multiple=""/);
  assert.match(html, /4 \/ 12/);
  assert.match(html, /front\.jpg/);
  assert.match(html, /side\.webp/);
  assert.match(html, /Պահպանված նկարներ/);
  assert.match(html, /Մեքենայի նկար 1/);
  assert.match(html, /Դարձնել 2-րդ նկարը գլխավոր/);
  assert.match(html, /Հեռացնել պահպանված 1-րդ նկարը/);
  assert.doesNotMatch(html, /Կամ գլխավոր նկարի հասցե|https:\/\/\.\.\./);
});

test("new vehicle preview has no demo cover and uses the first queued image", () => {
  const emptyHtml = renderToStaticMarkup(
    <VehiclePreview
      form={{ ...emptyVehicle }}
      existingImageUrls={[]}
      selectedImagePreviewUrls={[]}
    />,
  );
  const queuedHtml = renderToStaticMarkup(
    <VehiclePreview
      form={{ ...emptyVehicle }}
      existingImageUrls={[]}
      selectedImagePreviewUrls={["blob:first", "blob:second"]}
    />,
  );

  assert.match(emptyHtml, /Նկար դեռ ընտրված չէ/);
  assert.doesNotMatch(emptyHtml, /kia-forte-lxs/);
  assert.match(queuedHtml, /src="blob:first"/);
  assert.match(queuedHtml, /2 նկար/);
});
