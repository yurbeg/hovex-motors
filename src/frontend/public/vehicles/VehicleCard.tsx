import { ArrowRight, ArrowsLeftRight, Check, GasPump, Gauge, WarningCircle } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { vehicleBadgeToneClasses } from "../shared/styles";
import { classNames, formatUsdRange, handleVehicleImageError } from "../shared/utils";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

interface VehicleCardProps {
  vehicle: Vehicle;
  isCompared: boolean;
  onCompare: (vehicleId: string) => void;
  onDetails: (vehicle: Vehicle) => void;
  onConsultation: ConsultationHandler;
}

export function VehicleCard({ vehicle, isCompared, onCompare, onDetails, onConsultation }: VehicleCardProps) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-[17px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_24px_rgba(17,17,15,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-[var(--shadow-sm)]">
      <div className="relative h-[250px] overflow-hidden bg-[#d7d2c8] max-[1240px]:h-[225px] max-[800px]:h-[245px]">
        <img className="h-full w-full bg-[#171715] object-contain transition-transform duration-300 group-hover:scale-[1.025]" src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} loading="lazy" decoding="async" onError={handleVehicleImageError} />
        {vehicle.badge.trim() ? <span className={classNames("absolute top-[13px] left-[13px] z-[2] rounded-full px-2.5 py-2 text-[11px] leading-none font-bold", vehicleBadgeToneClasses[vehicle.accent] ?? vehicleBadgeToneClasses.black)}>{vehicle.badge}</span> : null}
        <InventoryStatusBadge className="absolute top-[13px] right-[13px] z-[2] max-w-[48%] overflow-hidden text-ellipsis shadow-[0_3px_12px_rgba(17,17,15,0.12)]" status={vehicle.inventoryStatus} />
        <button type="button" className={classNames("absolute right-[13px] bottom-[13px] z-[2] flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.7)] bg-[rgba(17,17,15,0.86)] px-[11px] text-[11px] leading-none font-bold text-white", isCompared && "border-[var(--yellow)] bg-[var(--yellow)] text-[var(--ink)]")} aria-pressed={isCompared} onClick={() => onCompare(vehicle.id)}>
          {isCompared ? <Check size={17} weight="bold" /> : <ArrowsLeftRight size={17} weight="bold" />}
          {isCompared ? "Ընտրված է" : "Համեմատել"}
        </button>
      </div>
      <div className="p-[19px]">
        <div className="flex items-start justify-between gap-3 max-[420px]:flex-col [&_p]:m-0 [&_p]:mb-[3px] [&_p]:text-xs [&_p]:font-bold [&_p]:text-[var(--ink-soft)] [&_h3]:m-0 [&_h3]:text-xl [&_h3]:leading-[1.3]">
          <div><p>{vehicle.year} • {vehicle.body}</p><h3>{vehicle.make} {vehicle.model}</h3></div>
          <span className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-[var(--surface-soft)] px-[9px] py-[7px] text-[10px] font-bold text-[var(--ink-soft)] max-[420px]:self-start"><GasPump size={16} weight="fill" />{vehicle.fuel}</span>
        </div>
        <div className="mt-[15px] grid min-h-[57px] grid-cols-[0.8fr_1.2fr] gap-[9px] max-[800px]:min-h-0 max-[420px]:grid-cols-1 [&_span]:flex [&_span]:min-w-0 [&_span]:items-start [&_span]:gap-1.5 [&_span]:text-xs [&_span]:leading-[1.45] [&_span]:text-[var(--ink-soft)] [&_svg]:shrink-0 [&_svg]:text-[#8a7b57]">
          <span><Gauge size={18} />{vehicle.mileage}</span>
          <span><WarningCircle size={18} />{vehicle.damage}</span>
        </div>
        <div className="mt-[13px] rounded-xl border border-[#eadca8] bg-[var(--yellow-pale)] px-3.5 py-[13px] [&>*]:m-0 [&>*]:block">
          <p className="text-[11px] font-bold">Հայաստան հասցնելու նախնական արժեք</p>
          <strong className="mt-1 text-[21px] leading-[1.3]">{formatUsdRange(vehicle.estimateMin, vehicle.estimateMax)}</strong>
          <small className="mt-1 text-[10px] leading-[1.4] text-[#76653a]">Վերջնական հաշվարկը հաստատում է մասնագետը</small>
        </div>
        <div className="mt-[15px] flex items-center justify-between gap-2.5">
          <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 py-2 text-xs font-bold" onClick={() => onDetails(vehicle)}>Մանրամասներ <ArrowRight size={17} weight="bold" /></button>
          <Button className="min-h-10 rounded-[10px] px-3.5 text-xs" variant="secondary" onClick={() => onConsultation(vehicle.id)}>Խորհրդակցել</Button>
        </div>
      </div>
    </article>
  );
}
