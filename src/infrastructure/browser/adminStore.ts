import { vehicles as sourceVehicles } from "../../content/catalog";
import type {
  Vehicle,
  VehicleInventoryStatus,
  VehicleInput,
  VehicleStatus,
} from "../../domain/vehicle";
import { normalizeVehicleImages } from "../../domain/vehicle";

export { DEFAULT_VEHICLE_FORM } from "../../domain/vehicle";
export type {
  Vehicle,
  VehicleForm,
  VehicleInput,
  VehicleInventoryStatus,
  VehicleStatus,
} from "../../domain/vehicle";

const VEHICLES_STORAGE_KEY = "hovex.admin.vehicles.v1";
const VEHICLES_CHANGED_EVENT = "hovex:vehicles-changed";
const SEED_UPDATED_AT = "2026-11-04T08:00:00.000Z";

export type CollectionSubscriber<T> = (items: T[]) => void;

const vehicleStatuses = new Set<VehicleStatus>(["published", "draft", "archived"]);
const vehicleInventoryStatuses = new Set<VehicleInventoryStatus>(["available", "in_transit", "at_auction"]);
const featuredVehicleIds = new Set<string>([
  "hyundai-elantra-2023",
  "deepal-sl03-2025",
  "deepal-s05-2026",
]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateTime(value: unknown, fallback: string): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function normalizeVehicle(
  item: Record<string, unknown> = {},
  index = 0,
  fallbackUpdatedAt = new Date().toISOString(),
): Vehicle {
  const rawStatus = item.status;
  const status: VehicleStatus = typeof rawStatus === "string" && vehicleStatuses.has(rawStatus as VehicleStatus)
    ? rawStatus as VehicleStatus
    : item.published === false
      ? "draft"
      : "published";
  const rawInventoryStatus = item.inventoryStatus;
  const inventoryStatus: VehicleInventoryStatus = typeof rawInventoryStatus === "string"
    && vehicleInventoryStatuses.has(rawInventoryStatus as VehicleInventoryStatus)
    ? rawInventoryStatus as VehicleInventoryStatus
    : "at_auction";
  const legacyImage = text(item.image);
  const images = normalizeVehicleImages(legacyImage, item.images);
  const image = images[0] || legacyImage;

  return {
    ...item,
    id: text(item.id) || makeId("vehicle"),
    make: text(item.make),
    model: text(item.model),
    year: number(item.year, new Date().getFullYear()),
    body: text(item.body),
    mileage: text(item.mileage),
    fuel: text(item.fuel),
    damage: text(item.damage),
    auction: text(item.auction),
    estimateMin: number(item.estimateMin),
    estimateMax: number(item.estimateMax),
    maxBid: number(item.maxBid),
    image,
    images,
    imagePosition: text(item.imagePosition, "50% 50%"),
    badge: text(item.badge),
    accent: text(item.accent, "yellow"),
    status,
    inventoryStatus,
    featured: Boolean(item.featured),
    sortOrder: number(item.sortOrder, index),
    createdAt: dateTime(item.createdAt, fallbackUpdatedAt),
    updatedAt: dateTime(item.updatedAt, fallbackUpdatedAt),
  };
}

const seededVehicles: Vehicle[] = sourceVehicles.map((vehicle, index) => normalizeVehicle({
  ...vehicle,
  status: "published",
  featured: featuredVehicleIds.has(vehicle.id),
  sortOrder: index,
  updatedAt: SEED_UPDATED_AT,
}, index, SEED_UPDATED_AT));

let memoryVehicles: Vehicle[] = clone(seededVehicles);
let vehiclesHydrated = false;

function readStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function parseCollection(raw: string | null): unknown[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function emit<T>(eventName: string, detail: T): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent<T>(eventName, { detail: clone(detail) }));
}

export function getVehicles(): Vehicle[] {
  const stored = parseCollection(readStorage(VEHICLES_STORAGE_KEY));
  if (stored) {
    memoryVehicles = stored.map((vehicle, index) => normalizeVehicle(vehicle as Record<string, unknown>, index));
  } else if (!vehiclesHydrated) {
    writeStorage(VEHICLES_STORAGE_KEY, memoryVehicles);
  }
  vehiclesHydrated = true;
  return clone(memoryVehicles);
}

export function saveVehicles(items: readonly VehicleInput[] | unknown): Vehicle[] {
  const now = new Date().toISOString();
  const normalized = (Array.isArray(items) ? items : []).map((vehicle, index) => (
    normalizeVehicle(vehicle as Record<string, unknown>, index, now)
  ));
  memoryVehicles = normalized;
  vehiclesHydrated = true;
  writeStorage(VEHICLES_STORAGE_KEY, normalized);
  emit(VEHICLES_CHANGED_EVENT, normalized);
  return clone(normalized);
}

export function resetVehicles(): Vehicle[] {
  return saveVehicles(clone(seededVehicles));
}

interface SubscribeOptions<T> {
  callback: CollectionSubscriber<T>;
  eventName: string;
  storageKey: string;
  read: () => T[];
}

function subscribe<T>({ callback, eventName, storageKey, read }: SubscribeOptions<T>): () => void {
  if (!isBrowser() || typeof callback !== "function") return () => {};

  const onCustomEvent: EventListener = (event) => {
    const detail = (event as CustomEvent<T[]>).detail;
    callback(clone(detail ?? read()));
  };
  const onStorage = (event: StorageEvent): void => {
    if (event.key === storageKey) callback(read());
  };

  window.addEventListener(eventName, onCustomEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(eventName, onCustomEvent);
    window.removeEventListener("storage", onStorage);
  };
}

export function subscribeVehicles(callback: CollectionSubscriber<Vehicle>): () => void {
  return subscribe({
    callback,
    eventName: VEHICLES_CHANGED_EVENT,
    storageKey: VEHICLES_STORAGE_KEY,
    read: getVehicles,
  });
}
