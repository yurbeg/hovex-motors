import type { ChangeEvent, RefObject } from "react";
import { formFieldsetClasses } from "../shared/styles";
import { VehicleFeaturedField } from "./VehicleFeaturedField";
import { VehicleImageField } from "./VehicleImageField";
import { VehiclePricingFields } from "./VehiclePricingFields";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleFieldUpdater,
} from "./vehicleEditorModel";

interface VehiclePresentationFieldsProps {
  form: VehicleEditorForm;
  errors: VehicleEditorErrors;
  update: VehicleFieldUpdater;
  disabled: boolean;
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

export function VehiclePresentationFields({
  form,
  errors,
  update,
  disabled,
  existingImageUrls,
  selectedImageFiles,
  selectedImagePreviewUrls,
  fileInputRef,
  onSelectImages,
  onClearSelectedImages,
  onRemoveSelectedImage,
  onRemoveExistingImage,
  onMakeExistingImageCover,
}: VehiclePresentationFieldsProps) {
  return (
    <fieldset className={formFieldsetClasses} disabled={disabled} data-scroll-reveal="up">
      <legend>Գին և ներկայացում</legend>
      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <VehiclePricingFields form={form} errors={errors} update={update} />
        <VehicleImageField
          form={form}
          errors={errors}
          update={update}
          existingImageUrls={existingImageUrls}
          selectedImageFiles={selectedImageFiles}
          selectedImagePreviewUrls={selectedImagePreviewUrls}
          fileInputRef={fileInputRef}
          onSelectImages={onSelectImages}
          onClearSelectedImages={onClearSelectedImages}
          onRemoveSelectedImage={onRemoveSelectedImage}
          onRemoveExistingImage={onRemoveExistingImage}
          onMakeExistingImageCover={onMakeExistingImageCover}
        />
        <VehicleFeaturedField form={form} update={update} />
      </div>
    </fieldset>
  );
}
