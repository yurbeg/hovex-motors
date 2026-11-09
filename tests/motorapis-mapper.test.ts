import assert from "node:assert/strict";
import test from "node:test";
import {
  MotorApisPayloadError,
  normalizeArchivePayload,
  normalizeImageUrls,
  normalizeVehiclePayload,
} from "../supabase/functions/_shared/motorapis-mapper";

const fetchedAt = "2026-11-06T10:00:00.000Z";

test("vehicle and lot mapping keeps nullable money and prefers documented image tiers", () => {
  const mapped = normalizeVehiclePayload({
    id: "001",
    vin: null,
    title: "2022 Toyota Camry",
    year: "2022",
    manufacturer: { id: 140, name: "Toyota" },
    model: { id: 50, name: "Camry" },
    generation: null,
    engine: { id: 11, name: "2.5L I4" },
    fuel: { id: 4, name: "Gasoline" },
    cylinders: "4",
    custom_vehicle_spec: "preserved",
    lots: [{
      id: "7001",
      lot: 12345678,
      domain: { id: "3", name: "copart_com" },
      status: { id: 4, name: "On approval" },
      bid: "1250.50",
      bid_updated_at: "2026-11-06T08:55:00Z",
      buy_now: 0,
      buy_now_updated_at: "2026-11-06T08:56:00Z",
      final_bid: "0",
      final_bid_updated_at: "2026-11-06T08:57:00Z",
      seller_reserve: { price: "0", updated_at: "2026-11-06T08:58:00Z" },
      currency: "dollars",
      sale_date: "2026-11-07T12:00:00Z",
      sale_date_updated_at: "2026-11-06T08:59:00Z",
      odometer: { km: "16093.4", mi: "10000", status: { id: 1, name: "Actual" } },
      damage: {
        main: { id: 1, name: "Front End" },
        second: { id: 2, name: "Minor Dent/Scratches" },
      },
      location: {
        raw: "CA - Los Angeles",
        location: { id: 5, name: "Los Angeles yard" },
        city: { id: 6, name: "Los Angeles" },
        state: { id: 7, code: "CA", name: "California" },
        country: { id: 8, name: "US" },
      },
      images: {
        downloaded: ["https://cdn.example/downloaded-1.jpg"],
        big: ["https://cdn.example/big-duplicate.jpg"],
        small: ["https://cdn.example/small.jpg"],
      },
      updated_at: "2026-11-06T09:00:00Z",
    }],
  }, fetchedAt);

  assert.equal(mapped.vehicle.providerVehicleId, "1");
  assert.equal(mapped.vehicle.year, 2022);
  assert.equal(mapped.vehicle.manufacturerName, "Toyota");
  assert.equal(mapped.vehicle.fuelType, "Gasoline");
  assert.equal(mapped.vehicle.engineName, "2.5L I4");
  assert.equal(mapped.vehicle.cylinders, 4);
  assert.equal(mapped.vehicle.characteristics.custom_vehicle_spec, "preserved");
  assert.equal(mapped.lots.length, 1);
  const lot = mapped.lots[0]!;
  assert.equal(lot.currentBid, 1250.5);
  assert.equal(lot.currentBidUpdatedAt, "2026-11-06T08:55:00.000Z");
  assert.equal(lot.buyNow, null);
  assert.equal(lot.buyNowUpdatedAt, null);
  assert.equal(lot.finalBid, null);
  assert.equal(lot.finalBidUpdatedAt, null);
  assert.equal(lot.sellerReserve, null);
  assert.equal(lot.sellerReserveUpdatedAt, null);
  assert.equal(lot.currency, null);
  assert.equal(lot.odometerMi, 10_000);
  assert.equal(lot.odometerKm, 16_093.4);
  assert.equal(lot.odometerStatus, "Actual");
  assert.equal(lot.primaryDamage, "Front End");
  assert.equal(lot.secondaryDamage, "Minor Dent/Scratches");
  assert.deepEqual(lot.imageUrls, ["https://cdn.example/downloaded-1.jpg"]);
  assert.equal(lot.locationStateCode, "CA");
  assert.equal(lot.locationName, "CA - Los Angeles");
  assert.equal(lot.locationCity, "Los Angeles");
  assert.equal(lot.locationCountry, "US");
  assert.equal(lot.saleDateUpdatedAt, "2026-11-06T08:59:00.000Z");
  assert.equal("images" in lot.characteristics, false);
  assert.equal("location" in lot.characteristics, false);
  assert.equal("damage" in lot.characteristics, false);
  assert.equal("odometer" in lot.characteristics, false);
});

