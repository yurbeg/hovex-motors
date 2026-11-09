import type {
  Vehicle,
  VehicleInventoryStatus,
} from "../domain/vehicle";

export type PublicInventoryFilter = "all" | VehicleInventoryStatus;

export type PublicInventoryCounts = Record<PublicInventoryFilter, number>;

export const PUBLIC_INVENTORY_SEARCH_PARAMETER = "inventory";

export const PUBLIC_INVENTORY_FILTERS: readonly PublicInventoryFilter[] = [
  "all",
  "available",
  "in_transit",
  "at_auction",
];

const publicInventoryFilterSet = new Set<PublicInventoryFilter>(
  PUBLIC_INVENTORY_FILTERS,
);

/**
 * Normalizes untrusted URL or UI state to a supported public inventory filter.
 */
export function normalizePublicInventoryFilter(
  value: string | null | undefined,
): PublicInventoryFilter {
  const normalized = value?.trim() as PublicInventoryFilter | undefined;
  return normalized && publicInventoryFilterSet.has(normalized)
    ? normalized
    : "all";
}

export function publicInventoryFilterFromSearch(
  search: string,
): PublicInventoryFilter {
  const params = new URLSearchParams(search);
  return normalizePublicInventoryFilter(
    params.get(PUBLIC_INVENTORY_SEARCH_PARAMETER),
  );
}

/**
 * Returns a canonical query string while preserving filters owned by other
 * parts of the public page. The default `all` value is omitted from the URL.
 */
export function publicInventorySearchWithFilter(
  search: string,
  filter: PublicInventoryFilter,
): string {
  const params = new URLSearchParams(search);
  const normalizedFilter = normalizePublicInventoryFilter(filter);

  if (normalizedFilter === "all") {
    params.delete(PUBLIC_INVENTORY_SEARCH_PARAMETER);
  } else {
    params.set(PUBLIC_INVENTORY_SEARCH_PARAMETER, normalizedFilter);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Public inventory never exposes draft or archived admin records, even when
 * the caller passes an unfiltered collection.
 */
export function filterPublicInventoryVehicles(
  vehicles: readonly Vehicle[],
  filter: PublicInventoryFilter,
): Vehicle[] {
  const normalizedFilter = normalizePublicInventoryFilter(filter);

  return vehicles.filter((vehicle) => (
    vehicle.status === "published"
      && (
        normalizedFilter === "all"
        || vehicle.inventoryStatus === normalizedFilter
      )
  ));
}

/**
 * Counts are calculated from all published records and therefore stay stable
 * while visitors switch between inventory-status filters.
 */
export function countPublicInventoryVehicles(
  vehicles: readonly Vehicle[],
): PublicInventoryCounts {
  const counts: PublicInventoryCounts = {
    all: 0,
    available: 0,
    in_transit: 0,
    at_auction: 0,
  };

  for (const vehicle of vehicles) {
    if (vehicle.status !== "published") continue;
    counts.all += 1;
    counts[vehicle.inventoryStatus] += 1;
  }

  return counts;
}
