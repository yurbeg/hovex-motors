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
  selectedImageFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedImage: () => void;
}

export function VehiclePresentationFields({
  form,
  errors,
  update,
  disabled,
  selectedImageFile,
  fileInputRef,
  onSelectImage,
  onClearSelectedImage,
}: VehiclePresentationFieldsProps) {
  return (
    <fieldset className={formFieldsetClasses} disabled={disabled}>
      <legend>Գին և ներկայացում</legend>
      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <VehiclePricingFields form={form} errors={errors} update={update} />
        <VehicleImageField
          form={form}
          errors={errors}
          update={update}
          selectedImageFile={selectedImageFile}
          fileInputRef={fileInputRef}
          onSelectImage={onSelectImage}
          onClearSelectedImage={onClearSelectedImage}
        />
        <VehicleFeaturedField form={form} update={update} />
      </div>
    </fieldset>
  );
}
