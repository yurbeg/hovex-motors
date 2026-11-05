import { getVehicles } from "../infrastructure/browser/adminStore";
import {
  loadPublicVehicles as loadPublicVehiclesFromSupabase,
} from "../infrastructure/supabase/publicVehicleRepository";
import type {
  LoadPublicVehiclesOptions,
  PublicVehicleLoadResult,
} from "../infrastructure/supabase/publicVehicleRepository";

export { mapVehicleRow } from "../infrastructure/supabase/vehicleMapper";
export type {
  LoadPublicVehiclesOptions,
  PublicVehicleLoadResult,
} from "../infrastructure/supabase/publicVehicleRepository";

/**
 * Public-catalog use case. The Supabase adapter remains independent from
 * browser storage; this application boundary supplies the demo fallback.
 */
export function loadPublicVehicles(
  options: LoadPublicVehiclesOptions = {},
): Promise<PublicVehicleLoadResult> {
  return loadPublicVehiclesFromSupabase({
    ...options,
    fallback: options.fallback ?? getVehicles,
  });
}
