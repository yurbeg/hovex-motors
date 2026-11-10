import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { loadPublicVehicles } from "../../application/publicCatalog";
import {
  countPublicInventoryVehicles,
  filterPublicInventoryVehicles,
  publicInventoryFilterFromSearch,
  publicInventorySearchWithFilter,
  type PublicInventoryFilter,
} from "../../application/publicInventory";
import type { Vehicle } from "../../domain/vehicle";
import { getVehicles, subscribeVehicles } from "../../infrastructure/browser/adminStore";
import { submitPublicLead } from "../../infrastructure/supabase/publicLeadRepository";
import { AiAssistant } from "./assistant/AiAssistant";
import type { SearchCriteria, SearchState } from "./shared/types";
import { DEFAULT_SEARCH_CRITERIA } from "./shared/types";
import { scrollToId } from "./shared/utils";
import { usePublicInteractions } from "./hooks/usePublicInteractions";
import { PublicHeader } from "./layout/PublicHeader";
import { PublicFooter } from "./layout/PublicFooter";
import { MobileActionBar } from "./layout/MobileActionBar";
import { Hero } from "./home/Hero";
import { VehicleFinder } from "./home/VehicleFinder";
import { CostStrip } from "./home/CostStrip";
import { SearchResults } from "./home/SearchResults";
import { HowItWorks } from "./home/HowItWorks";
import { ConsultationBanner } from "./consultation/ConsultationBanner";
import { TransparencySection } from "./home/TransparencySection";
import { SocialProof } from "./home/SocialProof";
import { Faq } from "./home/Faq";
import { CompareBar } from "./vehicles/CompareBar";
import { Notice } from "./shared/Notice";
import { VehicleDetailsModal } from "./vehicles/VehicleDetailsModal";
import { CompareModal } from "./vehicles/CompareModal";
import { ConsultationModal } from "./consultation/ConsultationModal";

