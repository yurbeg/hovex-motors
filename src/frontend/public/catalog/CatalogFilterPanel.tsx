import type { ChangeEvent } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type { CatalogFilters } from "../shared/types";
import { DEFAULT_CATALOG_FILTERS } from "../shared/types";
import { formFieldClasses, pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

interface CatalogFilterPanelProps {
  filters: CatalogFilters;
  makes: string[];
  years: number[];
  onChange: (filters: CatalogFilters) => void;
}

export function CatalogFilterPanel({ filters, makes, years, onChange }: CatalogFilterPanelProps) {
  const hasActiveFilters = filters.query !== "" || filters.make !== "all" || filters.yearFrom !== "all" || filters.maxBudget !== "" || filters.sort !== "recommended";
  const updateFilter = (key: keyof CatalogFilters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...filters, [key]: event.target.value });
  return <section className={classNames(pageShellClasses, "relative z-[5] mt-6")} id="catalog-filters" aria-labelledby="catalog-filter-title"><div className="rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)] max-[800px]:p-4"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="m-0 text-[10px] font-black uppercase tracking-[0.08em] text-[#8b6b00]">Արագ որոնում</p><h2 className="mt-1 mb-0 text-xl" id="catalog-filter-title">Գտեք համապատասխան մեքենան</h2></div>{hasActiveFilters ? <button className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-[11px] font-bold text-[#6d675f]" type="button" onClick={() => onChange(DEFAULT_CATALOG_FILTERS)}><ArrowCounterClockwise size={17} weight="bold" />Մաքրել</button> : null}</div><div className="grid grid-cols-[1.55fr_repeat(4,minmax(0,1fr))] gap-3.5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1"><label className={formFieldClasses}><span>Մակնիշ կամ մոդել</span><input type="search" value={filters.query} onChange={updateFilter("query")} placeholder="Օրինակ՝ Toyota Camry" /><small>Որոնում ամբողջ կատալոգում</small></label><label className={formFieldClasses}><span>Մակնիշ</span><select value={filters.make} onChange={updateFilter("make")}><option value="all">Բոլոր մակնիշները</option>{filters.make !== "all" && !makes.includes(filters.make) ? <option value={filters.make}>{filters.make}</option> : null}{makes.map((make) => <option key={make} value={make}>{make}</option>)}</select><small>{makes.length} հասանելի մակնիշ</small></label><label className={formFieldClasses}><span>Տարեթիվ՝ սկսած</span><select value={filters.yearFrom} onChange={updateFilter("yearFrom")}><option value="all">Բոլոր տարիները</option>{filters.yearFrom !== "all" && !years.includes(Number(filters.yearFrom)) ? <option value={filters.yearFrom}>{filters.yearFrom}</option> : null}{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><small>Նվազագույն տարեթիվ</small></label><label className={formFieldClasses}><span>Բյուջե՝ մինչև</span><span className="relative block"><span className="absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-[17px]">$</span><input className="!pl-[39px]" type="number" min="0" step="500" inputMode="numeric" value={filters.maxBudget} onChange={updateFilter("maxBudget")} placeholder="Ցանկացած" /></span><small>Հայաստան հասցնելու գնահատական</small></label><label className={formFieldClasses}><span>Դասավորել</span><select value={filters.sort} onChange={updateFilter("sort")}><option value="recommended">Առաջարկվող հերթով</option><option value="newest">Վերջին ավելացվածները</option><option value="price-asc">Գինը՝ ցածրից բարձր</option><option value="price-desc">Գինը՝ բարձրից ցածր</option></select><small>Փոխեք ցուցադրման հերթը</small></label></div></div></section>;
}
