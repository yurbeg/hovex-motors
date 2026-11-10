import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Vehicle } from "../src/domain/vehicle";
import { VehicleCard } from "../src/frontend/public/vehicles/VehicleCard";
import { VehicleDetailsContent } from "../src/frontend/public/vehicles/VehicleDetailsPage";
import {
  VehicleProductActions,
  vehicleWhatsappUrl,
} from "../src/frontend/public/vehicles/VehicleProductActions";

const vehicle: Vehicle = {
  id: "test-car-2026",
  make: "Test",
  model: "Car",
  year: 2026,
  body: "Սեդան",
  mileage: "10 000 մղոն",
  fuel: "Բենզին",
  damage: "Թեթև վնասվածք",
  auction: "Copart",
  estimateMin: 10_000,
  estimateMax: 12_000,
  maxBid: 8_000,
  image: "/cover.jpg",
  images: ["/cover.jpg", "/second.jpg"],
  imagePosition: "50% 40%",
  badge: "Hovex-ի առաջարկ",
  accent: "yellow",
  status: "published",
  inventoryStatus: "available",
  featured: true,
  sortOrder: 1,
  createdAt: "2026-11-10T08:00:00.000Z",
  updatedAt: "2026-11-10T09:00:00.000Z",
};

test("vehicle detail content shows the ordered gallery, pricing, and specifications", () => {
  const html = renderToStaticMarkup(
    <VehicleDetailsContent vehicle={vehicle} onRequest={() => {}} />,
  );

  assert.match(html, /2026 Test Car/);
  assert.match(html, /src="\/cover.jpg"/);
  assert.match(html, />1 \/ 2</);
  assert.match(html, /Հայաստան հասցնելու նախնական արժեք/);
  assert.match(html, /Առաջարկվող առավելագույն խաղադրույք/);
  assert.match(html, /Մեքենայի բնութագրերը/);
  assert.match(html, /Ինչպես է ձևավորվում արժեքը/);
  assert.match(html, /aria-label="Մեքենայի գործողություններ"/);
});

test("the full vehicle card deep-links to the detail page without covering its actions", () => {
  const html = renderToStaticMarkup(
    <VehicleCard
      vehicle={{ ...vehicle, id: "car/id 1" }}
      isCompared={false}
      onCompare={() => {}}
      onConsultation={() => {}}
    />,
  );

  assert.match(html, /href="\/vehicles\/car%2Fid%201"/);
  assert.match(html, /class="absolute inset-0 z-\[1\][^"]*"/);
  assert.match(html, /aria-label="Բացել 2026 Test Car-ի մանրամասները"/);
  assert.equal((html.match(/href="\/vehicles\/car%2Fid%201"/g) || []).length, 1);
  assert.match(html, /<button[^>]*z-\[2\][^>]*>[^<]*<span>Խորհրդակցել<\/span>/);
  assert.match(html, /src="\/cover.jpg"/);
  assert.match(html, /Մանրամասներ/);
});

test("inventory actions create vehicle-specific WhatsApp copy and a safe-area mobile bar", () => {
  const url = new URL(vehicleWhatsappUrl(vehicle));
  const message = url.searchParams.get("text") || "";
  const html = renderToStaticMarkup(
    <VehicleProductActions vehicle={vehicle} onRequest={() => {}} variant="mobile" />,
  );

  assert.match(message, /Մեքենա՝ 2026 Test Car/);
  assert.match(message, /Hovex ID՝ test-car-2026/);
  assert.doesNotMatch(message, /Lot ID|VIN/);
  assert.match(html, /aria-label="Մեքենայի արագ գործողություններ"/);
  assert.match(html, /grid-cols-4/);
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  assert.match(html, /href="tel:\+37433344366"/);
});