export function HomeApp() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>(() => getVehicles());
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<SearchCriteria>(criteria);
  const [inventoryFilter, setInventoryFilter] = useState<PublicInventoryFilter>(() => (
    typeof window === "undefined"
      ? "all"
      : publicInventoryFilterFromSearch(window.location.search)
  ));
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const searchTimerRef = useRef<number | undefined>(undefined);
  const vehicles = useMemo(() => allVehicles.filter((vehicle) => vehicle.status === "published"), [allVehicles]);
  const interactions = usePublicInteractions(vehicles);
  const makes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean))].sort((left, right) => left.localeCompare(right, "hy")), [vehicles]);

  useEffect(() => {
    const reconcileMake = (current: SearchCriteria): SearchCriteria => (
      current.make === "all" || makes.includes(current.make)
        ? current
        : { ...current, make: "all" }
    );
    setCriteria(reconcileMake);
    setAppliedCriteria(reconcileMake);
  }, [makes]);

  useEffect(() => {
    let active = true;
    let remoteCatalogLoaded = false;
    const controller = new AbortController();
    const unsubscribe = subscribeVehicles((items) => {
      if (active && !remoteCatalogLoaded) setAllVehicles(items);
    });

    void loadPublicVehicles({ signal: controller.signal }).then((result) => {
      if (!active || controller.signal.aborted) return;
      remoteCatalogLoaded = result.source === "supabase";
      setAllVehicles(result.items);
      if (result.error) console.warn("Supabase catalog unavailable; using local demo vehicles.", result.error);
    });

    return () => {
      active = false;
      controller.abort();
      unsubscribe();
    };
  }, []);

  useEffect(() => () => window.clearTimeout(searchTimerRef.current), []);

  useEffect(() => {
    const handlePopState = (): void => {
      setInventoryFilter(publicInventoryFilterFromSearch(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const search = publicInventorySearchWithFilter(window.location.search, inventoryFilter);
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [inventoryFilter]);

  const results = useMemo(() => {
    const budget = Number(appliedCriteria.budget) || Number.POSITIVE_INFINITY;
    const yearFrom = Number(appliedCriteria.yearFrom);
    const yearTo = Number(appliedCriteria.yearTo);
    return vehicles.filter((vehicle) => {
      const inBudget = vehicle.estimateMax <= budget;
      const inYear = vehicle.year >= yearFrom && vehicle.year <= yearTo;
      const inMake = appliedCriteria.make === "all" || vehicle.make === appliedCriteria.make;
      return inBudget && inYear && inMake;
    });
  }, [appliedCriteria, vehicles]);

  const inventoryBaseVehicles = searchState === "searched" ? results : vehicles;
  const inventoryCounts = useMemo(
    () => countPublicInventoryVehicles(inventoryBaseVehicles),
    [inventoryBaseVehicles],
  );
  const inventoryResults = useMemo(
    () => filterPublicInventoryVehicles(inventoryBaseVehicles, inventoryFilter),
    [inventoryBaseVehicles, inventoryFilter],
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const from = Number(criteria.yearFrom);
    const to = Number(criteria.yearTo);
    if (from > to) {
      interactions.showNotice("Սկզբնական տարեթիվը չի կարող մեծ լինել վերջնականից։");
      return;
    }
    setSearchState("loading");
    scrollToId("vehicles");
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setAppliedCriteria(criteria);
      setSearchState("searched");
    }, 650);
  };

  const resetFilters = (): void => {
    setCriteria(DEFAULT_SEARCH_CRITERIA);
    setAppliedCriteria(DEFAULT_SEARCH_CRITERIA);
    setInventoryFilter("all");
    setSearchState("idle");
    window.setTimeout(() => scrollToId("finder"), 0);
  };

  const changeInventoryFilter = (nextFilter: PublicInventoryFilter): void => {
    setInventoryFilter(nextFilter);
    window.setTimeout(() => scrollToId("vehicles"), 0);
  };

  const openFinder = (): void => {
    interactions.setAssistantOpen(false);
    scrollToId("finder");
  };

  return (
    <>
      <PublicHeader onConsultation={interactions.openConsultation} />
      <main>
        <Hero onConsultation={interactions.openConsultation} />
        <VehicleFinder criteria={criteria} setCriteria={setCriteria} onSearch={handleSearch} isLoading={searchState === "loading"} makes={makes} />
        <CostStrip />
        <SearchResults results={inventoryResults} state={searchState} criteria={appliedCriteria} inventoryFilter={inventoryFilter} inventoryCounts={inventoryCounts} compared={interactions.compared} onInventoryFilterChange={changeInventoryFilter} onCompare={interactions.toggleCompare} onDetails={interactions.setDetailVehicle} onConsultation={interactions.openConsultation} onReset={resetFilters} />
        <HowItWorks />
        <ConsultationBanner onConsultation={interactions.openConsultation} />
        <TransparencySection onConsultation={interactions.openConsultation} />
        <SocialProof />
        <Faq />
      </main>
      <PublicFooter />
      <AiAssistant open={interactions.assistantOpen} onOpenChange={interactions.setAssistantOpen} vehicles={vehicles} criteria={criteria} compared={interactions.compared} onVehicleDetails={interactions.setDetailVehicle} onCompare={interactions.toggleCompare} onConsultation={(id) => interactions.openConsultation(id, "ai-assistant")} onOpenFinder={() => window.location.assign("/catalog")} />
      <MobileActionBar page="home" assistantOpen={interactions.assistantOpen} onOpenAssistant={() => interactions.setAssistantOpen(true)} onConsultation={() => interactions.openConsultation(null)} onPrimaryAction={openFinder} />
      {interactions.compared.length ? <CompareBar count={interactions.compared.length} onOpen={interactions.openCompare} onClear={() => interactions.setCompared([])} /> : null}
      <Notice message={interactions.notice} />
      {interactions.detailVehicle ? <VehicleDetailsModal vehicle={interactions.detailVehicle} onClose={() => interactions.setDetailVehicle(null)} onConsultation={interactions.openConsultation} isCompared={interactions.compared.includes(interactions.detailVehicle.id)} onCompare={interactions.toggleCompare} /> : null}
      {interactions.compareOpen ? <CompareModal items={interactions.comparedVehicles} onClose={() => interactions.setCompareOpen(false)} onRemove={interactions.removeCompareItem} onConsultation={interactions.openConsultation} /> : null}
      {interactions.consultVehicleId !== undefined ? <ConsultationModal selectedVehicle={interactions.selectedConsultVehicle} onClose={interactions.closeConsultation} source={interactions.consultSource} onSubmitLead={submitPublicLead} /> : null}
    </>
  );
}
