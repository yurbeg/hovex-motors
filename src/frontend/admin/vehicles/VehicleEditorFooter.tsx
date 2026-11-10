import { Archive, FloppyDisk } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import { AdminButton } from "../components/AdminButton";

interface VehicleEditorFooterProps {
  isNew: boolean;
  vehicle: Vehicle | null;
  busy: boolean;
  phase: "idle" | "uploading" | "saving";
  onClose: () => void;
  onArchive: (vehicle: Vehicle) => Promise<void>;
}

export function VehicleEditorFooter({
  isNew,
  vehicle,
  busy,
  phase,
  onClose,
  onArchive,
}: VehicleEditorFooterProps) {
  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-[15px] border-t border-[var(--border)] bg-[var(--surface-translucent)] px-5 py-4 backdrop-blur-[10px] max-[700px]:flex-col-reverse max-[700px]:items-stretch">
      {!isNew && vehicle && vehicle.status !== "archived"
        ? <AdminButton className="max-[700px]:w-full" type="button" icon={Archive} variant="danger" onClick={() => void onArchive(vehicle)} disabled={busy}>Արխիվացնել</AdminButton>
        : <span />}
      <div className="flex gap-[9px] max-[700px]:grid max-[700px]:grid-cols-[1fr_1.25fr]">
        <AdminButton type="button" variant="ghost" onClick={onClose} disabled={busy}>Չեղարկել</AdminButton>
        <AdminButton type="submit" icon={FloppyDisk} disabled={busy}>
          {phase === "uploading" ? "Նկարը բեռնվում է…" : busy ? "Պահպանվում է…" : "Պահպանել"}
        </AdminButton>
      </div>
    </div>
  );
}
