import { ArrowCounterClockwise, Car, ChatCircleText, MagnifyingGlass } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { CatalogFilters, ConsultationHandler } from "../shared/types";
import { DEFAULT_CATALOG_FILTERS } from "../shared/types";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";
import { VehicleCard } from "../vehicles/VehicleCard";
import { VehicleGridSkeleton } from "../vehicles/VehicleGridSkeleton";

interface CatalogResultsProps {
  loading: boolean;
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  filters: CatalogFilters;
  compared: string[];
  onFiltersChange: (filters: CatalogFilters) => void;
  onCompare: (vehicleId: string) => void;
  onDetails: (vehicle: Vehicle) => void;
  onConsultation: ConsultationHandler;
}

export function CatalogResults({ loading, vehicles, filteredVehicles, filters, compared, onFiltersChange, onCompare, onDetails, onConsultation }: CatalogResultsProps) {
  return <section className={classNames(pageShellClasses, "pt-9 max-[800px]:pt-7")} id="catalog-results" aria-busy={loading}><div className="mb-6 flex items-end justify-between gap-5 max-[800px]:items-start max-[560px]:flex-col max-[560px]:gap-3"><div><p className={eyebrowClasses}><span />Ամբողջ տեսականին</p><h2 className="m-0 text-[clamp(27px,3vw,38px)] leading-[1.2] font-black">Հասանելի մեքենաներ</h2></div><span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-bold" role="status" aria-live="polite" aria-atomic="true">{loading ? "Կատալոգը բեռնվում է" : `Ցուցադրվում է ${filteredVehicles.length} մեքենա՝ ${vehicles.length}-ից`}</span></div>{loading ? <div role="status" aria-label="Մեքենաների կատալոգը բեռնվում է"><VehicleGridSkeleton count={6} /></div> : vehicles.length === 0 ? <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#c9c3ba] bg-white p-10 text-center"><span className="grid size-[68px] place-items-center rounded-full bg-[var(--yellow-pale)]"><Car size={34} weight="bold" /></span><h3 className="mt-5 mb-2 text-2xl">Հրապարակված մեքենաներ դեռ չկան</h3><p className="m-0 max-w-[560px] text-sm leading-[1.65] text-[var(--ink-soft)]">Նոր առաջարկ հրապարակվելուց հետո այն ինքնաբերաբար կհայտնվի այս կատալոգում։</p><Button className="mt-5" icon={ChatCircleText} onClick={() => onConsultation(null)}>Ուղարկել անհատական հարցում</Button></div> : filteredVehicles.length ? <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">{filteredVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} isCompared={compared.includes(vehicle.id)} onCompare={onCompare} onDetails={onDetails} onConsultation={onConsultation} />)}</div> : <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#c9c3ba] bg-white p-10 text-center"><span className="grid size-[68px] place-items-center rounded-full bg-[var(--yellow-pale)]"><MagnifyingGlass size={33} weight="bold" /></span><h3 className="mt-5 mb-2 text-2xl">Այս ֆիլտրերով մեքենա չգտնվեց</h3><p className="m-0 max-w-[560px] text-sm leading-[1.65] text-[var(--ink-soft)]">Փոխեք մակնիշը, տարեթիվը կամ բյուջեն և կրկին փորձեք։</p><Button className="mt-5" icon={ArrowCounterClockwise} onClick={() => onFiltersChange(DEFAULT_CATALOG_FILTERS)}>Մաքրել ֆիլտրերը</Button></div>}</section>;
}
