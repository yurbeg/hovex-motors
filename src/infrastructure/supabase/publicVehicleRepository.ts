import type { SupabaseClient } from "@supabase/supabase-js";
import type { Vehicle } from "../../domain/vehicle";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./client";
import { mapVehicleRow } from "./vehicleMapper";

export { mapVehicleRow } from "./vehicleMapper";

const PUBLIC_VEHICLE_COLUMNS = [
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
  "image_position",
  "badge",
  "accent",
  "status",
  "featured",
  "sort_order",
  "created_at",
  "updated_at",
].join(",");

type VehicleRowsLoader = (signal?: AbortSignal) => Promise<readonly unknown[]>;

export interface LoadPublicVehiclesOptions {
  signal?: AbortSignal;
  fetchRows?: VehicleRowsLoader;
  fallback?: () => Vehicle[];
}

export interface PublicVehicleLoadResult {
  items: Vehicle[];
  source: "supabase" | "local-demo";
  error?: string;
}

async function fetchSupabaseVehicleRows(
  client: SupabaseClient<Database>,
  signal?: AbortSignal,
): Promise<readonly unknown[]> {
  let query = client
    .from("vehicles")
    .select(PUBLIC_VEHICLE_COLUMNS)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Supabase vehicle request failed";
}

function publicVehicles(items: readonly Vehicle[]): Vehicle[] {
  return items
    .filter((vehicle) => vehicle.status === "published")
    .slice()
    .sort((left, right) => {
      if (left.featured !== right.featured) return left.featured ? -1 : 1;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.id.localeCompare(right.id);
    });
}

export async function loadPublicVehicles({
  signal,
  fetchRows,
  fallback = () => [],
}: LoadPublicVehiclesOptions = {}): Promise<PublicVehicleLoadResult> {
  const client = fetchRows ? null : getSupabaseClient();
  const fallbackItems = () => publicVehicles(fallback());
  if (!fetchRows && !client) return { items: fallbackItems(), source: "local-demo" };

  try {
    const rows = await (fetchRows ? fetchRows(signal) : fetchSupabaseVehicleRows(client!, signal));
    const items = publicVehicles(rows.map(mapVehicleRow));
    return { items, source: "supabase" };
  } catch (error) {
    return { items: fallbackItems(), source: "local-demo", error: errorMessage(error) };
  }
}
