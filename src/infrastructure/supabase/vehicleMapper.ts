import type {
  Vehicle,
  VehicleInventoryStatus,
  VehicleStatus,
} from "../../domain/vehicle";
import {
  isSafeVehicleImageUrl,
  normalizeVehicleImages,
} from "../../domain/vehicle";

const vehicleStatuses = new Set<VehicleStatus>(["published", "draft", "archived"]);
const vehicleInventoryStatuses = new Set<VehicleInventoryStatus>([
  "available",
  "in_transit",
  "at_auction",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Vehicle row is not an object");
  }
  return value as Record<string, unknown>;
}

function requiredText(row: Record<string, unknown>, key: string, allowEmpty = false): string {
  const value = row[key];
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error(`Vehicle row has an invalid ${key}`);
  }
  return value;
}

function requiredNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Vehicle row has an invalid ${key}`);
  }
  return value;
}

function requiredBoolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") throw new Error(`Vehicle row has an invalid ${key}`);
  return value;
}

export function mapVehicleRow(value: unknown): Vehicle {
  const row = asRecord(value);
  const rawStatus = requiredText(row, "status");
  if (!vehicleStatuses.has(rawStatus as VehicleStatus)) {
    throw new Error("Vehicle row has an invalid status");
  }
  const rawInventoryStatus = requiredText(row, "inventory_status");
  if (!vehicleInventoryStatuses.has(rawInventoryStatus as VehicleInventoryStatus)) {
    throw new Error("Vehicle row has an invalid inventory_status");
  }

  const updatedAt = requiredText(row, "updated_at");
  const createdAt = requiredText(row, "created_at");
  if (Number.isNaN(Date.parse(updatedAt)) || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("Vehicle row has an invalid timestamp");
  }

  const image = requiredText(row, "image").trim();
  if (!isSafeVehicleImageUrl(image)) {
    throw new Error("Vehicle row has an invalid image");
  }
  const images = normalizeVehicleImages(image, row.images);

  return {
    id: requiredText(row, "id"),
    make: requiredText(row, "make"),
    model: requiredText(row, "model"),
    year: requiredNumber(row, "year"),
    body: requiredText(row, "body", true),
    mileage: requiredText(row, "mileage", true),
    fuel: requiredText(row, "fuel", true),
    damage: requiredText(row, "damage", true),
    auction: requiredText(row, "auction", true),
    estimateMin: requiredNumber(row, "estimate_min"),
    estimateMax: requiredNumber(row, "estimate_max"),
    maxBid: requiredNumber(row, "max_bid"),
    image,
    images,
    imagePosition: requiredText(row, "image_position"),
    badge: requiredText(row, "badge", true),
    accent: requiredText(row, "accent"),
    status: rawStatus as VehicleStatus,
    inventoryStatus: rawInventoryStatus as VehicleInventoryStatus,
    featured: requiredBoolean(row, "featured"),
    sortOrder: requiredNumber(row, "sort_order"),
    createdAt,
    updatedAt,
  };
}
