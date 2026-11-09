import { MOTORAPIS_COPART_DOMAIN_ID } from "./motorapis-client.ts";

export class MotorApisPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotorApisPayloadError";
  }
}

export type NormalizedVehicle = {
  providerVehicleId: string;
  vin: string | null;
  title: string | null;
  year: number | null;
  manufacturerId: number | null;
  manufacturerName: string | null;
  modelId: number | null;
  modelName: string | null;
  generationId: number | null;
  generationName: string | null;
  vehicleType: string | null;
  bodyType: string | null;
  engineName: string | null;
  cylinders: number | null;
  fuelType: string | null;
  transmission: string | null;
  driveWheel: string | null;
  color: string | null;
  condition: string | null;
  documentTitle: string | null;
  characteristics: Record<string, unknown>;
  providerCreatedAt: string | null;
  providerUpdatedAt: string | null;
  fetchedAt: string;
  rawPayload: Record<string, unknown>;
};

export type NormalizedLot = {
  sourceDomainId: number;
  sourceDomainName: string;
  providerLotId: string;
  providerVehicleId: string;
  externalLotNumber: string | null;
  providerStatusId: number | null;
  providerStatusName: string | null;
  currentBid: number | null;
  currentBidUpdatedAt: string | null;
  buyNow: number | null;
  buyNowUpdatedAt: string | null;
  finalBid: number | null;
  finalBidUpdatedAt: string | null;
  sellerReserve: number | null;
  sellerReserveUpdatedAt: string | null;
  currency: string | null;
  saleDate: string | null;
  saleDateUpdatedAt: string | null;
  odometerKm: number | null;
  odometerMi: number | null;
  odometerStatus: string | null;
  primaryDamage: string | null;
  secondaryDamage: string | null;
  location: Record<string, unknown> | null;
  locationName: string | null;
  locationCity: string | null;
  locationStateCode: string | null;
  locationCountry: string | null;
  imageUrls: string[];
  buyerCountry: string | null;
  providerCreatedAt: string | null;
  providerUpdatedAt: string | null;
  archivedAt: string | null;
  characteristics: Record<string, unknown>;
  fetchedAt: string;
  rawPayload: Record<string, unknown>;
};

export type NormalizedVehicleWithLots = {
  vehicle: NormalizedVehicle;
  lots: NormalizedLot[];
};

export type NormalizedArchiveEvent = {
  sourceDomainId: number;
  sourceDomainName: string;
  providerLotId: string;
  providerVehicleId: string | null;
  externalLotNumber: string | null;
  providerStatusId: number | null;
  providerStatusName: string | null;
  archivedAt: string | null;
  saleDate: string | null;
  saleDateUpdatedAt: string | null;
  currentBid: number | null;
  currentBidUpdatedAt: string | null;
  buyNow: number | null;
  buyNowUpdatedAt: string | null;
  finalBid: number | null;
  finalBidUpdatedAt: string | null;
  sellerReserve: number | null;
  sellerReserveUpdatedAt: string | null;
  currency: string | null;
  buyerCountry: string | null;
  fetchedAt: string;
  rawPayload: Record<string, unknown>;
};

type EnumValue = {
  id: number | null;
  name: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function optionalCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[A-Za-z]{3}$/.test(normalized) ? normalized.toUpperCase() : null;
}

function idString(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const normalized = value.trim().replace(/^0+(?=\d)/, "");
    return normalized === "0" ? null : normalized;
  }
  return null;
}

function optionalInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : (
    typeof value === "string" && /^[-+]?\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN
  );
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalPrice(value: unknown, allowZero: boolean): number | null {
  const amount = optionalNumber(value);
  if (amount === null || amount < 0 || (!allowZero && amount === 0)) return null;
  return amount;
}

function optionalNonNegativeNumber(value: unknown): number | null {
  const amount = optionalNumber(value);
  return amount !== null && amount >= 0 ? amount : null;
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  const parsed = optionalInteger(value);
  return parsed !== null && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function optionalTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function enumValue(value: unknown): EnumValue {
  if (!isRecord(value)) return { id: null, name: null };
  return {
    id: optionalInteger(value.id),
    name: optionalString(value.name),
  };
}

function attributeText(value: unknown): string | null {
  if (typeof value === "string") return optionalString(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value)) return optionalString(value.name) ?? optionalString(value.value);
  return null;
}

