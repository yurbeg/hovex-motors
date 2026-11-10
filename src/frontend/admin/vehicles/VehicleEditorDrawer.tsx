import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Vehicle } from "../../../domain/vehicle";
import {
  uploadAdminVehicleImages,
  validateAdminVehicleImageFile,
} from "../../../infrastructure/supabase/adminImageRepository";
import { AdminDrawer } from "../components/AdminDrawer";
import { operationErrorMessage } from "../shared/errors";
import { VehicleBasicFields } from "./VehicleBasicFields";
import { VehicleEditorFooter } from "./VehicleEditorFooter";
import { VehiclePresentationFields } from "./VehiclePresentationFields";
import { VehiclePreview } from "./VehiclePreview";
import {
  ADMIN_VEHICLE_MAX_IMAGES,
  createVehicleEditorForm,
  firstVehicleEditorErrorField,
  toVehicleSavePayload,
  validateVehicleEditorForm,
  vehicleEditorImages,
} from "./vehicleEditorModel";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleSavePayload,
} from "./vehicleEditorModel";

interface VehicleEditorDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: VehicleSavePayload) => Promise<void>;
  onArchive: (vehicle: Vehicle) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  busy: boolean;
}

type SubmittingPhase = "idle" | "uploading" | "saving";

export function VehicleEditorDrawer({
  vehicle,
  onClose,
  onSave,
  onArchive,
  onBusyChange,
  busy,
}: VehicleEditorDrawerProps) {
  const isNew = !vehicle?.id;
  const [form, setForm] = useState<VehicleEditorForm>(() => createVehicleEditorForm(vehicle));
  const [errors, setErrors] = useState<VehicleEditorErrors>({});
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedImagePreviewUrls, setSelectedImagePreviewUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submittingPhase, setSubmittingPhase] = useState<SubmittingPhase>("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
  const effectiveBusy = busy || submittingPhase !== "idle";
  const existingImages = vehicleEditorImages(form);

  useEffect(() => {
    onBusyChange(effectiveBusy);
    return () => onBusyChange(false);
  }, [effectiveBusy, onBusyChange]);

  useEffect(() => {
    const objectUrls = selectedImageFiles.map((file) => URL.createObjectURL(file));
    setSelectedImagePreviewUrls(objectUrls);
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImageFiles]);

  const update = (key: keyof VehicleEditorForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const clearSelectedImages = () => {
    setSelectedImageFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    const nextFiles = [...selectedImageFiles, ...files];
    if (existingImages.length + nextFiles.length > ADMIN_VEHICLE_MAX_IMAGES) {
      setErrors((current) => ({
        ...current,
        image: `Կարելի է ավելացնել առավելագույնը ${ADMIN_VEHICLE_MAX_IMAGES} նկար`,
      }));
      return;
    }

    try {
      nextFiles.forEach(validateAdminVehicleImageFile);
    } catch (error) {
      setErrors((current) => ({ ...current, image: operationErrorMessage(error) }));
      return;
    }

    setSelectedImageFiles(nextFiles);
    setErrors((current) => ({ ...current, image: "" }));
    setSubmitError("");
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((current) => ({ ...current, image: "" }));
  };

  const removeExistingImage = (index: number) => {
    setForm((current) => {
      const images = vehicleEditorImages(current).filter((_, itemIndex) => itemIndex !== index);
      return { ...current, image: images[0] ?? "", images };
    });
    setErrors((current) => ({ ...current, image: "" }));
    setSubmitError("");
  };

  const makeExistingImageCover = (index: number) => {
    setForm((current) => {
      const images = vehicleEditorImages(current);
      const selected = images[index];
      if (!selected || index === 0) return current;
      const reordered = [selected, ...images.filter((_, itemIndex) => itemIndex !== index)];
      return { ...current, image: selected, images: reordered };
    });
    setErrors((current) => ({ ...current, image: "" }));
    setSubmitError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlightRef.current || effectiveBusy) return;
    const nextErrors = validateVehicleEditorForm(form, selectedImageFiles.length);
    setErrors(nextErrors);
    const firstInvalidField = firstVehicleEditorErrorField(nextErrors);
    if (firstInvalidField) {
      setSubmitError("Պահպանումը չկատարվեց։ Լրացրեք կարմիրով նշված պարտադիր դաշտերը։");
      window.requestAnimationFrame(() => {
        const control = formRef.current?.querySelector<HTMLElement>(
          `[name="${firstInvalidField}"]`,
        );
        control?.focus({ preventScroll: true });
        control?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    submissionInFlightRef.current = true;
    setSubmittingPhase(selectedImageFiles.length ? "uploading" : "saving");
    setSubmitError("");
    try {
      let images = vehicleEditorImages(form);
      if (selectedImageFiles.length) {
        const uploaded = await uploadAdminVehicleImages(selectedImageFiles);
        images = [...images, ...uploaded.map(({ publicUrl }) => publicUrl)];
        setForm((current) => ({ ...current, image: images[0] ?? "", images }));
        clearSelectedImages();
        setSubmittingPhase("saving");
      }
      await onSave(toVehicleSavePayload(form, images));
    } catch (error) {
      setSubmitError(operationErrorMessage(error));
    } finally {
      submissionInFlightRef.current = false;
      setSubmittingPhase("idle");
    }
  };

  return (
    <AdminDrawer
      title={isNew ? "Ավելացնել մեքենա" : `${vehicle?.make} ${vehicle?.model}`}
      eyebrow={isNew ? "Նոր առաջարկ" : "Խմբագրել առաջարկը"}
      onClose={onClose}
      wide
      locked={effectiveBusy}
    >
      <form ref={formRef} className="flex min-h-full flex-col" onSubmit={submit} noValidate aria-busy={effectiveBusy} data-scroll-stagger>
        <VehiclePreview
          form={form}
          existingImageUrls={existingImages}
          selectedImagePreviewUrls={selectedImagePreviewUrls}
        />
        {submitError ? (
          <div
            className="sticky top-0 z-10 mx-5 my-3 rounded-[10px] border border-[var(--red-border)] bg-[var(--red-pale)] px-3.5 py-3 text-[9px] font-bold text-[var(--red-ink)] shadow-[0_8px_24px_rgba(80,32,23,0.08)]"
            role="alert"
            aria-live="assertive"
          >
            {submitError}
          </div>
        ) : null}
        <VehicleBasicFields form={form} errors={errors} update={update} disabled={effectiveBusy} />
        <VehiclePresentationFields
          form={form}
          errors={errors}
          update={update}
          disabled={effectiveBusy}
          existingImageUrls={existingImages}
          selectedImageFiles={selectedImageFiles}
          selectedImagePreviewUrls={selectedImagePreviewUrls}
          fileInputRef={fileInputRef}
          onSelectImages={selectImages}
          onClearSelectedImages={clearSelectedImages}
          onRemoveSelectedImage={removeSelectedImage}
          onRemoveExistingImage={removeExistingImage}
          onMakeExistingImageCover={makeExistingImageCover}
        />
        <VehicleEditorFooter
          isNew={isNew}
          vehicle={vehicle}
          busy={effectiveBusy}
          phase={submittingPhase}
          onClose={onClose}
          onArchive={onArchive}
        />
      </form>
    </AdminDrawer>
  );
}

export type { VehicleSavePayload } from "./vehicleEditorModel";
