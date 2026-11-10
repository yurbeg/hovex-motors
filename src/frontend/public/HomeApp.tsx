import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { vehicleDetailsPath } from "../../app/routes";
import { loadPublicVehicles } from "../../application/publicCatalog";
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
import { CompareModal } from "./vehicles/CompareModal";
import { ConsultationModal } from "./consultation/ConsultationModal";

export function HomeApp() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>(() => getVehicles());
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<SearchCriteria>(criteria);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const searchTimerRef = useRef<number | undefined>(undefined);
  const vehicles = useMemo(() => allVehicles.filter((vehicle) => (
    vehicle.status === "published" && vehicle.inventoryStatus === "available"
  )), [allVehicles]);
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

  const displayedVehicles = searchState === "searched" ? results : vehicles;

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
    setSearchState("idle");
    window.setTimeout(() => scrollToId("finder"), 0);
  };

  const openFinder = (): void => {
    interactions.setAssistantOpen(false);
    scrollToId("finder");
  };

  const openVehicleDetails = (vehicle: Vehicle): void => {
    window.location.assign(vehicleDetailsPath(vehicle.id));
  };

  return (
    <>
      <PublicHeader onConsultation={interactions.openConsultation} />
      <main>
        <Hero onConsultation={interactions.openConsultation} />
        <VehicleFinder criteria={criteria} setCriteria={setCriteria} onSearch={handleSearch} isLoading={searchState === "loading"} makes={makes} />
        <CostStrip />
        <SearchResults results={displayedVehicles} state={searchState} criteria={appliedCriteria} compared={interactions.compared} onCompare={interactions.toggleCompare} onConsultation={interactions.openConsultation} onReset={resetFilters} />
        <HowItWorks />
        <ConsultationBanner onConsultation={interactions.openConsultation} />
        <TransparencySection onConsultation={interactions.openConsultation} />
        <SocialProof />
        <Faq />
      </main>
      <PublicFooter />
      <AiAssistant open={interactions.assistantOpen} onOpenChange={interactions.setAssistantOpen} vehicles={vehicles} criteria={criteria} compared={interactions.compared} onVehicleDetails={openVehicleDetails} onCompare={interactions.toggleCompare} onConsultation={(id) => interactions.openConsultation(id, "ai-assistant")} onOpenFinder={() => window.location.assign("/catalog")} />
      <MobileActionBar page="home" assistantOpen={interactions.assistantOpen} onOpenAssistant={() => interactions.setAssistantOpen(true)} onConsultation={() => interactions.openConsultation(null)} onPrimaryAction={openFinder} />
      {interactions.compared.length ? <CompareBar count={interactions.compared.length} onOpen={interactions.openCompare} onClear={() => interactions.setCompared([])} /> : null}
      <Notice message={interactions.notice} />
      {interactions.compareOpen ? <CompareModal items={interactions.comparedVehicles} onClose={() => interactions.setCompareOpen(false)} onRemove={interactions.removeCompareItem} onConsultation={interactions.openConsultation} /> : null}
      {interactions.consultVehicleId !== undefined ? <ConsultationModal selectedVehicle={interactions.selectedConsultVehicle} onClose={interactions.closeConsultation} source={interactions.consultSource} onSubmitLead={submitPublicLead} /> : null}
    </>
  );
}
