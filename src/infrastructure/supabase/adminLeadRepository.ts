import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canTransitionLeadStatus,
  type Lead,
  type LeadActivity,
  type LeadManager,
  type LeadStatus,
} from "../../domain/lead";
import { getSupabaseClient } from "./client";
import type { Database } from "./database.types";
import {
  mapLeadActivityRow,
  mapLeadManagerRow,
  mapLeadRow,
  type AdminLeadActivityRow,
  type AdminLeadManagerRow,
  type AdminLeadRow,
} from "./leadMapper";

export { mapLeadActivityRow, mapLeadManagerRow, mapLeadRow } from "./leadMapper";
export type {
  AdminLeadActivityRow,
  AdminLeadManagerRow,
  AdminLeadRow,
} from "./leadMapper";

const ADMIN_LEAD_COLUMNS = [
  "id", "name", "phone", "contact_method", "request_kind", "vehicle_id",
  "vehicle_label", "lot_id", "vin", "preferred_date", "preferred_time",
  "note", "source", "status", "assigned_manager_id", "first_response_due_at",
  "first_contacted_at", "next_action_at", "consent_version", "consent_at",
  "created_at", "updated_at",
].join(",");

const LEAD_MANAGER_COLUMNS = [
  "id", "auth_user_id", "display_name", "email", "is_active", "created_at", "updated_at",
].join(",");

const LEAD_ACTIVITY_COLUMNS = [
  "id", "lead_id", "activity_type", "actor_user_id", "actor_label", "from_status",
  "to_status", "from_manager_id", "to_manager_id", "from_manager_name",
  "to_manager_name", "from_next_action_at", "to_next_action_at", "note_body", "created_at",
].join(",");

export interface LeadWorkflowValues {
  status: LeadStatus;
  assignedManagerId: string | null;
  nextActionAt: string | null;
}

export interface AdminLeadDataSource {
  list(signal?: AbortSignal): Promise<readonly AdminLeadRow[]>;
  listManagers(signal?: AbortSignal): Promise<readonly AdminLeadManagerRow[]>;
  listActivities(leadId: string, signal?: AbortSignal): Promise<readonly AdminLeadActivityRow[]>;
  updateWorkflow(
    id: string,
    expectedUpdatedAt: string,
    values: LeadWorkflowValues,
    signal?: AbortSignal,
  ): Promise<AdminLeadRow | null>;
  addNote(leadId: string, body: string, signal?: AbortSignal): Promise<AdminLeadActivityRow>;
}

export type AdminLeadRepositoryErrorCode =
  | "ADMIN_LEADS_LOAD_FAILED"
  | "ADMIN_LEAD_MANAGERS_LOAD_FAILED"
  | "ADMIN_LEAD_ACTIVITIES_LOAD_FAILED"
  | "ADMIN_LEAD_UPDATE_FAILED"
  | "ADMIN_LEAD_NOTE_FAILED"
  | "ADMIN_LEAD_CONFLICT";

export const ADMIN_LEAD_ERROR_MESSAGES: Readonly<Record<AdminLeadRepositoryErrorCode, string>> = {
  ADMIN_LEADS_LOAD_FAILED: "Հարցումների ցանկը Supabase-ից բեռնել չհաջողվեց։",
  ADMIN_LEAD_MANAGERS_LOAD_FAILED: "Մենեջերների ցանկը բեռնել չհաջողվեց։",
  ADMIN_LEAD_ACTIVITIES_LOAD_FAILED: "Հարցման պատմությունը բեռնել չհաջողվեց։",
  ADMIN_LEAD_UPDATE_FAILED: "Հարցման աշխատանքային տվյալները պահել չհաջողվեց։",
  ADMIN_LEAD_NOTE_FAILED: "Ներքին նշումը պահել չհաջողվեց։",
  ADMIN_LEAD_CONFLICT: "Հարցումն արդեն փոփոխվել է մեկ այլ պատուհանում։ Տվյալները թարմացվել են, կրկին փորձեք։",
};

export class AdminLeadRepositoryError extends Error {
  readonly code: AdminLeadRepositoryErrorCode;

  constructor(code: AdminLeadRepositoryErrorCode, cause?: unknown) {
    super(ADMIN_LEAD_ERROR_MESSAGES[code], { cause });
    this.name = "AdminLeadRepositoryError";
    this.code = code;
  }
}

function fail(code: AdminLeadRepositoryErrorCode, cause: unknown): never {
  if (cause instanceof AdminLeadRepositoryError) throw cause;
  throw new AdminLeadRepositoryError(code, cause);
}

function requireDataSource(dataSource?: AdminLeadDataSource): AdminLeadDataSource {
  if (dataSource) return dataSource;
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return createSupabaseAdminLeadDataSource(client);
}

function newestFirst<T extends { createdAt: string; id: string }>(items: T[]): T[] {
  return items.sort((left, right) => (
    Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id)
  ));
}

function firstRpcRow<T>(value: T | readonly T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value as T | null;
}

function isConflictError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = `${String(record.message || "")} ${String(record.details || "")}`.toUpperCase();
  return record.code === "40001" || text.includes("LEAD_CONFLICT") || text.includes("STALE_LEAD");
}

