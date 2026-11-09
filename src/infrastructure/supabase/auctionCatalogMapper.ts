import type {
  AuctionCatalogFacets,
  AuctionCatalogLot,
} from "../../domain/auctionCatalog";
import { EMPTY_AUCTION_CATALOG_FACETS } from "../../domain/auctionCatalog";

function asRecord(value: unknown, label = "MotorAPIs catalog row"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as Record<string, unknown>;
}

function requiredIdentifier(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) {
    throw new Error(`MotorAPIs catalog row has an invalid ${key}`);
  }
  return String(value).trim();
}

function nullableText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function nullableNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(row: Record<string, unknown>, key: string): number {
  const value = nullableNumber(row, key);
  if (value === null) throw new Error(`MotorAPIs catalog row has an invalid ${key}`);
  return value;
}

function nullableDate(row: Record<string, unknown>, key: string): string | null {
  const value = nullableText(row, key);
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function requiredDate(row: Record<string, unknown>, key: string): string {
  const value = nullableDate(row, key);
  if (!value) throw new Error(`MotorAPIs catalog row has an invalid ${key}`);
  return value;
}

function photoArray(value: unknown): string[] {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      candidate = [candidate];
    }
  }
  if (!Array.isArray(candidate)) return [];

  const seen = new Set<string>();
  return candidate.flatMap((item) => {
    if (typeof item !== "string") return [];
    const raw = item.trim();
    if (!raw || seen.has(raw)) return [];
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    } catch {
      return [];
    }
    seen.add(raw);
    return [raw];
  });
}

function characteristicsRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function mapAuctionCatalogRow(value: unknown): AuctionCatalogLot {
  const row = asRecord(value);
  const currency = nullableText(row, "currency");

  return {
    id: requiredIdentifier(row, "id"),
    providerVehicleId: requiredIdentifier(row, "provider_vehicle_id"),
    providerLotId: requiredIdentifier(row, "provider_lot_id"),
    sourceDomainId: requiredNumber(row, "source_domain_id"),
    sourceSlug: requiredIdentifier(row, "source_slug"),
    lotNumber: nullableText(row, "lot_number"),
    title: nullableText(row, "title"),
    vin: nullableText(row, "vin"),
    year: nullableNumber(row, "year"),
    make: nullableText(row, "make"),
    model: nullableText(row, "model"),
    generation: nullableText(row, "generation"),
    bodyType: nullableText(row, "body_type"),
    color: nullableText(row, "color"),
    engine: nullableText(row, "engine"),
    transmission: nullableText(row, "transmission"),
    driveWheel: nullableText(row, "drive_wheel"),
    vehicleType: nullableText(row, "vehicle_type"),
    fuelType: nullableText(row, "fuel_type"),
    cylinders: nullableNumber(row, "cylinders"),
    odometerValue: nullableNumber(row, "odometer_value"),
    odometerUnit: nullableText(row, "odometer_unit"),
    odometerStatus: nullableText(row, "odometer_status"),
    primaryDamage: nullableText(row, "primary_damage"),
    secondaryDamage: nullableText(row, "secondary_damage"),
    location: nullableText(row, "location"),
    saleDate: nullableDate(row, "sale_date"),
    status: nullableText(row, "status"),
    currentBid: nullableNumber(row, "current_bid"),
    currentBidUpdatedAt: nullableDate(row, "current_bid_updated_at"),
    buyNowPrice: nullableNumber(row, "buy_now_price"),
    buyNowUpdatedAt: nullableDate(row, "buy_now_updated_at"),
    currency: currency?.toUpperCase() ?? null,
    photoUrls: photoArray(row.photo_urls),
    providerUpdatedAt: nullableDate(row, "provider_updated_at"),
    fetchedAt: requiredDate(row, "fetched_at"),
    characteristics: characteristicsRecord(row.characteristics),
    searchText: nullableText(row, "search_text") ?? "",
  };
}

function unwrapFacetPayload(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    if (value.length === 1) return asRecord(value[0], "MotorAPIs facet response");
    return {};
  }
  if (!value) return {};
  return asRecord(value, "MotorAPIs facet response");
}

function uniqueTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
    .map((item) => String(item).trim())
    .filter(Boolean);
  return [...new Set(items)].sort((left, right) => left.localeCompare(right, "hy"));
}

function yearArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const years = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1886 && item <= 2100);
  return [...new Set(years)].sort((left, right) => right - left);
}

export function mapAuctionCatalogFacets(value: unknown): AuctionCatalogFacets {
  const payload = unwrapFacetPayload(value);
  if (!Object.keys(payload).length) return { ...EMPTY_AUCTION_CATALOG_FACETS };

  return {
    makes: uniqueTextArray(payload.makes),
    models: uniqueTextArray(payload.models),
    years: yearArray(payload.years),
    bodyTypes: uniqueTextArray(payload.bodyTypes ?? payload.body_types),
    fuelTypes: uniqueTextArray(payload.fuelTypes ?? payload.fuel_types),
    transmissions: uniqueTextArray(payload.transmissions),
    driveWheels: uniqueTextArray(payload.driveWheels ?? payload.drive_wheels),
  };
}
