import { vehicles as sourceVehicles } from "../../content/catalog";
import type {
  Vehicle,
  VehicleInput,
  VehicleStatus,
} from "../../domain/vehicle";
import type { Lead, LeadInput, LeadStatus } from "../../domain/lead";

export { DEFAULT_VEHICLE_FORM } from "../../domain/vehicle";
export type {
  Vehicle,
  VehicleForm,
  VehicleInput,
  VehicleStatus,
} from "../../domain/vehicle";
export type { Lead, LeadInput, LeadStatus } from "../../domain/lead";

const VEHICLES_STORAGE_KEY = "hovex.admin.vehicles.v1";
const LEADS_STORAGE_KEY = "hovex.admin.leads.v1";
const VEHICLES_CHANGED_EVENT = "hovex:vehicles-changed";
const LEADS_CHANGED_EVENT = "hovex:leads-changed";
const SEED_UPDATED_AT = "2026-11-04T08:00:00.000Z";

export type CollectionSubscriber<T> = (items: T[]) => void;

const vehicleStatuses = new Set<VehicleStatus>(["published", "draft", "archived"]);
const leadStatuses = new Set<LeadStatus>(["new", "contacted", "booked", "closed"]);
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
    image: text(item.image),
    imagePosition: text(item.imagePosition, "50% 50%"),
    badge: text(item.badge),
    accent: text(item.accent, "yellow"),
    status,
    featured: Boolean(item.featured),
    sortOrder: number(item.sortOrder, index),
    createdAt: dateTime(item.createdAt, fallbackUpdatedAt),
    updatedAt: dateTime(item.updatedAt, fallbackUpdatedAt),
  };
}

function normalizeLead(
  item: Record<string, unknown> = {},
  fallbackCreatedAt = new Date().toISOString(),
): Lead {
  const createdAt = dateTime(item.createdAt, fallbackCreatedAt);
  const rawStatus = item.status;
  const status: LeadStatus = typeof rawStatus === "string" && leadStatuses.has(rawStatus as LeadStatus)
    ? rawStatus as LeadStatus
    : "new";

  return {
    ...item,
    id: text(item.id) || makeId("lead"),
    name: text(item.name, "Անանուն այցելու"),
    phone: text(item.phone),
    method: text(item.method, "Հեռախոսազանգ"),
    vehicleId: text(item.vehicleId) || null,
    vehicleLabel: text(item.vehicleLabel || item.vehicle, "Անհատական ընտրություն"),
    date: text(item.date || item.preferredDate),
    time: text(item.time || item.preferredTime),
    note: text(item.note),
    status,
    source: text(item.source, "website"),
    demo: Boolean(item.demo),
    createdAt,
    updatedAt: dateTime(item.updatedAt, createdAt),
  };
}

const seededVehicles: Vehicle[] = sourceVehicles.map((vehicle, index) => normalizeVehicle({
  ...vehicle,
  status: "published",
  featured: featuredVehicleIds.has(vehicle.id),
  sortOrder: index,
  updatedAt: SEED_UPDATED_AT,
}, index, SEED_UPDATED_AT));

