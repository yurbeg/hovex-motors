import type { ChangeEvent } from "react";
import { ArrowCounterClockwise, SlidersHorizontal } from "@phosphor-icons/react";
import type {
  AuctionCatalogFacets,
  AuctionCatalogFilters,
} from "../../../domain/auctionCatalog";
import { DEFAULT_AUCTION_CATALOG_FILTERS } from "../../../domain/auctionCatalog";
import { formFieldClasses, pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

interface CatalogFilterPanelProps {
  filters: AuctionCatalogFilters;
  facets: AuctionCatalogFacets;
  facetsLoading: boolean;
  facetsError: boolean;
  onChange: (filters: AuctionCatalogFilters) => void;
}

function optionsWithCurrent(options: readonly string[], current: string): string[] {
  if (current === "all" || options.includes(current)) return [...options];
  return [current, ...options];
}

export function CatalogFilterPanel({
  filters,
  facets,
  facetsLoading,
  facetsError,
  onChange,
}: CatalogFilterPanelProps) {
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => (
    value !== DEFAULT_AUCTION_CATALOG_FILTERS[key as keyof AuctionCatalogFilters]
  ));
  const updateFilter = (key: keyof AuctionCatalogFilters) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => onChange({ ...filters, [key]: event.target.value });
  const years = [...new Set([
    ...facets.years,
    ...(filters.yearFrom !== "all" ? [Number(filters.yearFrom)] : []),
    ...(filters.yearTo !== "all" ? [Number(filters.yearTo)] : []),
  ])].filter(Number.isFinite).sort((left, right) => right - left);

  return (
    <section className={classNames(pageShellClasses, "relative z-[5] mt-6")} id="catalog-filters" aria-labelledby="catalog-filter-title" data-scroll-reveal="up">
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] max-[800px]:p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="m-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--yellow-ink)]"><SlidersHorizontal size={16} weight="bold" aria-hidden="true" /> Copart կատալոգ</p>
            <h2 className="mt-1 mb-0 text-xl" id="catalog-filter-title">Գտեք համապատասխան լոտը</h2>
          </div>
          {hasActiveFilters ? (
            <button className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-2 text-[11px] font-bold text-[var(--ink-soft)]" type="button" onClick={() => onChange(DEFAULT_AUCTION_CATALOG_FILTERS)}>
              <ArrowCounterClockwise size={17} weight="bold" aria-hidden="true" /> Մաքրել
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-3.5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">
          <label className={classNames(formFieldClasses, "col-span-2 max-[800px]:col-span-1")}>
            <span>Մակնիշ, մոդել, VIN կամ լոտ</span>
            <input type="search" value={filters.query} onChange={updateFilter("query")} placeholder="Օրինակ՝ Toyota Camry" maxLength={80} />
            <small>Որոնում ներբեռնված Copart տվյալներում</small>
          </label>

          <label className={formFieldClasses}>
            <span>Մակնիշ</span>
            <select value={filters.make} onChange={updateFilter("make")}>
              <option value="all">Բոլոր մակնիշները</option>
              {optionsWithCurrent(facets.makes, filters.make).map((make) => <option key={make} value={make}>{make}</option>)}
            </select>
            <small>{facetsLoading ? "Բեռնվում է…" : `${facets.makes.length} հասանելի մակնիշ`}</small>
          </label>

          <label className={formFieldClasses}>
            <span>Մոդել</span>
            <select value={filters.model} onChange={updateFilter("model")}>
              <option value="all">Բոլոր մոդելները</option>
              {optionsWithCurrent(facets.models, filters.model).map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
            <small>{filters.make === "all" ? "Ընտրեք կամ որոնեք մոդելը" : `${facets.models.length} հասանելի մոդել`}</small>
          </label>

          <label className={formFieldClasses}>
            <span>Տարեթիվ՝ սկսած</span>
            <select value={filters.yearFrom} onChange={updateFilter("yearFrom")}>
              <option value="all">Ցանկացած</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <small>Նվազագույն տարեթիվ</small>
          </label>

          <label className={formFieldClasses}>
            <span>Տարեթիվ՝ մինչև</span>
            <select value={filters.yearTo} onChange={updateFilter("yearTo")}>
              <option value="all">Ցանկացած</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <small>Առավելագույն տարեթիվ</small>
          </label>

          <label className={formFieldClasses}>
            <span>Թափքի տեսակ</span>
            <select value={filters.bodyType} onChange={updateFilter("bodyType")}>
              <option value="all">Բոլոր տեսակները</option>
              {optionsWithCurrent(facets.bodyTypes, filters.bodyType).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <small>Ըստ հասանելի տվյալների</small>
          </label>

          <label className={formFieldClasses}>
            <span>Վառելիք</span>
            <select value={filters.fuelType} onChange={updateFilter("fuelType")}>
              <option value="all">Բոլոր տեսակները</option>
              {optionsWithCurrent(facets.fuelTypes, filters.fuelType).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <small>Ըստ հասանելի տվյալների</small>
          </label>

          <label className={formFieldClasses}>
            <span>Փոխանցման տուփ</span>
            <select value={filters.transmission} onChange={updateFilter("transmission")}>
              <option value="all">Բոլոր տեսակները</option>
              {optionsWithCurrent(facets.transmissions, filters.transmission).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <small>Ըստ հասանելի տվյալների</small>
          </label>

          <label className={formFieldClasses}>
            <span>Քարշակ</span>
            <select value={filters.driveWheel} onChange={updateFilter("driveWheel")}>
              <option value="all">Բոլոր տեսակները</option>
              {optionsWithCurrent(facets.driveWheels, filters.driveWheel).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <small>Ըստ հասանելի տվյալների</small>
          </label>

          <label className={classNames(formFieldClasses, "col-span-2 max-[1080px]:col-span-1")}>
            <span>Դասավորել</span>
            <select value={filters.sort} onChange={updateFilter("sort")}>
              <option value="sale-date">Մոտակա աճուրդները</option>
              <option value="updated-desc">Վերջին թարմացվածները</option>
              <option value="bid-asc">Ընթացիկ խաղադրույք՝ ցածրից</option>
              <option value="bid-desc">Ընթացիկ խաղադրույք՝ բարձրից</option>
              <option value="buy-now-asc">«Գնել հիմա»՝ ցածրից</option>
              <option value="year-desc">Նոր տարեթվից հին</option>
            </select>
            <small>Բացակայող գները ցուցադրվում են գին ունեցող լոտերից հետո</small>
          </label>
        </div>

        {facetsError ? <p className="mt-4 mb-0 rounded-[10px] border border-[var(--orange-border)] bg-[var(--orange-pale)] px-3.5 py-3 text-[11px] font-bold text-[var(--orange-ink)]" role="status">Ֆիլտրերի տարբերակները հիմա ամբողջությամբ չեն բեռնվել, բայց կատալոգի որոնումը շարունակում է աշխատել։</p> : null}
      </div>
    </section>
  );
}