function isCopartDomain(domain: EnumValue): boolean {
  return domain.id === MOTORAPIS_COPART_DOMAIN_ID
    || domain.name?.toLowerCase() === "copart_com";
}

function normalizeCopartDomain(value: unknown, context: string): EnumValue & { id: 3; name: string } {
  const domain = enumValue(value);
  if (!isCopartDomain(domain)) {
    throw new MotorApisPayloadError(`${context} has no documented Copart domain.`);
  }
  return {
    id: MOTORAPIS_COPART_DOMAIN_ID,
    name: "copart_com",
  };
}

function domainIsExplicitlyOther(value: unknown): boolean {
  const domain = enumValue(value);
  return (domain.id !== null || domain.name !== null) && !isCopartDomain(domain);
}

function withoutKeys(
  value: Record<string, unknown>,
  excludedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !excludedKeys.has(key)),
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function collectImageUrls(value: unknown, seen: Set<unknown>): string[] {
  if (typeof value === "string") return isHttpUrl(value) ? [value] : [];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectImageUrls(entry, seen));
  }

  return Object.values(value).flatMap((entry) => collectImageUrls(entry, seen));
}

export function normalizeImageUrls(value: unknown): string[] {
  let candidates: string[] = [];
  if (isRecord(value)) {
    for (const preferredKey of ["downloaded", "big", "normal", "small"] as const) {
      if (!(preferredKey in value)) continue;
      candidates = collectImageUrls(value[preferredKey], new Set());
      if (candidates.length > 0) break;
    }
  }
  if (candidates.length === 0) candidates = collectImageUrls(value, new Set());
  return [...new Set(candidates)];
}

function nestedString(value: unknown, key: string): string | null {
  return isRecord(value) ? optionalString(value[key]) : null;
}

function nestedAttribute(value: unknown, key: string): string | null {
  return isRecord(value) ? attributeText(value[key]) : null;
}

function nestedRecordAttribute(value: unknown, outerKey: string, innerKey: string): string | null {
  if (!isRecord(value) || !isRecord(value[outerKey])) return null;
  return attributeText(value[outerKey][innerKey]);
}

function amountAndTimestamp(
  value: unknown,
  allowZero: boolean,
): { amount: number | null; updatedAt: string | null } {
  if (!isRecord(value)) return { amount: null, updatedAt: null };
  const amount = optionalPrice(value.value, allowZero);
  return {
    amount,
    updatedAt: amount === null ? null : optionalTimestamp(value.updated_at),
  };
}

function timestampedDate(value: unknown): { value: string | null; updatedAt: string | null } {
  if (!isRecord(value)) return { value: null, updatedAt: null };
  return {
    value: optionalTimestamp(value.value),
    updatedAt: optionalTimestamp(value.updated_at),
  };
}

const VEHICLE_CORE_KEYS = new Set([
  "id",
  "vin",
  "title",
  "year",
  "manufacturer",
  "model",
  "generation",
  "lots",
  "vehicle_type",
  "body_type",
  "engine_name",
  "engine",
  "cylinders",
  "fuel_type",
  "fuel",
  "transmission",
  "drive_wheel",
  "color",
  "condition",
  "document_title",
  "created_at",
  "updated_at",
]);

const LOT_CORE_KEYS = new Set([
  "id",
  "lot",
  "domain",
  "status",
  "bid",
  "buy_now",
  "final_bid",
  "seller_reserve",
  "bid_updated_at",
  "buy_now_updated_at",
  "final_bid_updated_at",
  "sale_date_updated_at",
  "sale_date",
  "odometer",
  "damage",
  "location",
  "images",
  "created_at",
  "updated_at",
  "archived",
  "archived_at",
  "buyer_country",
]);

