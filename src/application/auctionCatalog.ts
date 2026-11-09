import type {
  AuctionCatalogFilters,
  AuctionCatalogSort,
} from "../domain/auctionCatalog";
import { DEFAULT_AUCTION_CATALOG_FILTERS } from "../domain/auctionCatalog";

export interface AuctionCatalogUrlState {
  filters: AuctionCatalogFilters;
  page: number;
}

const catalogSorts = new Set<AuctionCatalogSort>([
  "sale-date",
  "updated-desc",
  "bid-asc",
  "bid-desc",
  "buy-now-asc",
  "year-desc",
]);

function limitedParameter(params: URLSearchParams, key: string, maximumLength = 80): string {
  return params.get(key)?.trim().slice(0, maximumLength) || "";
}

function optionParameter(params: URLSearchParams, key: string): string {
  return limitedParameter(params, key, 100) || "all";
}

function yearParameter(params: URLSearchParams, key: string): string {
  const value = params.get(key) || "";
  const parsed = Number(value);
  return /^\d{4}$/.test(value) && parsed >= 1886 && parsed <= 2100 ? value : "all";
}

export function auctionCatalogStateFromSearch(search: string): AuctionCatalogUrlState {
  const params = new URLSearchParams(search);
  const rawSort = params.get("sort") as AuctionCatalogSort | null;
  const rawPage = Number(params.get("page"));

  return {
    filters: {
      query: limitedParameter(params, "q"),
      make: optionParameter(params, "make"),
      model: optionParameter(params, "model"),
      yearFrom: yearParameter(params, "yearFrom"),
      yearTo: yearParameter(params, "yearTo"),
      bodyType: optionParameter(params, "body"),
      fuelType: optionParameter(params, "fuel"),
      transmission: optionParameter(params, "transmission"),
      driveWheel: optionParameter(params, "drive"),
      sort: rawSort && catalogSorts.has(rawSort) ? rawSort : DEFAULT_AUCTION_CATALOG_FILTERS.sort,
    },
    page: Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 1_000_000) : 1,
  };
}

export function auctionCatalogSearchFromState(
  filters: AuctionCatalogFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  const setIfDifferent = (key: string, value: string, defaultValue = "all") => {
    if (value && value !== defaultValue) params.set(key, value);
  };

  setIfDifferent("q", filters.query.trim(), "");
  setIfDifferent("make", filters.make);
  setIfDifferent("model", filters.model);
  setIfDifferent("yearFrom", filters.yearFrom);
  setIfDifferent("yearTo", filters.yearTo);
  setIfDifferent("body", filters.bodyType);
  setIfDifferent("fuel", filters.fuelType);
  setIfDifferent("transmission", filters.transmission);
  setIfDifferent("drive", filters.driveWheel);
  setIfDifferent("sort", filters.sort, DEFAULT_AUCTION_CATALOG_FILTERS.sort);
  if (page > 1) params.set("page", String(Math.floor(page)));

  const query = params.toString();
  return query ? `?${query}` : "";
}
