import type {
  Lead,
  LeadActivity,
  LeadActivityType,
  LeadContactMethod,
  LeadManager,
  LeadRequestKind,
  LeadSource,
  LeadStatus,
} from "../../domain/lead";
import type { LeadActivityRow, LeadManagerRow, LeadRow } from "./database.types";

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
  | "assigned_manager_id"
  | "first_response_due_at"
  | "first_contacted_at"
  | "next_action_at"
  | "consent_version"
  | "consent_at"
  | "created_at"
  | "updated_at"
>;

export type AdminLeadManagerRow = LeadManagerRow;
export type AdminLeadActivityRow = LeadActivityRow;

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
const leadActivityTypes = new Set<LeadActivityType>([
  "created",
  "status_changed",
  "manager_assigned",
  "manager_unassigned",
  "next_action_changed",
  "note_added",
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

function nullableTimestamp(row: Record<string, unknown>, key: string): string | null {
  const value = nullableText(row, key);
  if (value !== null && Number.isNaN(Date.parse(value))) {
    throw new Error(`Lead row has an invalid ${key}`);
  }
  return value;
}

function nullableStatus(row: Record<string, unknown>, key: string): LeadStatus | null {
  const value = nullableText(row, key);
  if (value !== null && !leadStatuses.has(value as LeadStatus)) {
    throw new Error(`Lead activity row has an invalid ${key}`);
  }
  return value as LeadStatus | null;
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
    assignedManagerId: nullableText(row, "assigned_manager_id"),
    firstResponseDueAt: requiredTimestamp(row, "first_response_due_at"),
    firstContactedAt: nullableTimestamp(row, "first_contacted_at"),
    nextActionAt: nullableTimestamp(row, "next_action_at"),
    source: source as LeadSource,
    consentVersion: requiredText(row, "consent_version"),
    consentAt: requiredTimestamp(row, "consent_at"),
    createdAt: requiredTimestamp(row, "created_at"),
    updatedAt: requiredTimestamp(row, "updated_at"),
  };
}

export function mapLeadManagerRow(value: unknown): LeadManager {
  const row = asRecord(value);
  if (typeof row.is_active !== "boolean") {
    throw new Error("Lead manager row has an invalid is_active");
  }
  return {
    id: requiredText(row, "id"),
    authUserId: nullableText(row, "auth_user_id"),
    displayName: requiredText(row, "display_name"),
    email: nullableText(row, "email"),
    active: row.is_active,
    createdAt: requiredTimestamp(row, "created_at"),
    updatedAt: requiredTimestamp(row, "updated_at"),
  };
}

export function mapLeadActivityRow(value: unknown): LeadActivity {
  const row = asRecord(value);
  const type = requiredText(row, "activity_type");
  if (!leadActivityTypes.has(type as LeadActivityType)) {
    throw new Error("Lead activity row has an invalid activity_type");
  }
  const note = nullableText(row, "note_body");
  if (type === "note_added" && !note) {
    throw new Error("Lead activity row has an invalid note_body");
  }
  return {
    id: requiredText(row, "id"),
    leadId: requiredText(row, "lead_id"),
    type: type as LeadActivityType,
    actorUserId: nullableText(row, "actor_user_id"),
    actorLabel: requiredText(row, "actor_label"),
    fromStatus: nullableStatus(row, "from_status"),
    toStatus: nullableStatus(row, "to_status"),
    fromManagerId: nullableText(row, "from_manager_id"),
    toManagerId: nullableText(row, "to_manager_id"),
    fromManagerName: nullableText(row, "from_manager_name"),
    toManagerName: nullableText(row, "to_manager_name"),
    fromNextActionAt: nullableTimestamp(row, "from_next_action_at"),
    toNextActionAt: nullableTimestamp(row, "to_next_action_at"),
    note,
    createdAt: requiredTimestamp(row, "created_at"),
  };
}
