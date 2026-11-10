import { ArrowCounterClockwise, ArrowRight, ChatCircleText, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import type { PublicInventoryCounts, PublicInventoryFilter } from "../../../application/publicInventory";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler, SearchCriteria, SearchState } from "../shared/types";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses, sectionTitleClasses } from "../shared/styles";
import { classNames, formatUsd } from "../shared/utils";
import { InventoryStatusFilter } from "../vehicles/InventoryStatusFilter";
import { VehicleCard } from "../vehicles/VehicleCard";
import { VehicleGridSkeleton } from "../vehicles/VehicleGridSkeleton";

interface SearchResultsProps {
  results: Vehicle[];
  state: SearchState;
  criteria: SearchCriteria;
  inventoryFilter: PublicInventoryFilter;
  inventoryCounts: PublicInventoryCounts;
  compared: string[];
  onInventoryFilterChange: (value: PublicInventoryFilter) => void;
  onCompare: (vehicleId: string) => void;
  onDetails: (vehicle: Vehicle) => void;
  onConsultation: ConsultationHandler;
  onReset: () => void;
}

export function SearchResults({ results, state, criteria, inventoryFilter, inventoryCounts, compared, onInventoryFilterChange, onCompare, onDetails, onConsultation, onReset }: SearchResultsProps) {
  const sectionClasses = classNames(pageShellClasses, "pt-[70px] pb-[90px] max-[800px]:pt-[53px] max-[800px]:pb-[68px]");
  if (state === "loading") {
    return <section className={sectionClasses} id="vehicles" aria-live="polite"><div className="mb-7"><div><p className={eyebrowClasses}><span />Անհատական որոնում</p><h2 className={sectionTitleClasses}>Փնտրում ենք համապատասխան տարբերակները…</h2></div></div><InventoryStatusFilter className="mb-6" value={inventoryFilter} counts={inventoryCounts} onChange={onInventoryFilterChange} /><VehicleGridSkeleton count={3} /></section>;
  }

  return (
    <section className={sectionClasses} id="vehicles" aria-live="polite">
      <div className="mb-7 flex items-end justify-between gap-[30px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-3.5">
        <div><p className={eyebrowClasses}><span />Ընտրված Hovex-ի մոտեցմամբ</p><h2 className={sectionTitleClasses}>{state === "searched" ? "Ձեզ համապատասխան տարբերակներ" : "Սկսելու հնարավոր տարբերակներ"}</h2><p className="mt-2.5 mb-0 text-[15px] leading-[1.55] text-[var(--ink-soft)]">{state === "searched" ? `${results.length} ցուցադրական տարբերակ • մինչև ${formatUsd(Number(criteria.budget || 0))}` : "Մեքենաները և արժեքները ցուցադրական են՝ որոնման փորձը ներկայացնելու համար։"}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2.5 max-[800px]:justify-start"><span className="inline-flex items-center gap-[7px] rounded-full border border-[var(--orange-border)] bg-[var(--orange-pale)] px-[13px] py-2.5 text-[11px] font-bold whitespace-nowrap text-[var(--orange-ink)] max-[800px]:whitespace-normal"><WarningCircle size={18} weight="fill" /> Ոչ հրապարակային առաջարկ</span><a className="inline-flex min-h-[41px] items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[11px] font-bold hover:border-[var(--ink)]" href="/catalog">Ամբողջ կատալոգը <ArrowRight size={17} weight="bold" /></a></div>
      </div>
      <InventoryStatusFilter className="mb-6" value={inventoryFilter} counts={inventoryCounts} onChange={onInventoryFilterChange} />
      {results.length ? <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">{results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} isCompared={compared.includes(vehicle.id)} onCompare={onCompare} onDetails={onDetails} onConsultation={onConsultation} />)}</div> : <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-[38px] text-center max-[800px]:px-[18px] max-[800px]:py-[30px]"><span className="grid h-[66px] w-[66px] place-items-center rounded-full bg-[var(--yellow-pale)]"><MagnifyingGlass size={33} weight="bold" /></span><h3 className="mt-[19px] mb-[7px] text-[23px]">Այս չափանիշներով տարբերակ չգտանք</h3><p className="m-0 max-w-[580px] leading-[1.6] text-[var(--ink-soft)]">Փորձեք փոխել գտնվելու վիճակը, բյուջեն կամ տարեթիվը, կամ ուղարկել անհատական հարցում։</p><div className="mt-[21px] flex gap-2.5 max-[800px]:w-full max-[800px]:flex-col"><Button icon={ArrowCounterClockwise} onClick={onReset}>Վերականգնել ֆիլտրերը</Button><Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Անհատական հարցում</Button></div></div>}
    </section>
  );
}
