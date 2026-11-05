import type { AssistantCriteria } from "../../../application/assistantService";

export type SearchState = "idle" | "loading" | "searched";
export type CatalogSort = "recommended" | "newest" | "price-asc" | "price-desc";
export type ConsultationSource = "website" | "ai-assistant";
export type ConsultationHandler = (vehicleId: string | null, source?: ConsultationSource) => void;

export interface SearchCriteria extends AssistantCriteria {
  budget: string;
  yearFrom: string;
  yearTo: string;
  make: string;
}

export interface CatalogFilters {
  query: string;
  make: string;
  yearFrom: string;
  maxBudget: string;
  sort: CatalogSort;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  query: "",
  make: "all",
  yearFrom: "all",
  maxBudget: "",
  sort: "recommended",
};

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  budget: "15000",
  yearFrom: "2020",
  yearTo: "2026",
  make: "all",
};
