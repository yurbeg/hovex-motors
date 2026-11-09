import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppRoute, resolveCatalogLotId } from "../src/appRoute";

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
    "/administrator",
    "/admin-old",
  ]) {
    assert.equal(resolveAppRoute(pathname), "home", pathname);
  }
});