export function normalizeVehiclePayload(value: unknown, fetchedAt: string): NormalizedVehicleWithLots {
  if (!isRecord(value)) {
    throw new MotorApisPayloadError("MotorAPIs vehicle is not an object.");
  }

  const providerVehicleId = idString(value.id);
  if (providerVehicleId === null) {
    throw new MotorApisPayloadError("MotorAPIs vehicle has no valid id.");
  }

  const manufacturer = enumValue(value.manufacturer);
  const model = enumValue(value.model);
  const generation = enumValue(value.generation);
  const rawLots = value.lots;
  if (rawLots !== undefined && !Array.isArray(rawLots)) {
    throw new MotorApisPayloadError(`MotorAPIs vehicle ${providerVehicleId} has invalid lots.`);
  }

  const lots = (rawLots ?? []).flatMap((entry): NormalizedLot[] => {
    if (!isRecord(entry)) {
      throw new MotorApisPayloadError(`MotorAPIs vehicle ${providerVehicleId} contains an invalid lot.`);
    }
    if (domainIsExplicitlyOther(entry.domain)) return [];
    return [normalizeLotPayload(entry, providerVehicleId, fetchedAt)];
  });

  const explicitUpdatedAt = optionalTimestamp(value.updated_at);
  const lotUpdates = lots
    .map((lot) => lot.providerUpdatedAt)
    .filter((timestamp): timestamp is string => timestamp !== null)
    .sort();

  return {
    vehicle: {
      providerVehicleId,
      vin: optionalString(value.vin),
      title: optionalString(value.title),
      year: boundedInteger(value.year, 1886, 2100),
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      modelId: model.id,
      modelName: model.name,
      generationId: generation.id,
      generationName: generation.name,
      vehicleType: attributeText(value.vehicle_type),
      bodyType: attributeText(value.body_type),
      engineName: attributeText(value.engine) ?? attributeText(value.engine_name),
      cylinders: boundedInteger(
        isRecord(value.cylinders)
          ? value.cylinders.id ?? value.cylinders.value
          : value.cylinders ?? (isRecord(value.engine) ? value.engine.cylinders : null),
        1,
        32,
      ),
      fuelType: attributeText(value.fuel) ?? attributeText(value.fuel_type),
      transmission: attributeText(value.transmission),
      driveWheel: attributeText(value.drive_wheel),
      color: attributeText(value.color),
      condition: attributeText(value.condition),
      documentTitle: attributeText(value.document_title),
      characteristics: withoutKeys(value, VEHICLE_CORE_KEYS),
      providerCreatedAt: optionalTimestamp(value.created_at),
      providerUpdatedAt: explicitUpdatedAt ?? lotUpdates.at(-1) ?? null,
      fetchedAt,
      rawPayload: value,
    },
    lots,
  };
}

export function normalizeLotPayload(
  value: Record<string, unknown>,
  providerVehicleId: string,
  fetchedAt: string,
): NormalizedLot {
  const providerLotId = idString(value.id);
  if (providerLotId === null) {
    throw new MotorApisPayloadError(`MotorAPIs vehicle ${providerVehicleId} has a lot without an id.`);
  }
  const domain = normalizeCopartDomain(value.domain, `MotorAPIs lot ${providerLotId}`);
  const status = enumValue(value.status);
  const sellerReserve = isRecord(value.seller_reserve) ? value.seller_reserve : null;
  const location = isRecord(value.location) ? value.location : null;
  const currentBid = optionalPrice(value.bid, true);
  const buyNow = optionalPrice(value.buy_now, false);
  const finalBid = optionalPrice(value.final_bid, false);
  const sellerReservePrice = sellerReserve ? optionalPrice(sellerReserve.price, false) : null;

  return {
    sourceDomainId: domain.id,
    sourceDomainName: domain.name,
    providerLotId,
    providerVehicleId,
    externalLotNumber: value.lot === null || value.lot === undefined
      ? null
      : optionalString(String(value.lot)),
    providerStatusId: status.id,
    providerStatusName: status.name,
    currentBid,
    currentBidUpdatedAt: currentBid === null ? null : optionalTimestamp(value.bid_updated_at),
    buyNow,
    buyNowUpdatedAt: buyNow === null ? null : optionalTimestamp(value.buy_now_updated_at),
    finalBid,
    finalBidUpdatedAt: finalBid === null ? null : optionalTimestamp(value.final_bid_updated_at),
    sellerReserve: sellerReservePrice,
    sellerReserveUpdatedAt: sellerReservePrice === null
      ? null
      : optionalTimestamp(sellerReserve?.updated_at),
    currency: optionalCurrency(value.currency),
    saleDate: optionalTimestamp(value.sale_date),
    saleDateUpdatedAt: optionalTimestamp(value.sale_date_updated_at),
    odometerKm: isRecord(value.odometer)
      ? optionalNonNegativeNumber(value.odometer.km)
      : null,
    odometerMi: isRecord(value.odometer)
      ? optionalNonNegativeNumber(value.odometer.mi)
      : null,
    odometerStatus: nestedAttribute(value.odometer, "status"),
    primaryDamage: nestedAttribute(value.damage, "main"),
    secondaryDamage: nestedAttribute(value.damage, "second"),
    location,
    locationName: nestedString(location, "raw")
      ?? nestedRecordAttribute(location, "location", "name")
      ?? nestedAttribute(location, "location")
      ?? nestedAttribute(location, "name"),
    locationCity: nestedAttribute(location, "city"),
    locationStateCode: nestedString(location, "state_code")
      ?? nestedRecordAttribute(location, "state", "code")
      ?? nestedRecordAttribute(location, "state", "state_code")
      ?? nestedAttribute(location, "state"),
    locationCountry: nestedAttribute(location, "country"),
    imageUrls: normalizeImageUrls(value.images),
    buyerCountry: optionalString(value.buyer_country)?.toLowerCase() ?? null,
    providerCreatedAt: optionalTimestamp(value.created_at),
    providerUpdatedAt: optionalTimestamp(value.updated_at),
    archivedAt: optionalTimestamp(value.archived_at),
    characteristics: withoutKeys(value, LOT_CORE_KEYS),
    fetchedAt,
    rawPayload: value,
  };
}

