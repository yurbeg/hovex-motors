import { ArrowRight, ArrowsLeftRight, Check, Phone } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import { formatUsdRange, handleVehicleImageError } from "../shared/utils";
import { inventoryStatusLabel } from "../vehicles/InventoryStatusBadge";

interface AssistantVehicleCardProps {
  vehicle: Vehicle;
  compared: boolean;
  onDetails: (vehicle: Vehicle) => void;
  onCompare: (vehicleId: string) => void;
  onConsultation: (vehicleId: string) => void;
}

export function AssistantVehicleCard({ vehicle, compared, onDetails, onCompare, onConsultation }: AssistantVehicleCardProps) {
  return (
    <article className="grid grid-cols-[91px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#ded9d0] bg-white shadow-[0_7px_20px_rgba(17,17,15,0.055)] max-[420px]:grid-cols-[82px_minmax(0,1fr)]">
      <img className="row-span-2 h-[102px] w-[91px] bg-[#e8e4dd] object-cover max-[420px]:w-[82px]" src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} onError={handleVehicleImageError} />
      <div className="grid min-w-0 px-2.5 pt-[9px] pb-1.5"><p className="m-0 overflow-hidden text-[7px] text-ellipsis whitespace-nowrap text-[#89837a]">{vehicle.year} · {vehicle.body} · {vehicle.fuel}</p><h4 className="mt-0.5 mb-[3px] overflow-hidden text-[10px] leading-tight text-ellipsis whitespace-nowrap">{vehicle.make} {vehicle.model}</h4><span className="mb-0.5 inline-flex w-fit items-center gap-1 text-[7px] font-extrabold text-[#5f5a52]"><i className="size-1 rounded-full bg-[#c99500]" aria-hidden="true" />{inventoryStatusLabel(vehicle.inventoryStatus)}</span><strong className="text-[11px]">{formatUsdRange(vehicle.estimateMin, vehicle.estimateMax)}</strong><span className="text-[7px] text-[#8d877e]">Նախնական արժեք Հայաստանում</span></div>
      <div className="flex items-center justify-end gap-[5px] pt-[5px] pr-2 pb-2 pl-2.5"><button type="button" className="mr-auto inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border border-transparent bg-white py-0 pr-[7px] pl-0 text-[7px] font-extrabold text-[#3e3b36]" onClick={() => onDetails(vehicle)}>Մանրամասներ <ArrowRight size={14} weight="bold" /></button><button type="button" className={`inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border px-[7px] py-0 text-[7px] font-extrabold ${compared ? "border-[#ffc400] bg-[#ffc400] text-[#11110f]" : "border-[#ded9d0] bg-white text-[#3e3b36]"}`} onClick={() => onCompare(vehicle.id)} aria-pressed={compared} aria-label={`${vehicle.make} ${vehicle.model}-ը համեմատել`}>{compared ? <Check size={15} weight="bold" /> : <ArrowsLeftRight size={15} weight="bold" />}</button><button type="button" className="inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border border-[#1c1b18] bg-[#1c1b18] px-[7px] py-0 text-[7px] font-extrabold text-white" onClick={() => onConsultation(vehicle.id)} aria-label={`${vehicle.make} ${vehicle.model}-ի շուրջ խորհրդակցել`}><Phone size={15} weight="fill" /></button></div>
    </article>
  );
}
