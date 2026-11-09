import { useEffect, useMemo, useState } from "react";
import { Phone } from "@phosphor-icons/react";
import {
  auctionCatalogSearchFromState,
  auctionCatalogStateFromSearch,
} from "../../application/auctionCatalog";
import type {
  AuctionCatalogFacets,
  AuctionCatalogFilters,
  AuctionCatalogLot,
} from "../../domain/auctionCatalog";
import {
  DEFAULT_AUCTION_CATALOG_FILTERS,
  EMPTY_AUCTION_CATALOG_FACETS,
} from "../../domain/auctionCatalog";
import { resolveCatalogLotId } from "../../app/routes";
import {
  loadAuctionCatalogFacets,
  loadAuctionCatalogPage,
} from "../../infrastructure/supabase/auctionCatalogRepository";
import { CatalogFilterPanel } from "./catalog/CatalogFilterPanel";
import { CatalogHero } from "./catalog/CatalogHero";
import { CatalogMobileActionBar } from "./catalog/CatalogMobileActionBar";
import { CatalogResults } from "./catalog/CatalogResults";
import { AuctionVehicleDetailsPage } from "./catalog/AuctionVehicleDetailsPage";
import { ConsultationBanner } from "./consultation/ConsultationBanner";
import { PublicFooter } from "./layout/PublicFooter";
import { PublicHeader } from "./layout/PublicHeader";
import { phoneHref, scrollToId } from "./shared/utils";

const catalogErrorMessage = "Կատալոգի տվյալները հիմա հասանելի չեն։ Կրկին փորձեք մի փոքր ուշ։";

function AuctionCatalogIndexPage() {
  const initialState = useMemo(() => auctionCatalogStateFromSearch(window.location.search), []);
  const [filters, setFilters] = useState<AuctionCatalogFilters>(initialState.filters);
  const [page, setPage] = useState(initialState.page);
  const [items, setItems] = useState<AuctionCatalogLot[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<AuctionCatalogFacets>(EMPTY_AUCTION_CATALOG_FACETS);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [facetsError, setFacetsError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const query = auctionCatalogSearchFromState(filters, page);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query}${window.location.hash}`);
  }, [filters, page]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const delay = filters.query.trim() ? 250 : 0;
    const timeout = window.setTimeout(() => {
      void loadAuctionCatalogPage({ filters, page, signal: controller.signal }).then((result) => {
        if (!active || controller.signal.aborted) return;
        if (result.pageCount > 0 && page > result.pageCount) {
          setPage(result.pageCount);
          return;
        }
        setItems(result.items);
        setTotal(result.total);
        setPageCount(result.pageCount);
        setLoading(false);
      }).catch(() => {
        if (!active || controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setPageCount(0);
        setError(catalogErrorMessage);
        setLoading(false);
      });
    }, delay);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filters, page, reloadToken]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setFacetsLoading(true);
    setFacetsError(false);

    void loadAuctionCatalogFacets(filters.make, controller.signal).then((result) => {
      if (!active || controller.signal.aborted) return;
      setFacets(result);
      setFacetsLoading(false);
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      setFacets((current) => ({ ...EMPTY_AUCTION_CATALOG_FACETS, makes: current.makes }));
      setFacetsError(true);
      setFacetsLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [filters.make, reloadToken]);

  const hasActiveFilters = useMemo(() => Object.entries(filters).some(([key, value]) => (
    value !== DEFAULT_AUCTION_CATALOG_FILTERS[key as keyof AuctionCatalogFilters]
  )), [filters]);

  const updateFilters = (next: AuctionCatalogFilters): void => {
    let normalized = next.make !== filters.make ? { ...next, model: "all" } : next;
    const yearFrom = normalized.yearFrom === "all" ? null : Number(normalized.yearFrom);
    const yearTo = normalized.yearTo === "all" ? null : Number(normalized.yearTo);
    if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
      normalized = normalized.yearFrom !== filters.yearFrom
        ? { ...normalized, yearTo: "all" }
        : { ...normalized, yearFrom: "all" };
    }
    setFilters(normalized);
    setPage(1);
  };

  const resetFilters = (): void => {
    setFilters(DEFAULT_AUCTION_CATALOG_FILTERS);
    setPage(1);
  };

  const changePage = (nextPage: number): void => {
    setPage(nextPage);
    window.setTimeout(() => scrollToId("catalog-results"), 0);
  };

  const retry = (): void => setReloadToken((value) => value + 1);
  const callHovex = () => window.location.assign(`tel:${phoneHref}`);

  return (
    <>
      <PublicHeader page="catalog" onConsultation={callHovex} />
      <main id="top">
        <CatalogHero loading={loading} vehicleCount={total} />
        <CatalogFilterPanel filters={filters} facets={facets} facetsLoading={facetsLoading} facetsError={facetsError} onChange={updateFilters} />
        <CatalogResults loading={loading} error={error} items={items} total={total} page={page} pageCount={pageCount} hasActiveFilters={hasActiveFilters} onRetry={retry} onReset={resetFilters} onPageChange={changePage} />
        <ConsultationBanner onConsultation={callHovex} actionLabel="Զանգահարել մասնագետին" actionIcon={Phone} />
      </main>
      <PublicFooter />
      <CatalogMobileActionBar />
    </>
  );
}

export function CatalogApp() {
  const lotId = resolveCatalogLotId(window.location.pathname);
  return lotId ? <AuctionVehicleDetailsPage lotId={lotId} /> : <AuctionCatalogIndexPage />;
}
