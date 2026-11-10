export type VehicleStatus = "published" | "draft" | "archived";
export type VehicleInventoryStatus = "available" | "in_transit" | "at_auction";

export const MAX_VEHICLE_IMAGES = 12;

const safeVehicleImagePattern = /^(?:https?:\/\/[^\s]+|\/[^\s]*)$/i;

export function isSafeVehicleImageUrl(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.length > 0
    && value.length <= 2048
    && safeVehicleImagePattern.test(value);
}

/**
 * Normalizes legacy or untrusted gallery values while retaining `image` as the
 * canonical cover. The database enforces the same ordering and size limit.
 */
export function normalizeVehicleImages(image: string, value: unknown): string[] {
  const candidates = [image, ...(Array.isArray(value) ? value : [])];
  const images: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = typeof candidate === "string" ? candidate.trim() : "";
    if (!isSafeVehicleImageUrl(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    images.push(normalized);
    if (images.length === MAX_VEHICLE_IMAGES) break;
  }

  return images;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: number;
  estimateMax: number;
  maxBid: number;
  image: string;
  images: string[];
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventoryStatus: VehicleInventoryStatus;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type VehicleInput = Partial<Vehicle> & {
  published?: boolean;
  [key: string]: unknown;
};

export interface VehicleForm {
  make: string;
  model: string;
  year: number;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: string;
  estimateMax: string;
  maxBid: string;
  image: string;
  images: string[];
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventoryStatus: VehicleInventoryStatus;
  featured: boolean;
}

export const DEFAULT_VEHICLE_FORM: VehicleForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  body: "",
  mileage: "",
  fuel: "Բենզին",
  damage: "",
  auction: "",
  estimateMin: "",
  estimateMax: "",
  maxBid: "",
  image: "",
  images: [],
  imagePosition: "50% 50%",
  badge: "",
  accent: "yellow",
  status: "draft",
  inventoryStatus: "available",
  featured: false,
};
