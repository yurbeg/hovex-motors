import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Vehicle } from "../../../domain/vehicle";
import {
  ADMIN_IMAGE_ALLOWED_MIME_TYPES,
  ADMIN_IMAGE_ERROR_MESSAGES,
  ADMIN_IMAGE_MAX_BYTES,
  uploadAdminVehicleImage,
} from "../../../infrastructure/supabase/adminImageRepository";
import { AdminDrawer } from "../components/AdminDrawer";
import { operationErrorMessage } from "../shared/errors";
import { VehicleBasicFields } from "./VehicleBasicFields";
import { VehicleEditorFooter } from "./VehicleEditorFooter";
import { VehiclePresentationFields } from "./VehiclePresentationFields";
import { VehiclePreview } from "./VehiclePreview";
import {
  createVehicleEditorForm,
  firstVehicleEditorErrorField,
  toVehicleSavePayload,
  validateVehicleEditorForm,
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
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submittingPhase, setSubmittingPhase] = useState<SubmittingPhase>("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
  const effectiveBusy = busy || submittingPhase !== "idle";

  useEffect(() => {
    onBusyChange(effectiveBusy);
    return () => onBusyChange(false);
  }, [effectiveBusy, onBusyChange]);

  useEffect(() => {
    if (!selectedImageFile) {
      setImagePreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedImageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImageFile]);

  const update = (key: keyof VehicleEditorForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] || null;
    if (!file) return;
    let message = "";
    if (!ADMIN_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as (typeof ADMIN_IMAGE_ALLOWED_MIME_TYPES)[number])) {
      message = ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_TYPE_INVALID;
    } else if (file.size <= 0) {
      message = ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_EMPTY;
    } else if (file.size > ADMIN_IMAGE_MAX_BYTES) {
      message = ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_TOO_LARGE;
    }
    if (message) {
      setSelectedImageFile(null);
      event.currentTarget.value = "";
      setErrors((current) => ({ ...current, image: message }));
      return;
    }
    setSelectedImageFile(file);
    setErrors((current) => ({ ...current, image: "" }));
    setSubmitError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlightRef.current || effectiveBusy) return;
    const nextErrors = validateVehicleEditorForm(form, Boolean(selectedImageFile));
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
    setSubmittingPhase(selectedImageFile ? "uploading" : "saving");
    setSubmitError("");
    try {
      let image = form.image.trim();
      if (selectedImageFile) {
        const uploaded = await uploadAdminVehicleImage(selectedImageFile);
        image = uploaded.publicUrl;
        setForm((current) => ({ ...current, image }));
        clearSelectedImage();
        setSubmittingPhase("saving");
      }
      await onSave(toVehicleSavePayload(form, image));
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
      <form ref={formRef} className="flex min-h-full flex-col" onSubmit={submit} noValidate aria-busy={effectiveBusy}>
        <VehiclePreview form={form} imagePreviewUrl={imagePreviewUrl} />
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
          selectedImageFile={selectedImageFile}
          fileInputRef={fileInputRef}
          onSelectImage={selectImage}
          onClearSelectedImage={clearSelectedImage}
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
