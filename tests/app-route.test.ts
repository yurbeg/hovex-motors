import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppRoute } from "../src/appRoute";

test("resolves the catalog route and its nested paths", () => {
  assert.equal(resolveAppRoute("/catalog"), "catalog");
  assert.equal(resolveAppRoute("/catalog/"), "catalog");
  assert.equal(resolveAppRoute("/catalog/vehicle-id"), "catalog");
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
