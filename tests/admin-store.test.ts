import assert from "node:assert/strict";
import test from "node:test";
import {
  getVehicles,
  resetVehicles,
  saveVehicles,
} from "../src/adminStore";

test("admin store supports the local demo inventory workflow", () => {
  const initialVehicles = resetVehicles();

  try {
    assert.equal(initialVehicles.length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.status === "published").length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.featured).length, 3);
    assert.ok(initialVehicles.every((vehicle) => (
      vehicle.images.length === 1 && vehicle.images[0] === vehicle.image
    )));
    assert.deepEqual(
      new Set(initialVehicles.map((vehicle) => vehicle.inventoryStatus)),
      new Set(["available", "in_transit", "at_auction"]),
    );

    const draft = {
      ...initialVehicles[0],
      id: "test-admin-vehicle",
      make: "Test",
      model: "Admin",
      status: "draft",
      inventoryStatus: "in_transit",
      featured: false,
    };
    saveVehicles([draft, ...initialVehicles]);
    assert.equal(getVehicles()[0].status, "draft");
    assert.equal(getVehicles()[0].inventoryStatus, "in_transit");

    const {
      inventoryStatus: _legacyInventoryStatus,
      images: _legacyImages,
      ...legacyVehicle
    } = initialVehicles[0];
    saveVehicles([{ ...legacyVehicle, id: "legacy-admin-vehicle" }]);
    assert.equal(getVehicles()[0].inventoryStatus, "at_auction");
    assert.deepEqual(getVehicles()[0].images, [legacyVehicle.image]);

    saveVehicles([{
      ...initialVehicles[0],
      id: "normalized-gallery",
      image: "/cover.jpg",
      images: [
        "/secondary.jpg",
        "/cover.jpg",
        "javascript:alert(1)",
        "/secondary.jpg",
        "https://cdn.example.test/third.webp",
      ],
    }]);
    assert.equal(getVehicles()[0].image, "/cover.jpg");
    assert.deepEqual(getVehicles()[0].images, [
      "/cover.jpg",
      "/secondary.jpg",
      "https://cdn.example.test/third.webp",
    ]);

  } finally {
    resetVehicles();
  }
});
