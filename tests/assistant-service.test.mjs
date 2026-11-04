import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAssistantReply } from "../src/assistantService.js";
import { getVehicles, resetVehicles } from "../src/adminStore.js";
import { faqs } from "../src/data.js";

const vehicles = resetVehicles();
const ask = (message, inventory = vehicles) => buildLocalAssistantReply({ message, vehicles: inventory, faqs });

test("understands Armenian greetings", () => {
  const reply = ask("Բարև");
  assert.match(reply.text, /Բարև/);
  assert.equal(reply.mode, "local-demo");
});

test("recommends only in-budget published vehicles", () => {
  const reply = ask("Գտիր մեքենա մինչև $15,000");
  assert.deepEqual(new Set(reply.vehicleIds), new Set(["kia-forte-2021", "hyundai-elantra-2023"]));
  for (const id of reply.vehicleIds) {
    const vehicle = vehicles.find((item) => item.id === id);
    assert.equal(vehicle.status, "published");
    assert.ok(vehicle.estimateMax <= 15000);
  }
});

test("respects electric and year-range criteria", () => {
  const electric = ask("Էլեկտրական մեքենա մինչև $30,000");
  assert.ok(electric.vehicleIds.includes("deepal-sl03-2025"));
  assert.ok(electric.vehicleIds.includes("deepal-s05-2026"));
  assert.ok(electric.vehicleIds.every((id) => vehicles.find((item) => item.id === id).fuel === "Էլեկտրական"));

  const yearRange = ask("Մեքենա 2021–2023 թվականների");
  assert.ok(yearRange.vehicleIds.length > 0);
  assert.ok(yearRange.vehicleIds.every((id) => {
    const year = vehicles.find((item) => item.id === id).year;
    return year >= 2021 && year <= 2023;
  }));
});

test("does not relax a hard budget or expose archived inventory", () => {
  assert.deepEqual(ask("Մեքենա մինչև $7,000").vehicleIds, []);
  const inventory = vehicles.map((vehicle) => vehicle.id === "deepal-sl03-2025" ? { ...vehicle, status: "archived" } : vehicle);
  assert.ok(!ask("Էլեկտրական մեքենա մինչև $20,000", inventory).vehicleIds.includes("deepal-sl03-2025"));
  const statusless = vehicles.map(({ status, ...vehicle }) => vehicle);
  assert.deepEqual(ask("Մեքենա մինչև $15,000", statusless).vehicleIds, []);
});

test("answers grounded FAQ and process questions", () => {
  assert.match(ask("Kia-ի ցուցադրված գինը վերջնակա՞ն է").text, /^Ոչ/);
  assert.match(ask("Որքա՞ն է տևում ներմուծումը").text, /8–14 շաբաթ/);
  assert.match(ask("Ինչպե՞ս է աշխատում ներմուծման գործընթացը").text, /պահանջների հստակեցում/);
});

test("does not invent an AMD exchange rate", () => {
  const reply = ask("Մեքենա 8 միլիոն դրամ բյուջեով");
  assert.deepEqual(reply.vehicleIds, []);
  assert.match(reply.text, /live փոխարժեք չունի/);
});
