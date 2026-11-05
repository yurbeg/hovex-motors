import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { MagnifyingGlass, SpinnerGap, SteeringWheel } from "@phosphor-icons/react";
import type { SearchCriteria } from "../shared/types";
import { Button } from "../shared/Button";
import { formFieldClasses, pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

interface VehicleFinderProps {
  criteria: SearchCriteria;
  setCriteria: Dispatch<SetStateAction<SearchCriteria>>;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  makes: string[];
}

export function VehicleFinder({ criteria, setCriteria, onSearch, isLoading, makes }: VehicleFinderProps) {
  const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
  const update = (key: keyof SearchCriteria) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setCriteria((current) => ({ ...current, [key]: event.target.value }));
  };

  return (
    <section className={classNames(pageShellClasses, "relative z-[5] -mt-[34px] max-[800px]:mt-3.5")} id="finder" aria-labelledby="finder-title">
      <form className="grid min-h-[142px] grid-cols-[205px_1.05fr_1fr_1.05fr_205px] items-end gap-[18px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-[22px] shadow-[var(--shadow-lg)] max-[1240px]:grid-cols-[180px_1fr_1fr_1fr_180px] max-[1240px]:gap-[13px] max-[1240px]:p-[18px] max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1 max-[800px]:gap-3.5 max-[800px]:rounded-2xl max-[800px]:p-[17px] max-[800px]:shadow-[var(--shadow-sm)]" onSubmit={onSearch}>
        <div className="flex self-center items-center gap-3 max-[1080px]:col-span-full max-[800px]:col-auto [&_p]:m-0 [&_p]:text-xs [&_p]:font-bold [&_p]:text-[var(--ink-soft)] [&_h2]:mt-[3px] [&_h2]:mb-0 [&_h2]:text-[17px] [&_h2]:leading-[1.35] max-[1240px]:[&_h2]:text-[15px] max-[800px]:[&_h2]:text-[17px]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] bg-[var(--yellow)]"><SteeringWheel size={24} weight="bold" /></span><div><p>Անվճար որոնում</p><h2 id="finder-title">Սկսենք ձեր բյուջեից</h2></div></div>
        <label className={formFieldClasses}><span>Ընդհանուր բյուջե Հայաստանում</span><span className="relative block"><span className="absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-[17px]">$</span><input className="!pl-[39px]" type="number" min="6000" step="500" inputMode="numeric" value={criteria.budget} onChange={update("budget")} aria-describedby="budget-help" disabled={isLoading} required /></span><small id="budget-help">Ներառյալ գնումը, առաքումն ու ծառայությունը</small></label>
        <div className={formFieldClasses}><span>Տարեթիվ</span><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 [&_select]:!px-[11px]"><label><span className="sr-only">Տարեթիվ՝ սկսած</span><select value={criteria.yearFrom} onChange={update("yearFrom")} disabled={isLoading}>{years.slice().reverse().map((year) => <option key={year}>{year}</option>)}</select></label><span>—</span><label><span className="sr-only">Տարեթիվ՝ մինչև</span><select value={criteria.yearTo} onChange={update("yearTo")} disabled={isLoading}>{years.map((year) => <option key={year}>{year}</option>)}</select></label></div><small>Ընտրեք ցանկալի միջակայքը</small></div>
        <label className={classNames(formFieldClasses, "max-[1080px]:col-start-1 max-[1080px]:col-end-2 max-[800px]:col-auto")}><span>Մակնիշ կամ մոդել</span><select value={criteria.make} onChange={update("make")} disabled={isLoading}><option value="all">Բոլոր մակնիշները</option>{makes.map((make) => <option key={make} value={make}>{make}</option>)}</select><small>Դաշտը պարտադիր չէ</small></label>
        <Button className="mb-[22px] min-h-[52px] max-[800px]:m-0 max-[800px]:w-full" type="submit" icon={isLoading ? SpinnerGap : MagnifyingGlass} disabled={isLoading}>{isLoading ? "Փնտրում ենք…" : "Գտնել մեքենաներ"}</Button>
      </form>
    </section>
  );
}
