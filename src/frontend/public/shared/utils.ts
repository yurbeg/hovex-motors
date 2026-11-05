import type { SyntheticEvent } from "react";
import type { CatalogSort } from "./types";
import { DEFAULT_CATALOG_FILTERS } from "./types";

export const phoneDisplay = "033 344 366";
export const phoneHref = "+37433344366";
export const vehicleImageFallback = "/assets/hovex/hovex-logo-instagram.jpg";

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsdRange(minimum: number, maximum: number): string {
  return `${formatUsd(minimum)}–${formatUsd(maximum).replace("$", "")}`;
}

export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function handleVehicleImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget;
  if (image.dataset.fallback) return;
  image.dataset.fallback = "true";
  image.src = vehicleImageFallback;
  image.style.objectPosition = "50% 50%";
}

export function catalogFiltersFromUrl() {
  if (typeof window === "undefined") return { ...DEFAULT_CATALOG_FILTERS };
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get("sort");
  const sort: CatalogSort = rawSort === "newest" || rawSort === "price-asc" || rawSort === "price-desc"
    ? rawSort
    : "recommended";
  return {
    query: params.get("q")?.slice(0, 80) || "",
    make: params.get("make")?.slice(0, 60) || "all",
    yearFrom: /^\d{4}$/.test(params.get("yearFrom") || "") ? params.get("yearFrom")! : "all",
    maxBudget: /^\d{1,7}$/.test(params.get("maxBudget") || "") ? params.get("maxBudget")! : "",
    sort,
  };
}

export function localDateInputValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
