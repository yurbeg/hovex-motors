import assert from "node:assert/strict";
import test from "node:test";
import {
  auctionCatalogSearchFromState,
  auctionCatalogStateFromSearch,
} from "../src/application/auctionCatalog";
import {
  auctionLotLeadContext,
  DEFAULT_AUCTION_CATALOG_FILTERS,
} from "../src/domain/auctionCatalog";
import {
  mapAuctionCatalogFacets,
  mapAuctionCatalogRow,
} from "../src/infrastructure/supabase/auctionCatalogMapper";
import { escapeCatalogLikePattern } from "../src/infrastructure/supabase/auctionCatalogRepository";
import { formatAuctionMoney } from "../src/frontend/public/catalog/auctionCatalogFormatters";

const row = {
  id: "copart-123",
  provider_vehicle_id: "vehicle-45",
  provider_lot_id: "lot-123",
  source_domain_id: 3,
  source_slug: "copart",
  lot_number: "123",
  title: "2022 Test Car",
  vin: null,
  year: 2022,
  make: "Test",
  model: "Car",
  generation: null,
  body_type: "Sedan",
  color: null,
  engine: null,
  transmission: "Automatic",
  drive_wheel: null,
  vehicle_type: "Automobile",
  fuel_type: "Gasoline",
  cylinders: null,
  odometer_value: 10_500,
  odometer_unit: "mi",
  odometer_status: null,
  primary_damage: "Front end",
  secondary_damage: null,
  location: "CA",
  sale_date: "2026-11-10T12:00:00.000Z",
  status: "active",
  current_bid: null,
  current_bid_updated_at: null,
  buy_now_price: "12500.50",
  buy_now_updated_at: "2026-11-06T10:00:00.000Z",
  currency: "usd",
  photo_urls: ["https://images.example.test/1.jpg", "javascript:alert(1)", "https://images.example.test/1.jpg"],
  provider_updated_at: null,
  fetched_at: "2026-11-06T10:05:00.000Z",
  characteristics: { keys: 2 },
  search_text: "2022 test car 123",
};

test("maps nullable prices and safe photo URLs without inventing zeroes", () => {
  const lot = mapAuctionCatalogRow(row);
  assert.equal(lot.currentBid, null);
  assert.equal(lot.buyNowPrice, 12500.5);
  assert.equal(lot.currency, "USD");
  assert.deepEqual(lot.photoUrls, ["https://images.example.test/1.jpg"]);
  assert.deepEqual(lot.characteristics, { keys: 2 });
});

test("builds submission-ready lot metadata from the customer-facing identifiers", () => {
  const lot = mapAuctionCatalogRow({
    ...row,
    lot_number: " 99887766 ",
    vin: " 1N4AL3AP8JC123456 ",
  });

  assert.deepEqual(auctionLotLeadContext(lot), {
    vehicleId: "copart-123",
    vehicleLabel: "2022 Test Car",
    lotId: "99887766",
    vin: "1N4AL3AP8JC123456",
  });
});

test("falls back to the provider lot id and preserves an unavailable VIN as null", () => {
  const lot = mapAuctionCatalogRow({
    ...row,
    lot_number: null,
    vin: "   ",
  });

  assert.deepEqual(auctionLotLeadContext(lot), {
    vehicleId: "copart-123",
    vehicleLabel: "2022 Test Car",
    lotId: "lot-123",
    vin: null,
  });
});

test("normalizes facet payloads and supports snake-case JSON keys", () => {
  const facets = mapAuctionCatalogFacets({
    makes: ["Toyota", "BMW", "Toyota"],
    models: ["Camry"],
    years: [2024, "2022", "invalid"],
    body_types: ["Sedan"],
    fuel_types: ["Gasoline"],
    transmissions: ["Automatic"],
    drive_wheels: ["FWD"],
  });
  assert.deepEqual(facets.makes, ["BMW", "Toyota"]);
  assert.deepEqual(facets.years, [2024, 2022]);
  assert.deepEqual(facets.bodyTypes, ["Sedan"]);
  assert.deepEqual(facets.driveWheels, ["FWD"]);
});

test("catalog URL state round-trips supported filters and page", () => {
  const filters = {
    ...DEFAULT_AUCTION_CATALOG_FILTERS,
    query: "Camry",
    make: "Toyota",
    model: "Camry",
    yearFrom: "2020",
    bodyType: "Sedan",
    sort: "bid-asc" as const,
  };
  const search = auctionCatalogSearchFromState(filters, 3);
  assert.deepEqual(auctionCatalogStateFromSearch(search), { filters, page: 3 });
  assert.deepEqual(auctionCatalogStateFromSearch("?page=-2&sort=unknown").filters, DEFAULT_AUCTION_CATALOG_FILTERS);
});

test("formatting preserves missing prices and never assumes a currency", () => {
  assert.equal(formatAuctionMoney(null, "USD"), "Հասանելի չէ");
  assert.match(formatAuctionMoney(1000, null), /արժույթը նշված չէ/);
  assert.match(formatAuctionMoney(1000, "USD"), /1.*000/);
});

test("escapes wildcard characters in catalog search", () => {
  assert.equal(escapeCatalogLikePattern("50%_off\\today"), "50\\%\\_off\\\\today");
});
