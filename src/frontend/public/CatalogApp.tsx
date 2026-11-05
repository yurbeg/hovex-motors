import { useEffect, useMemo, useState } from "react";
import { loadPublicVehicles } from "../../application/publicCatalog";
import type { Vehicle } from "../../domain/vehicle";
import { addLead, getVehicles } from "../../infrastructure/browser/adminStore";
import { AiAssistant } from "./assistant/AiAssistant";
import type { CatalogFilters } from "./shared/types";
import { DEFAULT_CATALOG_FILTERS } from "./shared/types";
import { catalogFiltersFromUrl, scrollToId } from "./shared/utils";
import { usePublicInteractions } from "./hooks/usePublicInteractions";
import { PublicHeader } from "./layout/PublicHeader";
import { PublicFooter } from "./layout/PublicFooter";
import { MobileActionBar } from "./layout/MobileActionBar";
import { CatalogHero } from "./catalog/CatalogHero";
import { CatalogSourceNotice } from "./catalog/CatalogSourceNotice";
import { CatalogFilterPanel } from "./catalog/CatalogFilterPanel";
import { CatalogResults } from "./catalog/CatalogResults";
import { ConsultationBanner } from "./consultation/ConsultationBanner";
import { CompareBar } from "./vehicles/CompareBar";
import { Notice } from "./shared/Notice";
import { VehicleDetailsModal } from "./vehicles/VehicleDetailsModal";
import { CompareModal } from "./vehicles/CompareModal";
import { ConsultationModal } from "./consultation/ConsultationModal";

export function CatalogApp() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSource, setCatalogSource] = useState<"supabase" | "local-demo" | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState<CatalogFilters>(catalogFiltersFromUrl);
  const interactions = usePublicInteractions(vehicles);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCatalogLoading(true);

    void loadPublicVehicles({ signal: controller.signal }).then((result) => {
      if (!active || controller.signal.aborted) return;
      const nextVehicles = result.items.filter((vehicle) => vehicle.status === "published");
      setVehicles(nextVehicles);
      setCatalogSource(result.source);
      setCatalogLoading(false);
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      const nextVehicles = getVehicles().filter((vehicle) => vehicle.status === "published");
      setVehicles(nextVehicles);
      setCatalogSource("local-demo");
      setCatalogLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
    // reloadToken intentionally owns this request lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncParam = (name: string, value: string, defaultValue = "") => {
      if (!value || value === defaultValue) params.delete(name);
      else params.set(name, value);
    };
    syncParam("q", filters.query);
    syncParam("make", filters.make, "all");
    syncParam("yearFrom", filters.yearFrom, "all");
    syncParam("maxBudget", filters.maxBudget);
    syncParam("sort", filters.sort, "recommended");
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [filters]);

  const makes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean))].sort((left, right) => left.localeCompare(right, "hy")), [vehicles]);
  const years = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.year))].sort((left, right) => right - left), [vehicles]);
  const filteredVehicles = useMemo(() => {
    const needle = filters.query.trim().toLocaleLowerCase("hy");
    const yearFrom = filters.yearFrom === "all" ? 0 : Number(filters.yearFrom);
    const maxBudget = filters.maxBudget === "" ? Number.POSITIVE_INFINITY : Number(filters.maxBudget);
    const next = vehicles.filter((vehicle) => {
      const haystack = [vehicle.make, vehicle.model, vehicle.body, vehicle.fuel, vehicle.year].join(" ").toLocaleLowerCase("hy");
      return (!needle || haystack.includes(needle)) && (filters.make === "all" || vehicle.make === filters.make) && vehicle.year >= yearFrom && vehicle.estimateMax <= maxBudget;
    });
    if (filters.sort === "newest") return next.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.year - left.year);
    if (filters.sort === "price-asc") return next.sort((left, right) => left.estimateMax - right.estimateMax);
    if (filters.sort === "price-desc") return next.sort((left, right) => right.estimateMax - left.estimateMax);
    return next;
  }, [filters, vehicles]);

  const showAllVehicles = (): void => {
    interactions.setAssistantOpen(false);
    setFilters(DEFAULT_CATALOG_FILTERS);
    window.setTimeout(() => scrollToId("catalog-results"), 0);
  };

  return (
    <>
      <PublicHeader page="catalog" onConsultation={interactions.openConsultation} />
      <main id="top">
        <CatalogHero loading={catalogLoading} vehicleCount={vehicles.length} />
        <CatalogSourceNotice visible={catalogSource === "local-demo" && !catalogLoading} onRetry={() => setReloadToken((value) => value + 1)} />
        <CatalogFilterPanel filters={filters} makes={makes} years={years} onChange={setFilters} />
        <CatalogResults loading={catalogLoading} vehicles={vehicles} filteredVehicles={filteredVehicles} filters={filters} compared={interactions.compared} onFiltersChange={setFilters} onCompare={interactions.toggleCompare} onDetails={interactions.setDetailVehicle} onConsultation={interactions.openConsultation} />
        <ConsultationBanner onConsultation={interactions.openConsultation} />
      </main>
      <PublicFooter />
      <AiAssistant open={interactions.assistantOpen} onOpenChange={interactions.setAssistantOpen} vehicles={vehicles} criteria={{ budget: filters.maxBudget, yearFrom: filters.yearFrom, make: filters.make === "all" ? null : filters.make }} compared={interactions.compared} onVehicleDetails={interactions.setDetailVehicle} onCompare={interactions.toggleCompare} onConsultation={(id) => interactions.openConsultation(id, "ai-assistant")} onOpenFinder={showAllVehicles} />
      <MobileActionBar page="catalog" assistantOpen={interactions.assistantOpen} onOpenAssistant={() => interactions.setAssistantOpen(true)} onConsultation={() => interactions.openConsultation(null)} onPrimaryAction={() => window.location.assign("/")} />
      {interactions.compared.length ? <CompareBar count={interactions.compared.length} onOpen={interactions.openCompare} onClear={() => interactions.setCompared([])} /> : null}
      <Notice message={interactions.notice} />
      {interactions.detailVehicle ? <VehicleDetailsModal vehicle={interactions.detailVehicle} onClose={() => interactions.setDetailVehicle(null)} onConsultation={interactions.openConsultation} isCompared={interactions.compared.includes(interactions.detailVehicle.id)} onCompare={interactions.toggleCompare} /> : null}
      {interactions.compareOpen ? <CompareModal items={interactions.comparedVehicles} onClose={() => interactions.setCompareOpen(false)} onRemove={interactions.removeCompareItem} onConsultation={interactions.openConsultation} /> : null}
      {interactions.consultVehicleId !== undefined ? <ConsultationModal selectedVehicle={interactions.selectedConsultVehicle} onClose={interactions.closeConsultation} source={interactions.consultSource} onSubmitLead={addLead} /> : null}
    </>
  );
}
