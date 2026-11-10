import { ArrowCounterClockwise, ArrowRight, ChatCircleText, CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler, SearchCriteria, SearchState } from "../shared/types";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses, sectionTitleClasses } from "../shared/styles";
import { classNames, formatUsd } from "../shared/utils";
import { VehicleCard } from "../vehicles/VehicleCard";
import { VehicleGridSkeleton } from "../vehicles/VehicleGridSkeleton";

interface SearchResultsProps {
  results: Vehicle[];
  state: SearchState;
  criteria: SearchCriteria;
  compared: string[];
  onCompare: (vehicleId: string) => void;
  onConsultation: ConsultationHandler;
  onReset: () => void;
}

export function SearchResults({ results, state, criteria, compared, onCompare, onConsultation, onReset }: SearchResultsProps) {
  const sectionClasses = classNames(pageShellClasses, "pt-[70px] pb-[90px] max-[800px]:pt-[53px] max-[800px]:pb-[68px]");
  if (state === "loading") {
    return <section className={sectionClasses} id="vehicles" aria-live="polite"><div className="mb-7"><div><p className={eyebrowClasses}><span />Անհատական որոնում</p><h2 className={sectionTitleClasses}>Փնտրում ենք համապատասխան տարբերակները…</h2></div></div><VehicleGridSkeleton count={3} /></section>;
  }

  return (
    <section className={sectionClasses} id="vehicles" aria-live="polite">
      <div className="mb-7 flex items-end justify-between gap-[30px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-3.5">
        <div><p className={eyebrowClasses}><span />Hovex-ում առկա</p><h2 className={sectionTitleClasses}>{state === "searched" ? "Ձեզ համապատասխան մեքենաներ" : "Առկա մեքենաներ"}</h2><p className="mt-2.5 mb-0 text-[15px] leading-[1.55] text-[var(--ink-soft)]">{state === "searched" ? `${results.length} առկա մեքենա • մինչև ${formatUsd(Number(criteria.budget || 0))}` : "Դիտեք Hovex-ում առկա և անմիջապես հասանելի մեքենաները։"}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2.5 max-[800px]:justify-start"><span className="inline-flex min-h-[41px] items-center gap-[7px] rounded-full border border-[var(--green-border)] bg-[var(--green-pale)] px-[13px] py-2.5 text-[11px] font-bold whitespace-nowrap text-[var(--green-ink)] max-[800px]:whitespace-normal"><CheckCircle size={18} weight="fill" /> Hovex-ում առկա</span><a className="inline-flex min-h-[41px] items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[11px] font-bold hover:border-[var(--ink)]" href="/catalog">Copart կատալոգը <ArrowRight size={17} weight="bold" /></a></div>
      </div>
      {results.length ? <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">{results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} isCompared={compared.includes(vehicle.id)} onCompare={onCompare} onConsultation={onConsultation} />)}</div> : <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-[38px] text-center max-[800px]:px-[18px] max-[800px]:py-[30px]"><span className="grid h-[66px] w-[66px] place-items-center rounded-full bg-[var(--yellow-pale)]"><MagnifyingGlass size={33} weight="bold" /></span><h3 className="mt-[19px] mb-[7px] text-[23px]">{state === "searched" ? "Այս չափանիշներով տարբերակ չգտանք" : "Առկա մեքենաներ դեռ չկան"}</h3><p className="m-0 max-w-[580px] leading-[1.6] text-[var(--ink-soft)]">{state === "searched" ? "Փորձեք փոխել բյուջեն, տարեթիվը կամ մակնիշը, կամ ուղարկել անհատական հարցում։" : "Նոր առկա մեքենաները կհայտնվեն այստեղ։ Մինչ այդ կարող եք դիտել Copart կատալոգը կամ ուղարկել անհատական հարցում։"}</p><div className="mt-[21px] flex gap-2.5 max-[800px]:w-full max-[800px]:flex-col"><Button icon={ArrowCounterClockwise} onClick={onReset}>Վերականգնել ֆիլտրերը</Button><Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Անհատական հարցում</Button></div></div>}
    </section>
  );
}
