import type { LeadStatus } from "../../../domain/lead";
import type { VehicleInventoryStatus, VehicleStatus } from "../../../domain/vehicle";
import type { StatusConfig } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import { leadStatus, vehicleInventoryStatus, vehicleStatus } from "../shared/statuses";
import { statusToneClasses } from "../shared/styles";

type StatusBadgeProps =
  | { type: "lead"; value: LeadStatus }
  | { type: "vehicle"; value: VehicleStatus }
  | { type: "inventory"; value: VehicleInventoryStatus };

export function StatusBadge(props: StatusBadgeProps) {
  const { type, value } = props;
  const config: StatusConfig | undefined = type === "lead"
    ? leadStatus[value as LeadStatus]
    : type === "inventory"
      ? vehicleInventoryStatus[value as VehicleInventoryStatus]
      : vehicleStatus[value as VehicleStatus];
  const fallback: StatusConfig = { label: value || "—", tone: "gray" };
  const resolved = config || fallback;

  return (
    <span className={classNames("inline-flex min-h-[25px] w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] text-[9px] font-extrabold", statusToneClasses[resolved.tone])}>
      <i className="size-1.5 rounded-full bg-current" />
      {resolved.label}
    </span>
  );
}