export function normalizeArchivePayload(
  value: unknown,
  fetchedAt: string,
): NormalizedArchiveEvent | null {
  if (!isRecord(value)) {
    throw new MotorApisPayloadError("MotorAPIs archive event is not an object.");
  }
  if (domainIsExplicitlyOther(value.domain)) return null;

  const providerLotId = idString(value.lot_id);
  if (providerLotId === null) {
    throw new MotorApisPayloadError("MotorAPIs Copart archive event has no valid lot_id.");
  }
  const domain = normalizeCopartDomain(value.domain, `MotorAPIs archive event ${providerLotId}`);
  const status = enumValue(value.status);
  const currentFormat = isRecord(value.bid)
    || isRecord(value.buy_now)
    || isRecord(value.final_bid)
    || isRecord(value.sale_date);

  const currentBid = currentFormat
    ? amountAndTimestamp(value.bid, true)
    : { amount: optionalPrice(value.bid, true), updatedAt: null };
  const buyNow = currentFormat
    ? amountAndTimestamp(value.buy_now, false)
    : { amount: null, updatedAt: null };
  // In the legacy archive shape `bid` can be only a current-bid fallback.
  // It is deliberately never promoted to a confirmed final bid.
  const finalBid = currentFormat
    ? amountAndTimestamp(value.final_bid, false)
    : { amount: null, updatedAt: null };
  const saleDate = currentFormat
    ? timestampedDate(value.sale_date)
    : { value: optionalTimestamp(value.sale_date), updatedAt: null };

  return {
    sourceDomainId: domain.id,
    sourceDomainName: domain.name,
    providerLotId,
    providerVehicleId: idString(value.car_id),
    externalLotNumber: value.lot === null || value.lot === undefined
      ? null
      : optionalString(String(value.lot)),
    providerStatusId: status.id,
    providerStatusName: status.name,
    archivedAt: optionalTimestamp(value.archived_at),
    saleDate: saleDate.value,
    saleDateUpdatedAt: saleDate.updatedAt,
    currentBid: currentBid.amount,
    currentBidUpdatedAt: currentBid.updatedAt,
    buyNow: buyNow.amount,
    buyNowUpdatedAt: buyNow.updatedAt,
    finalBid: finalBid.amount,
    finalBidUpdatedAt: finalBid.updatedAt,
    sellerReserve: null,
    sellerReserveUpdatedAt: null,
    currency: optionalCurrency(value.currency),
    buyerCountry: optionalString(value.buyer_country)?.toLowerCase() ?? null,
    fetchedAt,
    rawPayload: value,
  };
}
