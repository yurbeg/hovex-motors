import assert from "node:assert/strict";
import test from "node:test";
import {
  addLead,
  getLeads,
  getVehicles,
  resetVehicles,
  saveLeads,
  saveVehicles,
} from "../src/adminStore";

test("admin store supports inventory and lead workflows", () => {
  const initialVehicles = resetVehicles();
  const initialLeads = getLeads();

  try {
    assert.equal(initialVehicles.length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.status === "published").length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.featured).length, 3);
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

    const { inventoryStatus: _legacyInventoryStatus, ...legacyVehicle } = initialVehicles[0];
    saveVehicles([{ ...legacyVehicle, id: "legacy-admin-vehicle" }]);
    assert.equal(getVehicles()[0].inventoryStatus, "at_auction");

    const lead = addLead({
      name: "Test Lead",
      phone: "+374 99 000 000",
      method: "WhatsApp",
      date: "2026-11-10",
      time: "10:00–13:00",
      vehicleLabel: "Test Admin",
    });
    assert.equal(lead.status, "new");
    assert.equal(getLeads()[0].name, "Test Lead");
  } finally {
    resetVehicles();
    saveLeads(initialLeads);
  }
});
