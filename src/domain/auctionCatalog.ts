export const AUCTION_CATALOG_PAGE_SIZE = 24;

export type AuctionCatalogSort =
  | "sale-date"
  | "updated-desc"
  | "bid-asc"
  | "bid-desc"
  | "buy-now-asc"
  | "year-desc";

export interface AuctionCatalogFilters {
  query: string;
  make: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  driveWheel: string;
  sort: AuctionCatalogSort;
}

export const DEFAULT_AUCTION_CATALOG_FILTERS: AuctionCatalogFilters = {
  query: "",
  make: "all",
  model: "all",
  yearFrom: "all",
  yearTo: "all",
  bodyType: "all",
  fuelType: "all",
  transmission: "all",
  driveWheel: "all",
  sort: "sale-date",
};

export interface AuctionCatalogFacets {
  makes: string[];
  models: string[];
  years: number[];
  bodyTypes: string[];
  fuelTypes: string[];
  transmissions: string[];
  driveWheels: string[];
}

export const EMPTY_AUCTION_CATALOG_FACETS: AuctionCatalogFacets = {
  makes: [],
  models: [],
  years: [],
  bodyTypes: [],
  fuelTypes: [],
  transmissions: [],
  driveWheels: [],
};

export interface AuctionCatalogLot {
  id: string;
  providerVehicleId: string;
  providerLotId: string;
  sourceDomainId: number;
  sourceSlug: string;
  lotNumber: string | null;
  title: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  generation: string | null;
  bodyType: string | null;
  color: string | null;
  engine: string | null;
  transmission: string | null;
  driveWheel: string | null;
  vehicleType: string | null;
  fuelType: string | null;
  cylinders: number | null;
  odometerValue: number | null;
  odometerUnit: string | null;
  odometerStatus: string | null;
  primaryDamage: string | null;
  secondaryDamage: string | null;
  location: string | null;
  saleDate: string | null;
  status: string | null;
  currentBid: number | null;
  currentBidUpdatedAt: string | null;
  buyNowPrice: number | null;
  buyNowUpdatedAt: string | null;
  currency: string | null;
  photoUrls: string[];
  providerUpdatedAt: string | null;
  fetchedAt: string;
  characteristics: Record<string, unknown>;
  searchText: string;
}

export interface AuctionCatalogPage {
  items: AuctionCatalogLot[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function auctionLotDisplayName(lot: AuctionCatalogLot): string {
  const structured = [lot.year, lot.make, lot.model, lot.generation]
    .filter((value): value is string | number => value !== null && value !== "")
    .join(" ")
    .trim();
  return structured || lot.title?.trim() || `Copart լոտ ${lot.lotNumber || lot.providerLotId}`;
}