const seededLeads: Lead[] = [
  {
    id: "lead-demo-001",
    name: "Անի Մկրտչյան",
    phone: "+374 95 123 456",
    method: "WhatsApp",
    vehicleId: "deepal-sl03-2025",
    vehicleLabel: "2025 Deepal SL03 Sport",
    date: "2026-11-06",
    time: "13:00–16:00",
    note: "Կցանկանայի ճշտել առաքման ժամկետը և գույները։",
    status: "new",
    source: "website",
    demo: true,
    createdAt: "2026-11-04T07:45:00.000Z",
    updatedAt: "2026-11-04T07:45:00.000Z",
  },
  {
    id: "lead-demo-002",
    name: "Դավիթ Սարգսյան",
    phone: "+374 77 880 244",
    method: "Հեռախոսազանգ",
    vehicleId: "hyundai-elantra-2023",
    vehicleLabel: "2023 Hyundai Elantra SEL",
    date: "2026-11-07",
    time: "10:00–13:00",
    note: "Հետաքրքրում է ամբողջական հաշվարկը մինչև Երևան։",
    status: "contacted",
    source: "website",
    demo: true,
    createdAt: "2026-11-03T12:20:00.000Z",
    updatedAt: "2026-11-04T06:15:00.000Z",
  },
  {
    id: "lead-demo-003",
    name: "Մարիամ Ավետիսյան",
    phone: "+374 91 445 901",
    method: "Այցելություն սրահ",
    vehicleId: null,
    vehicleLabel: "Անհատական ընտրություն",
    date: "2026-11-08",
    time: "16:00–19:00",
    note: "Փնտրում եմ էլեկտրական քրոսովեր՝ մինչև $30,000 բյուջեով։",
    status: "booked",
    source: "website",
    demo: true,
    createdAt: "2026-11-02T09:05:00.000Z",
    updatedAt: "2026-11-03T15:30:00.000Z",
  },
  {
    id: "lead-demo-004",
    name: "Արամ Հովհաննիսյան",
    phone: "+374 99 602 118",
    method: "Տեսազանգ",
    vehicleId: "kia-forte-2021",
    vehicleLabel: "2021 Kia Forte LXS",
    date: "2026-11-01",
    time: "10:00–13:00",
    note: "Խորհրդատվությունն ավարտված է։",
    status: "closed",
    source: "website",
    demo: true,
    createdAt: "2026-10-29T10:10:00.000Z",
    updatedAt: "2026-11-01T11:00:00.000Z",
  },
].map((lead) => normalizeLead(lead, lead.createdAt));

let memoryVehicles: Vehicle[] = clone(seededVehicles);
let memoryLeads: Lead[] = clone(seededLeads);
let vehiclesHydrated = false;
let leadsHydrated = false;

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

export function getLeads(): Lead[] {
  const stored = parseCollection(readStorage(LEADS_STORAGE_KEY));
  if (stored) {
    memoryLeads = stored.map((lead) => normalizeLead(lead as Record<string, unknown>));
  } else if (!leadsHydrated) {
    writeStorage(LEADS_STORAGE_KEY, memoryLeads);
  }
  leadsHydrated = true;
  return clone(memoryLeads);
}

export function saveLeads(items: readonly LeadInput[] | unknown): Lead[] {
  const now = new Date().toISOString();
  const normalized = (Array.isArray(items) ? items : []).map((lead) => normalizeLead(lead as Record<string, unknown>, now));
  const previous = memoryLeads;
  memoryLeads = normalized;
  leadsHydrated = true;
  const persisted = writeStorage(LEADS_STORAGE_KEY, normalized);
  if (isBrowser() && !persisted) {
    memoryLeads = previous;
    throw new Error("Browser storage is unavailable");
  }
  emit(LEADS_CHANGED_EVENT, normalized);
  return clone(normalized);
}

export function addLead(payload: LeadInput): Lead {
  const now = new Date().toISOString();
  const rawStatus = payload?.status;
  const status: LeadStatus = typeof rawStatus === "string" && leadStatuses.has(rawStatus as LeadStatus)
    ? rawStatus as LeadStatus
    : "new";
  const lead = normalizeLead({
    ...payload,
    id: text(payload?.id) || makeId("lead"),
    status,
    source: text(payload?.source, "website"),
    createdAt: now,
    updatedAt: now,
  }, now);
  saveLeads([lead, ...getLeads().filter((item) => item.id !== lead.id)]);
  return clone(lead);
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

export function subscribeLeads(callback: CollectionSubscriber<Lead>): () => void {
  return subscribe({
    callback,
    eventName: LEADS_CHANGED_EVENT,
    storageKey: LEADS_STORAGE_KEY,
    read: getLeads,
  });
}
