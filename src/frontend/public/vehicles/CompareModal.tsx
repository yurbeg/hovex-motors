import { WarningCircle, X } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { Modal } from "../shared/Modal";
import { formatUsd, formatUsdRange, handleVehicleImageError } from "../shared/utils";

interface CompareModalProps {
  items: Vehicle[];
  onClose: () => void;
  onRemove: (vehicleId: string) => void;
  onConsultation: ConsultationHandler;
}

export function CompareModal({ items, onClose, onRemove, onConsultation }: CompareModalProps) {
  return (
    <Modal title="Համեմատել ընտրված մեքենաները" onClose={onClose} size="large">
      <div className="grid grid-cols-3 gap-3.5 p-[21px] max-[800px]:grid-cols-1">
        {items.map((vehicle) => (
          <article className="relative rounded-[14px] border border-[var(--border)] p-[13px] max-[800px]:grid max-[800px]:grid-cols-[100px_1fr] max-[800px]:gap-x-[13px]" key={vehicle.id}>
            <button className="absolute top-5 right-5 z-[2] grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-[rgba(255,255,255,0.92)] max-[800px]:top-2 max-[800px]:right-2" type="button" onClick={() => onRemove(vehicle.id)} aria-label={`${vehicle.make} ${vehicle.model}-ը հեռացնել`}><X size={17} weight="bold" /></button>
            <img className="h-[150px] w-full rounded-[10px] bg-[#171715] object-contain max-[800px]:row-span-4 max-[800px]:h-[130px] max-[800px]:w-[100px]" src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} loading="lazy" decoding="async" onError={handleVehicleImageError} />
            <p className="mt-[13px] mb-0 text-[10px] font-bold text-[var(--muted)] max-[800px]:mt-0">{vehicle.year}</p><h3 className="m-0 min-h-[52px] text-[17px] leading-[1.45] max-[800px]:min-h-0 max-[800px]:pr-[30px]">{vehicle.make} {vehicle.model}</h3>
            <dl className="my-[13px] max-[800px]:col-span-full [&>div]:min-h-[43px] [&>div]:border-t [&>div]:border-[var(--border)] [&>div]:py-2 [&_dt]:text-[10px] [&_dt]:text-[var(--muted)] [&_dd]:mt-[3px] [&_dd]:mb-0 [&_dd]:text-[11px] [&_dd]:leading-[1.4] [&_dd]:font-bold"><div><dt>Նախնական արժեք</dt><dd>{formatUsdRange(vehicle.estimateMin, vehicle.estimateMax)}</dd></div><div><dt>Վազք</dt><dd>{vehicle.mileage}</dd></div><div><dt>Վառելիք</dt><dd>{vehicle.fuel}</dd></div><div><dt>Վնասվածք</dt><dd>{vehicle.damage}</dd></div><div><dt>Առավելագույն խաղադրույք</dt><dd>{formatUsd(vehicle.maxBid)}</dd></div></dl>
            <Button className="w-full max-[800px]:col-span-full" variant="secondary" onClick={() => onConsultation(vehicle.id)}>Ընտրել</Button>
          </article>
        ))}
      </div>
      <p className="mt-0 mr-[21px] mb-[21px] ml-[21px] flex gap-[7px] rounded-[10px] bg-[#fff2e5] p-3 text-[11px] leading-[1.5] text-[#8a4a09]"><WarningCircle size={18} weight="fill" /> Համեմատությունը ցուցադրական է։ Մասնագետը կստուգի լոտի փաստացի տվյալները մինչև վերջնական որոշումը։</p>
    </Modal>
  );
}
