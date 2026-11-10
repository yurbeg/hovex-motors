import type { VehicleInventoryStatus } from "../../../domain/vehicle";
import { classNames } from "../shared/utils";

const inventoryStatusConfig: Record<
  VehicleInventoryStatus,
  { label: string; tone: string }
> = {
  available: {
    label: "Առկա",
    tone: "border-[var(--green-border)] bg-[var(--green-pale)] text-[var(--green-ink)]",
  },
  in_transit: {
    label: "Ճանապարհին",
    tone: "border-[var(--blue-border)] bg-[var(--blue-pale)] text-[var(--blue-ink)]",
  },
  at_auction: {
    label: "Աճուրդում",
    tone: "border-[var(--yellow-border)] bg-[var(--yellow-pale)] text-[var(--yellow-ink)]",
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
