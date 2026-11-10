import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAppRoute,
  resolveCatalogLotId,
  resolveVehicleId,
  vehicleDetailsPath,
} from "../src/appRoute";

test("resolves the catalog route and its nested paths", () => {
  assert.equal(resolveAppRoute("/catalog"), "catalog");
  assert.equal(resolveAppRoute("/catalog/"), "catalog");
  assert.equal(resolveAppRoute("/catalog/vehicle-id"), "catalog");
});

test("extracts one encoded catalog lot identifier without treating deeper paths as a lot", () => {
  assert.equal(resolveCatalogLotId("/catalog/copart%3Alot-123"), "copart:lot-123");
  assert.equal(resolveCatalogLotId("/catalog/copart-lot-123/"), "copart-lot-123");
  assert.equal(resolveCatalogLotId("/catalog"), null);
  assert.equal(resolveCatalogLotId("/catalog/lot/photos"), null);
  assert.equal(resolveCatalogLotId("/catalog/%E0%A4%A"), null);
});

test("resolves public vehicle detail routes and safely extracts one identifier", () => {
  assert.equal(resolveAppRoute("/vehicles/test-car-2026"), "vehicle");
  assert.equal(resolveAppRoute("/vehicles/test-car-2026/"), "vehicle");
  assert.equal(resolveVehicleId("/vehicles/copart%3Alot-123"), "copart:lot-123");
  assert.equal(resolveVehicleId("/vehicles/test-car-2026/"), "test-car-2026");
  assert.equal(resolveVehicleId("/vehicles"), null);
  assert.equal(resolveVehicleId("/vehicles/test-car/photos"), null);
  assert.equal(resolveVehicleId("/vehicles/%E0%A4%A"), null);
  assert.equal(vehicleDetailsPath("car/id 1"), "/vehicles/car%2Fid%201");
});

test("resolves the admin route and its nested paths", () => {
  assert.equal(resolveAppRoute("/admin"), "admin");
  assert.equal(resolveAppRoute("/admin/"), "admin");
  assert.equal(resolveAppRoute("/admin/vehicles"), "admin");
});

test("keeps home and lookalike paths on the public home app", () => {
  for (const pathname of [
    "/",
    "/about",
    "/catalogue",
    "/catalog-old",
    "/Catalog",
    "/vehicle/test-car",
    "/vehicles-old/test-car",
    "/Vehicles/test-car",
    "/administrator",
    "/admin-old",
  ]) {
    assert.equal(resolveAppRoute(pathname), "home", pathname);
  }
});
