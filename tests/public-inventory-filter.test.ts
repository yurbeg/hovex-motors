import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  countPublicInventoryVehicles,
  filterPublicInventoryVehicles,
  normalizePublicInventoryFilter,
  publicInventoryFilterFromSearch,
  publicInventorySearchWithFilter,
  type PublicInventoryFilter,
} from "../src/application/publicInventory";
import type { Vehicle } from "../src/domain/vehicle";
import { SearchResults } from "../src/frontend/public/home/SearchResults";
import { DEFAULT_SEARCH_CRITERIA } from "../src/frontend/public/shared/types";

function vehicle(
  id: string,
  inventoryStatus: Vehicle["inventoryStatus"],
  status: Vehicle["status"] = "published",
): Vehicle {
  return {
    id,
    make: "Test",
    model: id,
    year: 2026,
    body: "Sedan",
    mileage: "1,000 mi",
    fuel: "Gasoline",
    damage: "None",
    auction: "Test source",
    estimateMin: 10_000,
    estimateMax: 12_000,
    maxBid: 8_000,
    image: "/test.jpg",
    images: ["/test.jpg"],
    imagePosition: "50% 50%",
    badge: "",
    accent: "yellow",
    status,
    inventoryStatus,
    featured: false,
    sortOrder: 0,
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
  };
}

const inventory: Vehicle[] = [
  vehicle("available-1", "available"),
  vehicle("transit-1", "in_transit"),
  vehicle("auction-1", "at_auction"),
  vehicle("available-2", "available"),
  vehicle("draft-available", "available", "draft"),
  vehicle("archived-auction", "at_auction", "archived"),
];

test("normalizes public inventory URL state and rejects unsupported values", () => {
  const supported: PublicInventoryFilter[] = [
    "all",
    "available",
    "in_transit",
    "at_auction",
  ];

  for (const filter of supported) {
    assert.equal(normalizePublicInventoryFilter(filter), filter);
    assert.equal(
      publicInventoryFilterFromSearch(`?inventory=${filter}`),
      filter,
    );
  }

  assert.equal(normalizePublicInventoryFilter(undefined), "all");
  assert.equal(publicInventoryFilterFromSearch(""), "all");
  assert.equal(publicInventoryFilterFromSearch("?inventory=unknown"), "all");
  assert.equal(publicInventoryFilterFromSearch("?inventory=AVAILABLE"), "all");
});

test("inventory URL state round-trips and preserves unrelated query params", () => {
  for (const filter of ["available", "in_transit", "at_auction"] as const) {
    const search = publicInventorySearchWithFilter("?q=Camry&page=2", filter);
    assert.equal(publicInventoryFilterFromSearch(search), filter);
    assert.equal(new URLSearchParams(search).get("q"), "Camry");
    assert.equal(new URLSearchParams(search).get("page"), "2");
  }

  assert.equal(
    publicInventorySearchWithFilter(
      "?q=Camry&inventory=available&inventory=at_auction&page=2",
      "in_transit",
    ),
    "?q=Camry&inventory=in_transit&page=2",
  );
  assert.equal(
    publicInventorySearchWithFilter("?inventory=available&q=Camry", "all"),
    "?q=Camry",
  );
  assert.equal(publicInventorySearchWithFilter("", "all"), "");
});

test("filters each public inventory state and never exposes unpublished cars", () => {
  assert.deepEqual(
    filterPublicInventoryVehicles(inventory, "all").map(({ id }) => id),
    ["available-1", "transit-1", "auction-1", "available-2"],
  );
  assert.deepEqual(
    filterPublicInventoryVehicles(inventory, "available").map(({ id }) => id),
    ["available-1", "available-2"],
  );
  assert.deepEqual(
    filterPublicInventoryVehicles(inventory, "in_transit").map(({ id }) => id),
    ["transit-1"],
  );
  assert.deepEqual(
    filterPublicInventoryVehicles(inventory, "at_auction").map(({ id }) => id),
    ["auction-1"],
  );

  assert.deepEqual(
    filterPublicInventoryVehicles(
      inventory,
      "unsupported" as PublicInventoryFilter,
    ).map(({ id }) => id),
    ["available-1", "transit-1", "auction-1", "available-2"],
  );
});

test("counts each status from the complete published inventory", () => {
  assert.deepEqual(countPublicInventoryVehicles(inventory), {
    all: 4,
    available: 2,
    in_transit: 1,
    at_auction: 1,
  });

  const filtered = filterPublicInventoryVehicles(inventory, "available");
  assert.deepEqual(countPublicInventoryVehicles(inventory), {
    all: 4,
    available: 2,
    in_transit: 1,
    at_auction: 1,
  });
  assert.equal(filtered.length, 2);
});

test("home results present available inventory without the legacy status filter", () => {
  const html = renderToStaticMarkup(createElement(SearchResults, {
    results: [inventory[0]],
    state: "idle",
    criteria: DEFAULT_SEARCH_CRITERIA,
    compared: [],
    onCompare: () => {},
    onConsultation: () => {},
    onReset: () => {},
  }));

  assert.match(html, /Hovex-ում առկա/);
  assert.match(html, /Copart կատալոգը/);
  assert.doesNotMatch(html, /Ֆիլտրել մեքենաներն ըստ գտնվելու վիճակի/);
  assert.doesNotMatch(html, />Ճանապարհին</);
  assert.doesNotMatch(html, />Աճուրդում</);
});
