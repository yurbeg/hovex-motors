import {
  ArrowCounterClockwise,
  Car,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AuctionCatalogLot } from "../../../domain/auctionCatalog";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";
import { VehicleGridSkeleton } from "../vehicles/VehicleGridSkeleton";
import { AuctionVehicleCard } from "./AuctionVehicleCard";
import { CatalogPagination } from "./CatalogPagination";

interface CatalogResultsProps {
  loading: boolean;
  error: string | null;
  items: AuctionCatalogLot[];
  total: number;
  page: number;
  pageCount: number;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
}

export function CatalogResults({
  loading,
  error,
  items,
  total,
  page,
  pageCount,
  hasActiveFilters,
  onRetry,
  onReset,
  onPageChange,
}: CatalogResultsProps) {
  return (
    <section className={classNames(pageShellClasses, "pt-9 pb-16 max-[800px]:pt-7 max-[800px]:pb-12")} id="catalog-results" aria-busy={loading}>
      <div className="mb-6 flex items-end justify-between gap-5 max-[800px]:items-start max-[560px]:flex-col max-[560px]:gap-3">
        <div>
          <p className={eyebrowClasses}><span />Ակտիվ Copart լոտեր</p>
          <h2 className="m-0 text-[clamp(27px,3vw,38px)] leading-[1.26] font-bold">Հասանելի մեքենաներ</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] font-bold" role="status" aria-live="polite" aria-atomic="true">
          {loading ? "Կատալոգը բեռնվում է" : `${total} ակտիվ լոտ`}
        </span>
      </div>

      {error ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[20px] border border-[var(--red-border)] bg-[var(--red-pale)] p-10 text-center" role="alert">
          <span className="grid size-[68px] place-items-center rounded-full bg-[var(--red-pale)] text-[var(--red-ink)]"><WarningCircle size={35} weight="fill" aria-hidden="true" /></span>
          <h3 className="mt-5 mb-2 text-2xl">Կատալոգը հիմա չբեռնվեց</h3>
          <p className="m-0 max-w-[580px] text-sm leading-[1.65] text-[var(--ink-soft)]">{error}</p>
          <Button className="mt-5" icon={ArrowCounterClockwise} onClick={onRetry}>Կրկին փորձել</Button>
        </div>
      ) : loading ? (
        <div role="status" aria-label="Copart մեքենաների կատալոգը բեռնվում է"><VehicleGridSkeleton count={6} /></div>
      ) : items.length ? (
        <>
          <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">
            {items.map((lot) => <AuctionVehicleCard key={lot.id} lot={lot} />)}
          </div>
          <CatalogPagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </>
      ) : (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-10 text-center">
          <span className="grid size-[68px] place-items-center rounded-full bg-[var(--yellow-pale)]">
            {hasActiveFilters ? <MagnifyingGlass size={34} weight="bold" aria-hidden="true" /> : <Car size={34} weight="bold" aria-hidden="true" />}
          </span>
          <h3 className="mt-5 mb-2 text-2xl">{hasActiveFilters ? "Այս ֆիլտրերով լոտ չգտնվեց" : "Ակտիվ Copart լոտեր դեռ չկան"}</h3>
          <p className="m-0 max-w-[580px] text-sm leading-[1.65] text-[var(--ink-soft)]">{hasActiveFilters ? "Փոխեք որոնման չափանիշները և կրկին փորձեք։" : "Առաջին հաջող ներմուծումից հետո լոտերն այստեղ կհայտնվեն։"}</p>
          {hasActiveFilters ? <Button className="mt-5" icon={ArrowCounterClockwise} onClick={onReset}>Մաքրել ֆիլտրերը</Button> : null}
        </div>
      )}
    </section>
  );
}
