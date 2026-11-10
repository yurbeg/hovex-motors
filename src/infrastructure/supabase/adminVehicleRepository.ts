import type { SupabaseClient } from "@supabase/supabase-js";
import type { Vehicle } from "../../domain/vehicle";
import type {
  Database,
  VehicleInsert,
  VehicleRow,
} from "./database.types";
import { getSupabaseClient } from "./client";
import { mapVehicleRow } from "./vehicleMapper";

const ADMIN_VEHICLE_COLUMNS = [
  "id",
  "make",
  "model",
  "year",
  "body",
  "mileage",
  "fuel",
  "damage",
  "auction",
  "estimate_min",
  "estimate_max",
  "max_bid",
  "image",
  "images",
  "image_position",
  "badge",
  "accent",
  "status",
  "inventory_status",
  "featured",
  "sort_order",
  "created_at",
  "updated_at",
].join(",");

export type AdminVehicleInsertRow = Omit<VehicleInsert, "created_at" | "updated_at">;
export type AdminVehicleUpdateRow = Partial<Omit<AdminVehicleInsertRow, "id">>;

/**
 * Small persistence boundary used by the repository. Tests can implement this
 * without recreating Supabase's fluent, thenable query-builder types.
 */
export interface AdminVehicleDataSource {
  list(signal?: AbortSignal): Promise<readonly VehicleRow[]>;
  create(row: AdminVehicleInsertRow): Promise<VehicleRow>;
  update(
    id: string,
    patch: AdminVehicleUpdateRow,
    expectedUpdatedAt?: string,
  ): Promise<VehicleRow | null>;
}

export type AdminVehicleRepositoryErrorCode =
  | "ADMIN_VEHICLES_LOAD_FAILED"
  | "ADMIN_VEHICLE_CREATE_FAILED"
  | "ADMIN_VEHICLE_UPDATE_FAILED"
  | "ADMIN_VEHICLE_CONFLICT";

export const ADMIN_VEHICLE_ERROR_MESSAGES: Record<AdminVehicleRepositoryErrorCode, string> = {
  ADMIN_VEHICLES_LOAD_FAILED: "Մեքենաների ցանկը Supabase-ից բեռնել չհաջողվեց։",
  ADMIN_VEHICLE_CREATE_FAILED: "Նոր մեքենան Supabase-ում ստեղծել չհաջողվեց։",
  ADMIN_VEHICLE_UPDATE_FAILED: "Մեքենայի փոփոխությունը Supabase-ում պահել չհաջողվեց։",
  ADMIN_VEHICLE_CONFLICT: "Մեքենան արդեն փոփոխվել է մեկ այլ պատուհանում։ Թարմացրեք ցանկը և նորից փորձեք։",
};

export class AdminVehicleRepositoryError extends Error {
  readonly code: AdminVehicleRepositoryErrorCode;

  constructor(code: AdminVehicleRepositoryErrorCode, cause?: unknown) {
    super(ADMIN_VEHICLE_ERROR_MESSAGES[code], { cause });
    this.name = "AdminVehicleRepositoryError";
    this.code = code;
  }
}

function fail(code: AdminVehicleRepositoryErrorCode, cause: unknown): never {
  if (cause instanceof AdminVehicleRepositoryError && cause.code === code) throw cause;
  throw new AdminVehicleRepositoryError(code, cause);
}

function requireDataSource(dataSource?: AdminVehicleDataSource): AdminVehicleDataSource {
  if (dataSource) return dataSource;
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return createSupabaseAdminVehicleDataSource(client);
}

function mapCreateRow(vehicle: Vehicle): AdminVehicleInsertRow {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    body: vehicle.body,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    damage: vehicle.damage,
    auction: vehicle.auction,
    estimate_min: vehicle.estimateMin,
    estimate_max: vehicle.estimateMax,
    max_bid: vehicle.maxBid,
    image: vehicle.image,
    images: vehicle.images,
    image_position: vehicle.imagePosition,
    badge: vehicle.badge,
    accent: vehicle.accent,
    status: vehicle.status,
    inventory_status: vehicle.inventoryStatus,
    featured: vehicle.featured,
    sort_order: vehicle.sortOrder,
  };
}

