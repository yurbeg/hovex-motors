import { useId } from "react";
import type { ChangeEvent, RefObject } from "react";
import { Star, Trash, UploadSimple } from "@phosphor-icons/react";
import { ADMIN_IMAGE_ALLOWED_MIME_TYPES } from "../../../infrastructure/supabase/adminImageRepository";
import { classNames } from "../shared/classNames";
import { formLabelClasses } from "../shared/styles";
import { ADMIN_VEHICLE_MAX_IMAGES } from "./vehicleEditorModel";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleFieldUpdater,
} from "./vehicleEditorModel";

interface VehicleImageFieldProps {
  form: VehicleEditorForm;
  errors: VehicleEditorErrors;
  update: VehicleFieldUpdater;
  existingImageUrls: readonly string[];
  selectedImageFiles: readonly File[];
  selectedImagePreviewUrls: readonly string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectImages: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedImages: () => void;
  onRemoveSelectedImage: (index: number) => void;
  onRemoveExistingImage: (index: number) => void;
  onMakeExistingImageCover: (index: number) => void;
}

function fileSizeMb(file: File): string {
  return `${(file.size / (1024 * 1024)).toFixed(2)} ՄԲ`;
}

export function VehicleImageField({
  form,
  errors,
  update,
  existingImageUrls,
  selectedImageFiles,
  selectedImagePreviewUrls,
  fileInputRef,
  onSelectImages,
  onClearSelectedImages,
  onRemoveSelectedImage,
  onRemoveExistingImage,
  onMakeExistingImageCover,
}: VehicleImageFieldProps) {
  const generatedInputId = useId();
  const inputId = `vehicle-image-upload-${generatedInputId.replace(/:/g, "")}`;
  const totalImages = existingImageUrls.length + selectedImageFiles.length;

  return (
    <>
      <div className={classNames(formLabelClasses, "col-span-full rounded-[11px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3.5 max-[700px]:col-auto", errors.image && "border-[var(--red-border)]")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Նկարներ վերբեռնել</span>
          <small className="!m-0 !text-[var(--muted)]">{totalImages} / {ADMIN_VEHICLE_MAX_IMAGES}</small>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input ref={fileInputRef} className="sr-only" id={inputId} name="image" type="file" accept={ADMIN_IMAGE_ALLOWED_MIME_TYPES.join(",")} multiple onChange={onSelectImages} aria-invalid={Boolean(errors.image)} aria-describedby={errors.image ? "vehicle-editor-image-error" : undefined} />
          <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-[#11110f] px-4 text-[10px] font-extrabold text-white" htmlFor={inputId}>
            <UploadSimple size={18} weight="bold" />Ընտրել համակարգչից
          </label>
          {selectedImageFiles.length ? (
            <button className="min-h-[42px] cursor-pointer rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[9px] font-extrabold text-[var(--ink-soft)]" type="button" onClick={onClearSelectedImages}>Հեռացնել նոր ընտրվածները</button>
          ) : null}
        </div>
        <p className="m-0 text-[8px] leading-[1.5] text-[var(--muted)]">JPG, PNG, WebP կամ AVIF · յուրաքանչյուր նկարը՝ առավելագույնը 8 ՄԲ · ընդհանուր՝ մինչև {ADMIN_VEHICLE_MAX_IMAGES} նկար</p>

        {selectedImageFiles.length ? (
          <div className="grid grid-cols-3 gap-2 max-[560px]:grid-cols-2" aria-label="Նոր ընտրված նկարներ">
            {selectedImageFiles.map((file, index) => (
              <article className="min-w-0 overflow-hidden rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)]" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                {selectedImagePreviewUrls[index] ? <img className="h-20 w-full object-cover" src={selectedImagePreviewUrls[index]} alt="" /> : null}
                <div className="flex items-center gap-1.5 p-2">
                  <p className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-bold text-[var(--ink)]" title={file.name}>{file.name}<small className="mt-0.5 block !text-[7px] !font-normal !text-[var(--muted)]">{fileSizeMb(file)}</small></p>
                  <button className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-soft)]" type="button" aria-label={`Հեռացնել ${file.name} նկարը`} onClick={() => onRemoveSelectedImage(index)}><Trash size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {errors.image ? <small id="vehicle-editor-image-error" role="alert">{errors.image}</small> : null}
      </div>

      {existingImageUrls.length ? (
        <div className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
          <span>Պահպանված նկարներ</span>
          <div className="grid grid-cols-3 gap-2 max-[560px]:grid-cols-2" aria-label="Պահպանված նկարներ">
            {existingImageUrls.map((url, index) => (
              <article className={classNames("relative min-w-0 overflow-hidden rounded-[9px] border bg-[var(--surface-soft)]", index === 0 ? "border-[var(--yellow-hover)]" : "border-[var(--border)]")} key={`${url}-${index}`}>
                <img className="h-24 w-full object-cover" src={url} alt={`Մեքենայի նկար ${index + 1}`} style={{ objectPosition: form.imagePosition }} />
                {index === 0 ? <span className="absolute top-1.5 left-1.5 rounded-full bg-[var(--yellow)] px-2 py-1 text-[7px] font-black text-[var(--on-yellow)]">Գլխավոր</span> : null}
                <div className="flex items-center justify-end gap-1.5 p-1.5">
                  {index > 0 ? <button className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[7px] font-bold" type="button" aria-label={`Դարձնել ${index + 1}-րդ նկարը գլխավոր`} onClick={() => onMakeExistingImageCover(index)}><Star size={14} /> Գլխավոր</button> : null}
                  <button className="grid size-8 cursor-pointer place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-soft)]" type="button" aria-label={`Հեռացնել պահպանված ${index + 1}-րդ նկարը`} onClick={() => onRemoveExistingImage(index)}><Trash size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
        <span>Նկարի դիրք</span>
        <input className="h-[43px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-[11px] text-[10px] text-[var(--ink)] outline-none focus:border-[var(--yellow-hover)] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]" value={form.imagePosition} onChange={update("imagePosition")} placeholder="50% 50%" />
      </label>
    </>
  );
}
