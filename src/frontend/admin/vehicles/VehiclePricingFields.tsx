import { classNames } from "../shared/classNames";
import { formControlClasses, formLabelClasses } from "../shared/styles";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleFieldUpdater,
} from "./vehicleEditorModel";

interface VehiclePricingFieldsProps {
  form: VehicleEditorForm;
  errors: VehicleEditorErrors;
  update: VehicleFieldUpdater;
}

export function VehiclePricingFields({ form, errors, update }: VehiclePricingFieldsProps) {
  return (
    <>
      <label className={formLabelClasses}>
        <span>Նվազագույն արժեք, $ *</span>
        <input className={classNames(formControlClasses, errors.estimateMin && "border-[#c95540]")} type="number" min="0" step="100" value={form.estimateMin} onChange={update("estimateMin")} />
        {errors.estimateMin ? <small>{errors.estimateMin}</small> : null}
      </label>
      <label className={formLabelClasses}>
        <span>Առավելագույն արժեք, $ *</span>
        <input className={classNames(formControlClasses, errors.estimateMax && "border-[#c95540]")} type="number" min="0" step="100" value={form.estimateMax} onChange={update("estimateMax")} />
        {errors.estimateMax ? <small>{errors.estimateMax}</small> : null}
      </label>
      <label className={formLabelClasses}>
        <span>Առավելագույն խաղադրույք, $ *</span>
        <input className={classNames(formControlClasses, errors.maxBid && "border-[#c95540]")} type="number" min="0" step="100" value={form.maxBid} onChange={update("maxBid")} />
        {errors.maxBid ? <small>{errors.maxBid}</small> : null}
      </label>
      <label className={formLabelClasses}>
        <span>Պիտակի տեքստ</span>
        <input className={formControlClasses} value={form.badge} onChange={update("badge")} />
      </label>
      <label className={formLabelClasses}>
        <span>Պիտակի գույն</span>
        <select className={formControlClasses} value={form.accent} onChange={update("accent")}>
          <option value="yellow">Դեղին</option><option value="green">Կանաչ</option><option value="blue">Կապույտ</option><option value="orange">Նարնջագույն</option><option value="black">Սև</option>
        </select>
      </label>
      <label className={formLabelClasses}>
        <span>Հրապարակման վիճակ</span>
        <select className={formControlClasses} value={form.status} onChange={update("status")}>
          <option value="draft">Սևագիր</option><option value="published">Հրապարակված</option><option value="archived">Արխիվացված</option>
        </select>
      </label>
    </>
  );
}
