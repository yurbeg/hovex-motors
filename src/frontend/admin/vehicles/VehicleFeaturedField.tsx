import { Check } from "@phosphor-icons/react";
import type { VehicleEditorForm, VehicleFieldUpdater } from "./vehicleEditorModel";

interface VehicleFeaturedFieldProps {
  form: VehicleEditorForm;
  update: VehicleFieldUpdater;
}

export function VehicleFeaturedField({ form, update }: VehicleFeaturedFieldProps) {
  return (
    <label className="col-span-full flex min-h-[58px] cursor-pointer items-center gap-[11px] rounded-[10px] border border-[var(--border)] px-3 py-2.5 max-[700px]:col-auto">
      <input className="peer pointer-events-none absolute opacity-0" type="checkbox" checked={Boolean(form.featured)} onChange={update("featured")} />
      <span className="grid size-[21px] shrink-0 place-items-center rounded-md border border-[var(--border-strong)] text-transparent peer-checked:border-[var(--yellow)] peer-checked:bg-[var(--yellow)] peer-checked:text-[var(--on-yellow)]">
        <Check size={14} weight="bold" />
      </span>
      <p className="m-0 grid">
        <strong className="text-[10px]">Ցուցադրել գլխավոր էջում</strong>
        <small className="text-[8px] text-[var(--muted)]">Հրապարակված առաջարկը կհայտնվի ընտրյալ մեքենաների շարքում։</small>
      </p>
    </label>
  );
}