test("zero current bid is preserved as a no-bid state while zero sale prices stay absent", () => {
  const mapped = normalizeVehiclePayload({
    id: 2,
    year: 1800,
    cylinders: 0,
    lots: [{
      id: 20,
      lot: "20",
      domain: { id: 3, name: "copart_com" },
      bid: 0,
      buy_now: "0",
      final_bid: 0,
      seller_reserve: { price: 0, updated_at: null },
      location: { location: { name: "Nested yard" } },
    }],
  }, fetchedAt);
  const lot = mapped.lots[0]!;
  assert.equal(mapped.vehicle.year, null);
  assert.equal(mapped.vehicle.cylinders, null);
  assert.equal(lot.currentBid, 0);
  assert.equal(lot.buyNow, null);
  assert.equal(lot.finalBid, null);
  assert.equal(lot.sellerReserve, null);
  assert.equal(lot.locationName, "Nested yard");
});

test("invalid identities are rejected and out-of-range provider numbers become null", () => {
  assert.throws(
    () => normalizeVehiclePayload({ id: 0, lots: [] }, fetchedAt),
    MotorApisPayloadError,
  );
  assert.throws(
    () => normalizeVehiclePayload({
      id: 1,
      lots: [{ id: "000", domain: { id: 3, name: "copart_com" } }],
    }, fetchedAt),
    MotorApisPayloadError,
  );

  const mapped = normalizeVehiclePayload({
    id: 1,
    year: 2201,
    cylinders: 33,
    lots: [{
      id: 10,
      domain: { id: 3, name: "copart_com" },
      bid: -1,
      buy_now: -2,
      final_bid: -3,
      seller_reserve: { price: -4 },
      odometer: { mi: -10, km: "-16.09" },
    }],
  }, fetchedAt);

  assert.equal(mapped.vehicle.year, null);
  assert.equal(mapped.vehicle.cylinders, null);
  assert.equal(mapped.lots[0]?.currentBid, null);
  assert.equal(mapped.lots[0]?.buyNow, null);
  assert.equal(mapped.lots[0]?.finalBid, null);
  assert.equal(mapped.lots[0]?.sellerReserve, null);
  assert.equal(mapped.lots[0]?.odometerMi, null);
  assert.equal(mapped.lots[0]?.odometerKm, null);
});

test("image normalization accepts both documented object and observed array shapes", () => {
  assert.deepEqual(normalizeImageUrls([
    "https://cdn.example/one.jpg",
    { url: "https://cdn.example/two.jpg" },
    "not-a-url",
    "https://cdn.example/one.jpg",
  ]), [
    "https://cdn.example/one.jpg",
    "https://cdn.example/two.jpg",
  ]);
  assert.deepEqual(normalizeImageUrls(null), []);
  assert.deepEqual(normalizeImageUrls({ small: [] }), []);
});