function mapUpdateRow(patch: Partial<Vehicle>): AdminVehicleUpdateRow {
  return {
    ...(patch.make !== undefined ? { make: patch.make } : {}),
    ...(patch.model !== undefined ? { model: patch.model } : {}),
    ...(patch.year !== undefined ? { year: patch.year } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.mileage !== undefined ? { mileage: patch.mileage } : {}),
    ...(patch.fuel !== undefined ? { fuel: patch.fuel } : {}),
    ...(patch.damage !== undefined ? { damage: patch.damage } : {}),
    ...(patch.auction !== undefined ? { auction: patch.auction } : {}),
    ...(patch.estimateMin !== undefined ? { estimate_min: patch.estimateMin } : {}),
    ...(patch.estimateMax !== undefined ? { estimate_max: patch.estimateMax } : {}),
    ...(patch.maxBid !== undefined ? { max_bid: patch.maxBid } : {}),
    ...(patch.image !== undefined ? { image: patch.image } : {}),
    ...(patch.images !== undefined ? { images: patch.images } : {}),
    ...(patch.imagePosition !== undefined ? { image_position: patch.imagePosition } : {}),
    ...(patch.badge !== undefined ? { badge: patch.badge } : {}),
    ...(patch.accent !== undefined ? { accent: patch.accent } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.inventoryStatus !== undefined ? { inventory_status: patch.inventoryStatus } : {}),
    ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
    ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
  };
}

function sortAdminVehicles(items: Vehicle[]): Vehicle[] {
  return items.sort((left, right) => {
    if (left.featured !== right.featured) return left.featured ? -1 : 1;
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.id.localeCompare(right.id);
  });
}

export function createSupabaseAdminVehicleDataSource(
  client: SupabaseClient<Database>,
): AdminVehicleDataSource {
  return {
    async list(signal) {
      let query = client
        .from("vehicles")
        .select(ADMIN_VEHICLE_COLUMNS)
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query.overrideTypes<VehicleRow[], { merge: false }>();
      if (error) throw error;
      return data || [];
    },

    async create(row) {
      const { data, error } = await client
        .from("vehicles")
        .insert(row)
        .select(ADMIN_VEHICLE_COLUMNS)
        .single()
        .overrideTypes<VehicleRow, { merge: false }>();
      if (error) throw error;
      if (!data) throw new Error("Supabase did not return the created vehicle");
      return data;
    },

    async update(id, patch, expectedUpdatedAt) {
      let query = client
        .from("vehicles")
        .update(patch)
        .eq("id", id);
      if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
      const { data, error } = await query
        .select(ADMIN_VEHICLE_COLUMNS)
        .maybeSingle()
        .overrideTypes<VehicleRow | null, { merge: false }>();
      if (error) throw error;
      return data;
    },
  };
}

export async function loadAdminVehicles({
  signal,
  dataSource,
}: {
  signal?: AbortSignal;
  dataSource?: AdminVehicleDataSource;
} = {}): Promise<Vehicle[]> {
  try {
    const rows = await requireDataSource(dataSource).list(signal);
    return sortAdminVehicles(rows.map(mapVehicleRow));
  } catch (error) {
    return fail("ADMIN_VEHICLES_LOAD_FAILED", error);
  }
}

export async function createAdminVehicle(
  vehicle: Vehicle,
  { dataSource }: { dataSource?: AdminVehicleDataSource } = {},
): Promise<Vehicle> {
  try {
    if (vehicle.inventoryStatus !== "available") {
      throw new Error("Admin-created vehicles must be available inventory");
    }
    const row = await requireDataSource(dataSource).create(mapCreateRow(vehicle));
    return mapVehicleRow(row);
  } catch (error) {
    return fail("ADMIN_VEHICLE_CREATE_FAILED", error);
  }
}

export async function updateAdminVehicle(
  id: string,
  patch: Partial<Vehicle>,
  {
    dataSource,
    expectedUpdatedAt,
  }: {
    dataSource?: AdminVehicleDataSource;
    expectedUpdatedAt?: string;
  } = {},
): Promise<Vehicle> {
  try {
    if (!id.trim()) throw new Error("Vehicle id is required");
    const rowPatch = mapUpdateRow(patch);
    if (!Object.keys(rowPatch).length) throw new Error("Vehicle update is empty");
    const row = await requireDataSource(dataSource).update(id, rowPatch, expectedUpdatedAt);
    if (!row && expectedUpdatedAt) {
      throw new AdminVehicleRepositoryError("ADMIN_VEHICLE_CONFLICT");
    }
    if (!row) throw new Error("Supabase did not return the updated vehicle");
    return mapVehicleRow(row);
  } catch (error) {
    if (error instanceof AdminVehicleRepositoryError) throw error;
    return fail("ADMIN_VEHICLE_UPDATE_FAILED", error);
  }
}
