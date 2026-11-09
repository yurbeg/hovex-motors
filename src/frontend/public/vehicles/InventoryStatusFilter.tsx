import type { VehicleInventoryStatus } from "../../../domain/vehicle";
import { classNames } from "../shared/utils";
import { inventoryStatusLabel } from "./InventoryStatusBadge";

export type InventoryStatusFilterValue = "all" | VehicleInventoryStatus;

export type InventoryStatusFilterCounts = Record<InventoryStatusFilterValue, number>;

interface InventoryStatusFilterProps {
  value: InventoryStatusFilterValue;
  counts: InventoryStatusFilterCounts;
  onChange: (value: InventoryStatusFilterValue) => void;
  className?: string;
}

const filterOptions: ReadonlyArray<{
  value: InventoryStatusFilterValue;
  label: string;
}> = [
  { value: "all", label: "Բոլորը" },
  { value: "available", label: inventoryStatusLabel("available") },
  { value: "in_transit", label: inventoryStatusLabel("in_transit") },
  { value: "at_auction", label: inventoryStatusLabel("at_auction") },
];

const countFormatter = new Intl.NumberFormat("hy-AM");

export function InventoryStatusFilter({
  value,
  counts,
  onChange,
  className,
}: InventoryStatusFilterProps) {
  return (
    <div
      className={classNames(
        "max-[800px]:-mx-[14px] max-[800px]:overflow-x-auto max-[800px]:overscroll-x-contain max-[800px]:px-[14px] max-[800px]:[scrollbar-width:none] max-[800px]:[&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div
        className="flex flex-wrap gap-2 max-[800px]:w-max max-[800px]:min-w-full max-[800px]:flex-nowrap"
        role="group"
        aria-label="Ֆիլտրել մեքենաներն ըստ գտնվելու վիճակի"
      >
        {filterOptions.map((option) => {
          const active = value === option.value;

          return (
            <button
              className={classNames(
                "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[12px] font-extrabold transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(255,196,0,0.38)]",
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white shadow-[0_4px_14px_rgba(17,17,15,0.12)]"
                  : "border-[var(--border)] bg-white text-[var(--ink)] hover:border-[#aaa49b] hover:bg-[var(--surface)]",
              )}
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              <span
                className={classNames(
                  "inline-grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[10px] leading-4 tabular-nums",
                  active ? "bg-[var(--yellow)] text-[var(--ink)]" : "bg-[#eeebe5] text-[#625d55]",
                )}
              >
                {countFormatter.format(counts[option.value])}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
