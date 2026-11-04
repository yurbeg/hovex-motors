import assert from "node:assert/strict";
import test from "node:test";
import {
  addLead,
  getLeads,
  getVehicles,
  resetVehicles,
  saveLeads,
  saveVehicles,
} from "../src/adminStore.js";

test("admin store supports inventory and lead workflows", () => {
  const initialVehicles = resetVehicles();
  const initialLeads = getLeads();

  try {
    assert.equal(initialVehicles.length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.status === "published").length, 7);
    assert.equal(initialVehicles.filter((vehicle) => vehicle.featured).length, 3);

    const draft = {
      ...initialVehicles[0],
      id: "test-admin-vehicle",
      make: "Test",
      model: "Admin",
      status: "draft",
      featured: false,
    };
    saveVehicles([draft, ...initialVehicles]);
    assert.equal(getVehicles()[0].status, "draft");

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
