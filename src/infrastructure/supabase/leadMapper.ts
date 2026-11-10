import type {
  Lead,
  LeadContactMethod,
  LeadRequestKind,
  LeadSource,
  LeadStatus,
} from "../../domain/lead";
import type { LeadRow } from "./database.types";

export type AdminLeadRow = Pick<
  LeadRow,
  | "id"
  | "name"
  | "phone"
  | "contact_method"
  | "request_kind"
  | "vehicle_id"
  | "vehicle_label"
  | "lot_id"
  | "vin"
  | "preferred_date"
  | "preferred_time"
  | "note"
  | "source"
  | "status"
  | "consent_version"
  | "consent_at"
  | "created_at"
  | "updated_at"
>;

const contactMethods = new Set<LeadContactMethod>([
  "phone",
  "whatsapp",
  "video_call",
  "showroom_visit",
]);
const leadSources = new Set<LeadSource>([
  "website",
  "ai-assistant",
  "auction-catalog",
]);
const requestKinds = new Set<LeadRequestKind>([
  "consultation",
  "full_calculation",
]);
const leadStatuses = new Set<LeadStatus>([
  "new",
  "contacted",
  "booked",
  "closed",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Lead row is not an object");
  }
  return value as Record<string, unknown>;
}

function requiredText(
  row: Record<string, unknown>,
  key: string,
  allowEmpty = false,
): string {
  const value = row[key];
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error(`Lead row has an invalid ${key}`);
  }
  return value;
}

function nullableText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Lead row has an invalid ${key}`);
  }
  return value;
}

function requiredTimestamp(row: Record<string, unknown>, key: string): string {
  const value = requiredText(row, key);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`Lead row has an invalid ${key}`);
  }
  return value;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function mapLeadRow(value: unknown): Lead {
  const row = asRecord(value);
  const method = requiredText(row, "contact_method");
  if (!contactMethods.has(method as LeadContactMethod)) {
    throw new Error("Lead row has an invalid contact_method");
  }

  const source = requiredText(row, "source");
  if (!leadSources.has(source as LeadSource)) {
    throw new Error("Lead row has an invalid source");
  }

  const requestKind = requiredText(row, "request_kind");
  if (!requestKinds.has(requestKind as LeadRequestKind)) {
    throw new Error("Lead row has an invalid request_kind");
  }

  const status = requiredText(row, "status");
  if (!leadStatuses.has(status as LeadStatus)) {
    throw new Error("Lead row has an invalid status");
  }

  const preferredDate = nullableText(row, "preferred_date");
  if (preferredDate !== null && !isCalendarDate(preferredDate)) {
    throw new Error("Lead row has an invalid preferred_date");
  }

  return {
    id: requiredText(row, "id"),
    name: requiredText(row, "name"),
    phone: requiredText(row, "phone"),
    method: method as LeadContactMethod,
    requestKind: requestKind as LeadRequestKind,
    vehicleId: nullableText(row, "vehicle_id"),
    vehicleLabel: requiredText(row, "vehicle_label"),
    lotId: nullableText(row, "lot_id"),
    vin: nullableText(row, "vin"),
    date: preferredDate ?? "",
    time: requiredText(row, "preferred_time", true),
    note: requiredText(row, "note", true),
    status: status as LeadStatus,
    source: source as LeadSource,
    consentVersion: requiredText(row, "consent_version"),
    consentAt: requiredTimestamp(row, "consent_at"),
    createdAt: requiredTimestamp(row, "created_at"),
    updatedAt: requiredTimestamp(row, "updated_at"),
  };
}
