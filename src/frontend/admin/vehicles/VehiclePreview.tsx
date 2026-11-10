import { formatMoney } from "../shared/formatters";
import { StatusBadge } from "../components/StatusBadge";
import type { VehicleEditorForm } from "./vehicleEditorModel";

interface VehiclePreviewProps {
  form: VehicleEditorForm;
  existingImageUrls: readonly string[];
  selectedImagePreviewUrls: readonly string[];
}

export function VehiclePreview({
  form,
  existingImageUrls,
  selectedImagePreviewUrls,
}: VehiclePreviewProps) {
  const previewUrl = existingImageUrls[0] || selectedImagePreviewUrls[0] || "";
  const imageCount = existingImageUrls.length + selectedImagePreviewUrls.length;
  return (
    <div className="m-5 grid grid-cols-[180px_1fr] gap-[17px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 max-[700px]:grid-cols-[128px_1fr] max-[430px]:grid-cols-1">
      <div className="relative h-[126px] overflow-hidden rounded-[10px] bg-[var(--media-surface)] max-[700px]:h-[104px] max-[430px]:h-[150px]">
        {previewUrl ? (
          <img
            className="size-full object-cover"
            src={previewUrl}
            alt="Մեքենայի գլխավոր նկարի նախադիտում"
            style={{ objectPosition: form.imagePosition }}
            onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
            onLoad={(event) => { event.currentTarget.style.visibility = "visible"; }}
          />
        ) : <span className="grid size-full place-items-center px-3 text-center text-[8px] font-bold text-[var(--muted)]">Նկար դեռ ընտրված չէ</span>}
        <span className="absolute bottom-2 left-2 max-w-[calc(100%_-_16px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[var(--yellow)] px-[7px] py-1 text-[7px] font-black text-[var(--on-yellow)]">{form.badge || "Պիտակ"}</span>
      </div>
      <div className="self-center">
        <div className="flex flex-wrap items-center gap-2"><p className="m-0 text-[9px] text-[var(--muted)]">{form.year || "Տարեթիվ"} · {form.body || "Թափք"}</p><StatusBadge type="inventory" value={form.inventoryStatus} />{imageCount ? <small className="text-[8px] font-bold text-[var(--muted)]">{imageCount} նկար</small> : null}</div>
        <h3 className="mb-3.5 mt-[5px] text-lg">{form.make || "Մակնիշ"} {form.model || "Մոդել"}</h3>
        <strong className="text-base">{formatMoney(form.estimateMin)}–{formatMoney(form.estimateMax).replace("$", "")}</strong>
      </div>
    </div>
  );
}
