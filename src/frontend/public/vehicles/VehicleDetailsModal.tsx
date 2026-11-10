import { ArrowsLeftRight, Car, ChatCircleText, Check, GasPump, Gauge, WarningCircle } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { Modal } from "../shared/Modal";
import { formatUsd, formatUsdRange, handleVehicleImageError } from "../shared/utils";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onConsultation: ConsultationHandler;
  isCompared: boolean;
  onCompare: (vehicleId: string) => void;
}

export function VehicleDetailsModal({ vehicle, onClose, onConsultation, isCompared, onCompare }: VehicleDetailsModalProps) {
  const base = vehicle.estimateMin;
  const breakdown: Array<[string, number]> = [
    ["Մեքենայի գնման սցենար", base * 0.46],
    ["Աճուրդի վճարներ", base * 0.08],
    ["ԱՄՆ տեղափոխում", base * 0.05],
    ["Ծովային առաքում", base * 0.13],
    ["Մաքսային գնահատում", base * 0.21],
    ["Hovex ծառայություն", base * 0.07],
  ];
  return (
    <Modal title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose} size="large">
      <div className="grid min-h-[450px] grid-cols-[0.88fr_1.12fr] max-[800px]:grid-cols-1">
        <div className="relative min-h-[450px] overflow-hidden bg-[var(--surface-muted)] max-[800px]:min-h-[290px] max-[800px]:max-h-[340px] [&_img]:h-full [&_img]:w-full [&_img]:bg-[#171715] [&_img]:object-contain"><img src={vehicle.image} alt={`${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} decoding="async" onError={handleVehicleImageError} /><InventoryStatusBadge className="absolute top-[17px] left-[17px] shadow-[0_3px_12px_rgba(17,17,15,0.12)]" status={vehicle.inventoryStatus} /></div>
        <div className="p-7 max-[800px]:p-5">
          <p className="m-0 text-[11px] font-bold text-[var(--ink-soft)]">{vehicle.auction}</p><h3 className="mt-[5px] mb-5 text-[25px]">{vehicle.badge}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[var(--yellow-ink)] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><Gauge size={19} /><small>Վազք</small><strong>{vehicle.mileage}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[var(--yellow-ink)] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><GasPump size={19} /><small>Վառելիք</small><strong>{vehicle.fuel}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[var(--yellow-ink)] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><Car size={19} /><small>Թափք</small><strong>{vehicle.body}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[var(--yellow-ink)] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><WarningCircle size={19} /><small>Վիճակ</small><strong>{vehicle.damage}</strong></span>
          </div>
          <div className="mt-4 rounded-[13px] border border-[var(--yellow-border)] bg-[var(--yellow-pale)] p-[17px] [&_p]:m-0 [&_p]:text-[11px] [&_p]:font-bold [&>strong]:mt-1 [&>strong]:block [&>strong]:text-[25px] [&>span]:mt-[7px] [&>span]:block [&>span]:text-[11px] [&>span]:text-[var(--yellow-ink)]"><p>Հայաստան հասցնելու նախնական արժեք</p><strong>{formatUsdRange(vehicle.estimateMin, vehicle.estimateMax)}</strong><span>Առաջարկվող առավելագույն խաղադրույք՝ <b>{formatUsd(vehicle.maxBid)}</b></span></div>
          <div className="mt-4 flex flex-col gap-[9px]"><Button onClick={() => onConsultation(vehicle.id)} icon={ChatCircleText}>Խորհրդակցել այս մեքենայի շուրջ</Button><Button variant="ghost" onClick={() => onCompare(vehicle.id)} icon={isCompared ? Check : ArrowsLeftRight}>{isCompared ? "Համեմատման մեջ է" : "Ավելացնել համեմատման"}</Button></div>
        </div>
      </div>
      <div className="grid grid-cols-[0.8fr_1.2fr] gap-[30px] border-t border-[var(--border)] p-[29px] max-[800px]:grid-cols-1 max-[800px]:gap-[17px] max-[800px]:p-5">
        <div><h3 className="m-0 text-xl">Ինչպես է ձևավորվում արժեքը</h3><p className="mt-2 mb-0 text-[11px] leading-[1.6] text-[var(--ink-soft)]">Ցուցադրական հաշվարկ՝ կառուցվածքը ներկայացնելու համար։</p></div>
        <div>{breakdown.map(([label, amount]) => <p className="m-0 flex min-h-[38px] items-center justify-between gap-5 border-b border-[var(--border)] text-[11px] text-[var(--ink)]" key={label}><span>{label}</span><strong className="whitespace-nowrap">մոտ {formatUsd(Math.round(amount / 50) * 50)}</strong></p>)}</div>
        <p className="col-span-full m-0 flex items-start gap-[7px] rounded-[10px] bg-[var(--orange-pale)] px-3.5 py-3 text-[11px] leading-[1.55] text-[var(--orange-ink)] max-[800px]:col-auto [&_svg]:shrink-0"><WarningCircle size={18} weight="fill" /> Վերանորոգման և հաշվառման ծախսերը ներառված չեն։ Վերջնական արժեքը հաստատվում է միայն կոնկրետ լոտի ստուգումից հետո։</p>
      </div>
    </Modal>
  );
}
