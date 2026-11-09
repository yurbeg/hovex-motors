import type {
  AuctionCatalogFacets,
  AuctionCatalogFilters,
  AuctionCatalogLot,
  AuctionCatalogPage,
} from "../../domain/auctionCatalog";
import { AUCTION_CATALOG_PAGE_SIZE } from "../../domain/auctionCatalog";
import { getSupabaseClient } from "./client";
import {
  mapAuctionCatalogFacets,
  mapAuctionCatalogRow,
} from "./auctionCatalogMapper";

const PUBLIC_AUCTION_CATALOG_COLUMNS = [
  "id",
  "provider_vehicle_id",
  "provider_lot_id",
  "source_domain_id",
  "source_slug",
  "lot_number",
  "title",
  "vin",
  "year",
  "make",
  "model",
  "generation",
  "body_type",
  "color",
  "engine",
  "transmission",
  "drive_wheel",
  "vehicle_type",
  "fuel_type",
  "cylinders",
  "odometer_value",
  "odometer_unit",
  "odometer_status",
  "primary_damage",
  "secondary_damage",
  "location",
  "sale_date",
  "status",
  "current_bid",
  "current_bid_updated_at",
  "buy_now_price",
  "buy_now_updated_at",
  "currency",
  "photo_urls",
  "provider_updated_at",
  "fetched_at",
  "characteristics",
  "search_text",
].join(",");

export class AuctionCatalogRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuctionCatalogRepositoryError";
  }
}

export interface LoadAuctionCatalogPageOptions {
  filters: AuctionCatalogFilters;
  page: number;
  signal?: AbortSignal;
}

function configuredClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new AuctionCatalogRepositoryError("Auction catalog storage is not configured");
  }
  return client;
}

function filterValue(value: string): string | null {
  const normalized = value.trim();
  return !normalized || normalized === "all" ? null : normalized;
}

function filterYear(value: string): number | null {
  const parsed = Number(value);
  return /^\d{4}$/.test(value) && parsed >= 1886 && parsed <= 2100 ? parsed : null;
}

export function escapeCatalogLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function loadAuctionCatalogPage({
  filters,
  page,
  signal,
}: LoadAuctionCatalogPageOptions): Promise<AuctionCatalogPage> {
  const client = configuredClient();
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (normalizedPage - 1) * AUCTION_CATALOG_PAGE_SIZE;
  const to = from + AUCTION_CATALOG_PAGE_SIZE - 1;

  let query = client
    .from("motorapi_catalog")
    .select(PUBLIC_AUCTION_CATALOG_COLUMNS, { count: "exact" })
    .eq("source_domain_id", 3);

  const search = filters.query.trim();
  const make = filterValue(filters.make);
  const model = filterValue(filters.model);
  const yearFrom = filterYear(filters.yearFrom);
  const yearTo = filterYear(filters.yearTo);
  const bodyType = filterValue(filters.bodyType);
  const fuelType = filterValue(filters.fuelType);
  const transmission = filterValue(filters.transmission);
  const driveWheel = filterValue(filters.driveWheel);

  if (search) query = query.ilike("search_text", `%${escapeCatalogLikePattern(search)}%`);
  if (make) query = query.eq("make", make);
  if (model) query = query.eq("model", model);
  if (yearFrom !== null) query = query.gte("year", yearFrom);
  if (yearTo !== null) query = query.lte("year", yearTo);
  if (bodyType) query = query.eq("body_type", bodyType);
  if (fuelType) query = query.eq("fuel_type", fuelType);
  if (transmission) query = query.eq("transmission", transmission);
  if (driveWheel) query = query.eq("drive_wheel", driveWheel);

  switch (filters.sort) {
    case "updated-desc":
      query = query.order("provider_updated_at", { ascending: false, nullsFirst: false });
      break;
    case "bid-asc":
      query = query.order("current_bid", { ascending: true, nullsFirst: false });
      break;
    case "bid-desc":
      query = query.order("current_bid", { ascending: false, nullsFirst: false });
      break;
    case "buy-now-asc":
      query = query.order("buy_now_price", { ascending: true, nullsFirst: false });
      break;
    case "year-desc":
      query = query.order("year", { ascending: false, nullsFirst: false });
      break;
    case "sale-date":
    default:
      query = query.order("sale_date", { ascending: true, nullsFirst: false });
      break;
  }

  query = query.order("id", { ascending: true }).range(from, to);
  if (signal) query = query.abortSignal(signal);

  const { data, error, count } = await query;
  if (error) throw new AuctionCatalogRepositoryError(error.message);

  const total = count ?? 0;
  return {
    items: (data ?? []).map(mapAuctionCatalogRow),
    total,
    page: normalizedPage,
    pageSize: AUCTION_CATALOG_PAGE_SIZE,
    pageCount: total > 0 ? Math.ceil(total / AUCTION_CATALOG_PAGE_SIZE) : 0,
  };
}

export async function loadAuctionCatalogFacets(
  make: string,
  signal?: AbortSignal,
): Promise<AuctionCatalogFacets> {
  const client = configuredClient();
  let query = client.rpc("get_motorapi_catalog_facets", {
    p_make: filterValue(make),
  });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new AuctionCatalogRepositoryError(error.message);
  return mapAuctionCatalogFacets(data);
}

export async function loadAuctionCatalogLot(
  id: string,
  signal?: AbortSignal,
): Promise<AuctionCatalogLot | null> {
  const client = configuredClient();
  let query = client
    .from("motorapi_catalog")
    .select(PUBLIC_AUCTION_CATALOG_COLUMNS)
    .eq("source_domain_id", 3)
    .eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw new AuctionCatalogRepositoryError(error.message);
  return data ? mapAuctionCatalogRow(data) : null;
}