test("observed AuctionsAPI vehicle shape tolerates nullable taxonomy and rich lot metadata", () => {
  const mapped = normalizeVehiclePayload({
    id: 501,
    year: 2020,
    title: "Synthetic vehicle",
    vin: "SYNTHETICVIN00001",
    manufacturer: null,
    model: null,
    generation: null,
    body_type: { id: 10, name: "Sedan" },
    color: { id: 20, name: "Silver" },
    engine: { id: 30, name: "Synthetic engine" },
    transmission: null,
    drive_wheel: null,
    vehicle_type: { id: 40, name: "Automobile" },
    fuel: null,
    cylinders: null,
    lots: [{
      id: 9_001,
      lot: "SYNTHETIC-LOT",
      domain: { id: 3, name: "copart_com" },
      odometer: {
        km: null,
        mi: null,
        status: { id: 1, name: "Not actual" },
      },
      bid: 750,
      buy_now: 2_500,
      final_bid: null,
      seller_reserve: null,
      currency: " eur ",
      status: { id: 2, name: "Upcoming" },
      title: { id: 3, code: null, name: "Synthetic title" },
      detailed_title: { id: 4, code: null, name: "Synthetic detailed title" },
      damage: {
        main: { id: 5, name: "Synthetic damage" },
        second: null,
      },
      condition: { id: 6, name: "Synthetic condition" },
      images: {
        id: 7,
        small: ["https://cdn.example/small.jpg"],
        normal: ["https://cdn.example/normal.jpg"],
        big: ["https://cdn.example/big.jpg"],
        downloaded: ["https://cdn.example/downloaded.jpg"],
        exterior: null,
        interior: null,
        video: null,
      },
      location: {
        country: { iso: "ZZ", name: "Synthetic country" },
        state: { id: 8, code: "ST", name: "Synthetic state" },
        city: { id: 9, name: "Synthetic city" },
        location: { id: 10, name: "Synthetic yard" },
        latitude: 1,
        longitude: 2,
        postal_code: "00000",
        raw: "Synthetic location",
      },
      tags: ["synthetic-tag"],
      selling_branch: {
        id: 11,
        name: "Synthetic branch",
        domain_id: 3,
      },
      auction_type: { id: 12, name: "Synthetic auction" },
    }],
  }, fetchedAt);

  assert.equal(mapped.vehicle.manufacturerName, null);
  assert.equal(mapped.vehicle.modelName, null);
  assert.equal(mapped.vehicle.generationName, null);
  assert.equal(mapped.vehicle.bodyType, "Sedan");
  assert.equal(mapped.vehicle.color, "Silver");
  assert.equal(mapped.vehicle.vehicleType, "Automobile");
  assert.equal(mapped.vehicle.engineName, "Synthetic engine");

  const lot = mapped.lots[0]!;
  assert.equal(lot.odometerKm, null);
  assert.equal(lot.odometerMi, null);
  assert.equal(lot.currency, "EUR");
  assert.equal(lot.locationCountry, "Synthetic country");
  assert.equal(lot.locationStateCode, "ST");
  assert.deepEqual(lot.imageUrls, ["https://cdn.example/downloaded.jpg"]);
  assert.deepEqual(lot.characteristics.tags, ["synthetic-tag"]);
  assert.deepEqual(lot.characteristics.auction_type, {
    id: 12,
    name: "Synthetic auction",
  });
});

test("current archive shape maps timestamped prices and source-qualified identity", () => {
  const event = normalizeArchivePayload({
    lot_id: 7001,
    car_id: 101,
    lot: "12345678",
    domain: { id: 3, name: "copart_com" },
    status: { id: 9, name: "Sold" },
    archived_at: "2026-11-06T09:55:00Z",
    bid: { value: "2400", updated_at: "2026-11-06T09:40:00Z" },
    buy_now: { value: null, updated_at: null },
    final_bid: { value: "2750.25", updated_at: "2026-11-06T09:50:00Z" },
    currency: " gbp ",
    sale_date: {
      value: "2026-11-06T09:45:00Z",
      updated_at: "2026-11-06T09:46:00Z",
    },
  }, fetchedAt);

  assert.ok(event);
  assert.equal(event.sourceDomainId, 3);
  assert.equal(event.providerLotId, "7001");
  assert.equal(event.currentBid, 2400);
  assert.equal(event.buyNow, null);
  assert.equal(event.finalBid, 2750.25);
  assert.equal(event.finalBidUpdatedAt, "2026-11-06T09:50:00.000Z");
  assert.equal(event.currency, "GBP");
  assert.equal(event.saleDate, "2026-11-06T09:45:00.000Z");
});

test("legacy archive bid stays a current bid and is never promoted to final price", () => {
  const event = normalizeArchivePayload({
    lot_id: "7002",
    domain: { id: 3, name: "copart_com" },
    status: { id: 8, name: "Removed" },
    bid: "3100",
    currency: "US$",
    sale_date: "2026-11-06T08:00:00Z",
    final_bid_updated_at: "2026-11-06T08:05:00Z",
  }, fetchedAt);

  assert.ok(event);
  assert.equal(event.currentBid, 3100);
  assert.equal(event.currentBidUpdatedAt, null);
  assert.equal(event.finalBid, null);
  assert.equal(event.finalBidUpdatedAt, null);
  assert.equal(event.currency, null);
});

test("archive events from other sources are ignored and malformed Copart data blocks checkpointing", () => {
  assert.equal(normalizeArchivePayload({
    lot_id: 90,
    domain: { id: 1, name: "iaai_com" },
  }, fetchedAt), null);

  assert.throws(
    () => normalizeArchivePayload({ domain: { id: 3, name: "copart_com" } }, fetchedAt),
    MotorApisPayloadError,
  );
  assert.throws(
    () => normalizeVehiclePayload({
      id: 1,
      lots: [{ domain: { id: 3, name: "copart_com" } }],
    }, fetchedAt),
    MotorApisPayloadError,
  );
});
