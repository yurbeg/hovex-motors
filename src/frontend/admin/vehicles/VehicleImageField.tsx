import { useId } from "react";
import type { ChangeEvent, RefObject } from "react";
import { ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { ADMIN_IMAGE_ALLOWED_MIME_TYPES } from "../../../infrastructure/supabase/adminImageRepository";
import { classNames } from "../shared/classNames";
import { formLabelClasses } from "../shared/styles";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleFieldUpdater,
} from "./vehicleEditorModel";

interface VehicleImageFieldProps {
  form: VehicleEditorForm;
  errors: VehicleEditorErrors;
  update: VehicleFieldUpdater;
  selectedImageFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedImage: () => void;
}

export function VehicleImageField({
  form,
  errors,
  update,
  selectedImageFile,
  fileInputRef,
  onSelectImage,
  onClearSelectedImage,
}: VehicleImageFieldProps) {
  const generatedInputId = useId();
  const inputId = `vehicle-image-upload-${generatedInputId.replace(/:/g, "")}`;

  return (
    <>
      <div className={classNames(formLabelClasses, "col-span-full rounded-[11px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3.5 max-[700px]:col-auto", errors.image && "border-[var(--red-border)]")}>
        <span>Նկար վերբեռնել</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <input ref={fileInputRef} className="sr-only" id={inputId} type="file" accept={ADMIN_IMAGE_ALLOWED_MIME_TYPES.join(",")} onChange={onSelectImage} />
          <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-[#11110f] px-4 text-[10px] font-extrabold text-white" htmlFor={inputId}>
            <UploadSimple size={18} weight="bold" />{selectedImageFile ? "Փոխել նկարը" : "Ընտրել համակարգչից"}
          </label>
          {selectedImageFile ? <button className="min-h-[42px] cursor-pointer rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[9px] font-extrabold text-[var(--ink-soft)]" type="button" onClick={onClearSelectedImage}>Հեռացնել ընտրվածը</button> : null}
        </div>
        {selectedImageFile
          ? <p className="m-0 overflow-hidden text-ellipsis text-[9px] font-bold text-[var(--ink)]">{selectedImageFile.name} · {(selectedImageFile.size / (1024 * 1024)).toFixed(2)} ՄԲ</p>
          : <p className="m-0 text-[8px] leading-[1.5] text-[var(--muted)]">JPG, PNG, WebP կամ AVIF · առավելագույնը 8 ՄԲ</p>}
        {errors.image ? <small id="vehicle-editor-image-error" role="alert">{errors.image}</small> : null}
      </div>
      <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
        <span>Կամ նկարի հասցե *</span>
        <div className={classNames("flex h-[43px] items-center gap-2 rounded-[9px] border border-[var(--border)] pl-[11px] text-[var(--muted)] focus-within:border-[var(--yellow-hover)] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]", errors.image && "border-[var(--red-border)]")}>
          <ImageSquare size={19} />
          <input name="image" className="h-10 w-full border-0 bg-[var(--surface)] px-[11px] pl-0 text-[10px] text-[var(--ink)] outline-none disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)]" value={form.image} onChange={update("image")} disabled={Boolean(selectedImageFile)} aria-invalid={Boolean(errors.image)} aria-describedby={errors.image ? "vehicle-editor-image-error" : undefined} />
        </div>
        {selectedImageFile ? <small className="!text-[var(--muted)]">Ընտրված ֆայլը պահպանելիս կփոխարինի այս հասցեին։</small> : null}
      </label>
      <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
        <span>Նկարի դիրք</span>
        <input className="h-[43px] w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-[11px] text-[10px] text-[var(--ink)] outline-none focus:border-[var(--yellow-hover)] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]" value={form.imagePosition} onChange={update("imagePosition")} placeholder="50% 50%" />
      </label>
    </>
  );
}