export function createSupabaseAdminLeadDataSource(
  client: SupabaseClient<Database>,
): AdminLeadDataSource {
  return {
    async list(signal) {
      let query = client.from("leads").select(ADMIN_LEAD_COLUMNS)
        .order("created_at", { ascending: false }).order("id", { ascending: true });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query.overrideTypes<AdminLeadRow[], { merge: false }>();
      if (error) throw error;
      return data || [];
    },

    async listManagers(signal) {
      let query = client.from("lead_managers").select(LEAD_MANAGER_COLUMNS)
        .order("is_active", { ascending: false }).order("display_name", { ascending: true });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query.overrideTypes<AdminLeadManagerRow[], { merge: false }>();
      if (error) throw error;
      return data || [];
    },

    async listActivities(leadId, signal) {
      let query = client.from("lead_activities").select(LEAD_ACTIVITY_COLUMNS)
        .eq("lead_id", leadId).order("created_at", { ascending: false }).order("id", { ascending: true });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query.overrideTypes<AdminLeadActivityRow[], { merge: false }>();
      if (error) throw error;
      return data || [];
    },

    async updateWorkflow(id, expectedUpdatedAt, values, signal) {
      let query = client.rpc("update_lead_workflow", {
        p_lead_id: id,
        p_expected_updated_at: expectedUpdatedAt,
        p_new_status: values.status,
        p_new_manager_id: values.assignedManagerId,
        p_new_next_action_at: values.nextActionAt,
      });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      return firstRpcRow(data as unknown as AdminLeadRow | AdminLeadRow[] | null);
    },

    async addNote(leadId, body, signal) {
      let query = client.rpc("add_lead_note", {
        p_lead_id: leadId,
        p_body: body,
      });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      const row = firstRpcRow(data as unknown as AdminLeadActivityRow | AdminLeadActivityRow[] | null);
      if (!row) throw new Error("Note RPC returned no activity");
      return row;
    },
  };
}

export async function listAdminLeads({
  signal,
  dataSource,
}: { signal?: AbortSignal; dataSource?: AdminLeadDataSource } = {}): Promise<Lead[]> {
  try {
    const rows = await requireDataSource(dataSource).list(signal);
    return newestFirst(rows.map(mapLeadRow));
  } catch (error) {
    return fail("ADMIN_LEADS_LOAD_FAILED", error);
  }
}

export async function listAdminLeadManagers({
  signal,
  dataSource,
}: { signal?: AbortSignal; dataSource?: AdminLeadDataSource } = {}): Promise<LeadManager[]> {
  try {
    const rows = await requireDataSource(dataSource).listManagers(signal);
    return rows.map(mapLeadManagerRow).sort((left, right) => (
      Number(right.active) - Number(left.active)
      || left.displayName.localeCompare(right.displayName, "hy")
    ));
  } catch (error) {
    return fail("ADMIN_LEAD_MANAGERS_LOAD_FAILED", error);
  }
}

export async function listAdminLeadActivities(
  leadId: string,
  { signal, dataSource }: { signal?: AbortSignal; dataSource?: AdminLeadDataSource } = {},
): Promise<LeadActivity[]> {
  try {
    if (!leadId.trim()) throw new Error("Lead id is required");
    const rows = await requireDataSource(dataSource).listActivities(leadId, signal);
    return newestFirst(rows.map(mapLeadActivityRow));
  } catch (error) {
    return fail("ADMIN_LEAD_ACTIVITIES_LOAD_FAILED", error);
  }
}

export async function updateAdminLeadWorkflow(
  lead: Lead,
  values: LeadWorkflowValues,
  { signal, dataSource }: { signal?: AbortSignal; dataSource?: AdminLeadDataSource } = {},
): Promise<Lead> {
  try {
    if (!lead.id.trim()) throw new Error("Lead id is required");
    if (!lead.updatedAt.trim() || Number.isNaN(Date.parse(lead.updatedAt))) {
      throw new Error("A valid lead revision is required");
    }
    if (!canTransitionLeadStatus(lead.status, values.status)) {
      throw new Error("Invalid lead status transition");
    }
    if (values.nextActionAt !== null && Number.isNaN(Date.parse(values.nextActionAt))) {
      throw new Error("Invalid next action time");
    }
    const row = await requireDataSource(dataSource).updateWorkflow(lead.id, lead.updatedAt, values, signal);
    if (!row) throw new AdminLeadRepositoryError("ADMIN_LEAD_CONFLICT");
    return mapLeadRow(row);
  } catch (error) {
    if (error instanceof AdminLeadRepositoryError) throw error;
    if (isConflictError(error)) throw new AdminLeadRepositoryError("ADMIN_LEAD_CONFLICT", error);
    return fail("ADMIN_LEAD_UPDATE_FAILED", error);
  }
}

export async function addAdminLeadNote(
  leadId: string,
  body: string,
  { signal, dataSource }: { signal?: AbortSignal; dataSource?: AdminLeadDataSource } = {},
): Promise<LeadActivity> {
  try {
    const normalized = body.trim();
    if (!leadId.trim()) throw new Error("Lead id is required");
    if (!normalized || normalized.length > 2000) throw new Error("Invalid internal note");
    const row = await requireDataSource(dataSource).addNote(leadId, normalized, signal);
    return mapLeadActivityRow(row);
  } catch (error) {
    return fail("ADMIN_LEAD_NOTE_FAILED", error);
  }
}

let realtimeSubscriptionSequence = 0;

export function subscribeAdminLeadChanges(
  onChange: () => void,
  { client = getSupabaseClient() }: { client?: SupabaseClient<Database> | null } = {},
): () => void {
  if (!client) return () => {};
  realtimeSubscriptionSequence += 1;
  const channel = client.channel(`admin-leads-${realtimeSubscriptionSequence}`);
  for (const table of ["leads", "lead_managers", "lead_activities"] as const) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
  }
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
