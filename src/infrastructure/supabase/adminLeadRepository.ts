import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead, LeadStatus } from "../../domain/lead";
import { getSupabaseClient } from "./client";
import type { Database } from "./database.types";
import { mapLeadRow } from "./leadMapper";
import type { AdminLeadRow } from "./leadMapper";

export { mapLeadRow } from "./leadMapper";
export type { AdminLeadRow } from "./leadMapper";

const ADMIN_LEAD_COLUMNS = [
  "id",
  "name",
  "phone",
  "contact_method",
  "vehicle_id",
  "vehicle_label",
  "preferred_date",
  "preferred_time",
  "note",
  "source",
  "status",
  "consent_version",
  "consent_at",
  "created_at",
  "updated_at",
].join(",");

export interface AdminLeadDataSource {
  list(signal?: AbortSignal): Promise<readonly AdminLeadRow[]>;
  updateStatus(
    id: string,
    status: LeadStatus,
    expectedUpdatedAt: string,
  ): Promise<AdminLeadRow | null>;
}

export type AdminLeadRepositoryErrorCode =
  | "ADMIN_LEADS_LOAD_FAILED"
  | "ADMIN_LEAD_UPDATE_FAILED"
  | "ADMIN_LEAD_CONFLICT";

export const ADMIN_LEAD_ERROR_MESSAGES: Readonly<
  Record<AdminLeadRepositoryErrorCode, string>
> = {
  ADMIN_LEADS_LOAD_FAILED: "Հարցումների ցանկը Supabase-ից բեռնել չհաջողվեց։",
  ADMIN_LEAD_UPDATE_FAILED: "Հարցման կարգավիճակը Supabase-ում պահել չհաջողվեց։",
  ADMIN_LEAD_CONFLICT: "Հարցումն արդեն փոփոխվել է մեկ այլ պատուհանում։ Թարմացրեք ցանկը և կրկին փորձեք։",
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

function sortNewestFirst(leads: Lead[]): Lead[] {
  return leads.sort((left, right) => {
    const byCreatedAt = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    return byCreatedAt || left.id.localeCompare(right.id);
  });
}

export function createSupabaseAdminLeadDataSource(
  client: SupabaseClient<Database>,
): AdminLeadDataSource {
  return {
    async list(signal) {
      let query = client
        .from("leads")
        .select(ADMIN_LEAD_COLUMNS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query.overrideTypes<AdminLeadRow[], { merge: false }>();
      if (error) throw error;
      return data || [];
    },

    async updateStatus(id, status, expectedUpdatedAt) {
      const { data, error } = await client
        .from("leads")
        .update({ status })
        .eq("id", id)
        .eq("updated_at", expectedUpdatedAt)
        .select(ADMIN_LEAD_COLUMNS)
        .maybeSingle()
        .overrideTypes<AdminLeadRow | null, { merge: false }>();
      if (error) throw error;
      return data;
    },
  };
}

export async function listAdminLeads({
  signal,
  dataSource,
}: {
  signal?: AbortSignal;
  dataSource?: AdminLeadDataSource;
} = {}): Promise<Lead[]> {
  try {
    const rows = await requireDataSource(dataSource).list(signal);
    return sortNewestFirst(rows.map(mapLeadRow));
  } catch (error) {
    return fail("ADMIN_LEADS_LOAD_FAILED", error);
  }
}

export async function updateAdminLeadStatus(
  id: string,
  status: LeadStatus,
  {
    expectedUpdatedAt,
    dataSource,
  }: {
    expectedUpdatedAt: string;
    dataSource?: AdminLeadDataSource;
  },
): Promise<Lead> {
  try {
    if (!id.trim()) throw new Error("Lead id is required");
    if (!expectedUpdatedAt.trim() || Number.isNaN(Date.parse(expectedUpdatedAt))) {
      throw new Error("A valid lead revision is required");
    }
    const row = await requireDataSource(dataSource).updateStatus(
      id,
      status,
      expectedUpdatedAt,
    );
    if (!row) throw new AdminLeadRepositoryError("ADMIN_LEAD_CONFLICT");
    return mapLeadRow(row);
  } catch (error) {
    if (error instanceof AdminLeadRepositoryError) throw error;
    return fail("ADMIN_LEAD_UPDATE_FAILED", error);
  }
}

let realtimeSubscriptionSequence = 0;

export function subscribeAdminLeadChanges(
  onChange: () => void,
  {
    client = getSupabaseClient(),
  }: {
    client?: SupabaseClient<Database> | null;
  } = {},
): () => void {
  if (!client) return () => {};
  realtimeSubscriptionSequence += 1;
  const channel = client
    .channel(`admin-leads-${realtimeSubscriptionSequence}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leads" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
