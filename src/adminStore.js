import { vehicles as sourceVehicles } from "./data.js";

const VEHICLES_STORAGE_KEY = "hovex.admin.vehicles.v1";
const LEADS_STORAGE_KEY = "hovex.admin.leads.v1";
const VEHICLES_CHANGED_EVENT = "hovex:vehicles-changed";
const LEADS_CHANGED_EVENT = "hovex:leads-changed";
const SEED_UPDATED_AT = "2026-11-04T08:00:00.000Z";

const vehicleStatuses = new Set(["published", "draft", "archived"]);
const leadStatuses = new Set(["new", "contacted", "booked", "closed"]);
const featuredVehicleIds = new Set([
  "hyundai-elantra-2023",
  "deepal-sl03-2025",
  "deepal-s05-2026",
]);

export const DEFAULT_VEHICLE_FORM = {
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
  imagePosition: "50% 50%",
  badge: "",
  accent: "yellow",
  status: "draft",
  featured: false,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function text(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateTime(value, fallback) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function normalizeVehicle(item = {}, index = 0, fallbackUpdatedAt = new Date().toISOString()) {
  const status = vehicleStatuses.has(item.status)
    ? item.status
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
    updatedAt: dateTime(item.updatedAt, fallbackUpdatedAt),
  };
}

function normalizeLead(item = {}, fallbackCreatedAt = new Date().toISOString()) {
  const createdAt = dateTime(item.createdAt, fallbackCreatedAt);
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
    status: leadStatuses.has(item.status) ? item.status : "new",
    source: text(item.source, "website"),
    demo: Boolean(item.demo),
    createdAt,
    updatedAt: dateTime(item.updatedAt, createdAt),
  };
}

const seededVehicles = sourceVehicles.map((vehicle, index) => normalizeVehicle({
  ...vehicle,
  status: "published",
  featured: featuredVehicleIds.has(vehicle.id),
  sortOrder: index,
  updatedAt: SEED_UPDATED_AT,
}, index, SEED_UPDATED_AT));

const seededLeads = [
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

let memoryVehicles = clone(seededVehicles);
let memoryLeads = clone(seededLeads);
let vehiclesHydrated = false;
let leadsHydrated = false;

function readStorage(key) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function parseCollection(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function emit(eventName, detail) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: clone(detail) }));
}

export function getVehicles() {
  const stored = parseCollection(readStorage(VEHICLES_STORAGE_KEY));
  if (stored) {
    memoryVehicles = stored.map((vehicle, index) => normalizeVehicle(vehicle, index));
  } else if (!vehiclesHydrated) {
    writeStorage(VEHICLES_STORAGE_KEY, memoryVehicles);
  }
  vehiclesHydrated = true;
  return clone(memoryVehicles);
}

export function saveVehicles(items) {
  const now = new Date().toISOString();
  const normalized = (Array.isArray(items) ? items : []).map((vehicle, index) => (
    normalizeVehicle(vehicle, index, now)
  ));
  memoryVehicles = normalized;
  vehiclesHydrated = true;
  writeStorage(VEHICLES_STORAGE_KEY, normalized);
  emit(VEHICLES_CHANGED_EVENT, normalized);
  return clone(normalized);
}

export function resetVehicles() {
  return saveVehicles(clone(seededVehicles));
}

export function getLeads() {
  const stored = parseCollection(readStorage(LEADS_STORAGE_KEY));
  if (stored) {
    memoryLeads = stored.map((lead) => normalizeLead(lead));
  } else if (!leadsHydrated) {
    writeStorage(LEADS_STORAGE_KEY, memoryLeads);
  }
  leadsHydrated = true;
  return clone(memoryLeads);
}

export function saveLeads(items) {
  const now = new Date().toISOString();
  const normalized = (Array.isArray(items) ? items : []).map((lead) => normalizeLead(lead, now));
  memoryLeads = normalized;
  leadsHydrated = true;
  writeStorage(LEADS_STORAGE_KEY, normalized);
  emit(LEADS_CHANGED_EVENT, normalized);
  return clone(normalized);
}

export function addLead(payload) {
  const now = new Date().toISOString();
  const lead = normalizeLead({
    ...payload,
    id: text(payload?.id) || makeId("lead"),
    status: leadStatuses.has(payload?.status) ? payload.status : "new",
    source: text(payload?.source, "website"),
    createdAt: now,
    updatedAt: now,
  }, now);
  saveLeads([lead, ...getLeads().filter((item) => item.id !== lead.id)]);
  return clone(lead);
}

function subscribe({ callback, eventName, storageKey, read }) {
  if (!isBrowser() || typeof callback !== "function") return () => {};

  const onCustomEvent = (event) => callback(clone(event.detail ?? read()));
  const onStorage = (event) => {
    if (event.key === storageKey) callback(read());
  };

  window.addEventListener(eventName, onCustomEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(eventName, onCustomEvent);
    window.removeEventListener("storage", onStorage);
  };
}

export function subscribeVehicles(callback) {
  return subscribe({
    callback,
    eventName: VEHICLES_CHANGED_EVENT,
    storageKey: VEHICLES_STORAGE_KEY,
    read: getVehicles,
  });
}

export function subscribeLeads(callback) {
  return subscribe({
    callback,
    eventName: LEADS_CHANGED_EVENT,
    storageKey: LEADS_STORAGE_KEY,
    read: getLeads,
  });
}
