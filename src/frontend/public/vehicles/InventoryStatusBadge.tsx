import type { VehicleInventoryStatus } from "../../../domain/vehicle";
import { classNames } from "../shared/utils";

const inventoryStatusConfig: Record<
  VehicleInventoryStatus,
  { label: string; tone: string }
> = {
  available: {
    label: "Առկա",
    tone: "border-[#c6e8ce] bg-[#e8f6eb] text-[#24733a]",
  },
  in_transit: {
    label: "Ճանապարհին",
    tone: "border-[#c6deef] bg-[#e7f2fb] text-[#216d9f]",
  },
  at_auction: {
    label: "Աճուրդում",
    tone: "border-[#eadca8] bg-[#fff3c7] text-[#846500]",
  },
};

export function inventoryStatusLabel(status: VehicleInventoryStatus): string {
  return inventoryStatusConfig[status].label;
}

interface InventoryStatusBadgeProps {
  status: VehicleInventoryStatus;
  className?: string;
  compact?: boolean;
}

export function InventoryStatusBadge({
  status,
  className,
  compact = false,
}: InventoryStatusBadgeProps) {
  const config = inventoryStatusConfig[status];

  return (
    <span
      className={classNames(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border font-extrabold leading-none",
        compact ? "min-h-5 px-2 text-[8px]" : "min-h-7 px-2.5 text-[10px]",
        config.tone,
        className,
      )}
    >
      <i className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {config.label}
    </span>
  );
}
