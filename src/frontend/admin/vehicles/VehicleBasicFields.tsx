import { classNames } from "../shared/classNames";
import {
  formControlClasses,
  formFieldsetClasses,
  formLabelClasses,
} from "../shared/styles";
import type {
  VehicleEditorErrors,
  VehicleEditorForm,
  VehicleFieldUpdater,
} from "./vehicleEditorModel";

interface VehicleBasicFieldsProps {
  form: VehicleEditorForm;
  errors: VehicleEditorErrors;
  update: VehicleFieldUpdater;
  disabled: boolean;
}

export function VehicleBasicFields({ form, errors, update, disabled }: VehicleBasicFieldsProps) {
  return (
    <fieldset className={formFieldsetClasses} disabled={disabled}>
      <legend>Հիմնական տվյալներ</legend>
      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <label className={formLabelClasses}>
          <span>Մակնիշ *</span>
          <input className={classNames(formControlClasses, errors.make && "border-[#c95540]")} autoFocus value={form.make} onChange={update("make")} placeholder="Kia" />
          {errors.make ? <small>{errors.make}</small> : null}
        </label>
        <label className={formLabelClasses}>
          <span>Մոդել *</span>
          <input className={classNames(formControlClasses, errors.model && "border-[#c95540]")} value={form.model} onChange={update("model")} placeholder="Forte LXS" />
          {errors.model ? <small>{errors.model}</small> : null}
        </label>
        <label className={formLabelClasses}>
          <span>Տարեթիվ *</span>
          <input className={classNames(formControlClasses, errors.year && "border-[#c95540]")} type="number" min="1990" max={new Date().getFullYear() + 2} value={form.year} onChange={update("year")} />
          {errors.year ? <small>{errors.year}</small> : null}
        </label>
        <label className={formLabelClasses}>
          <span>Թափք</span>
          <input className={formControlClasses} value={form.body} onChange={update("body")} placeholder="Սեդան" />
        </label>
        <label className={formLabelClasses}>
          <span>Վազք</span>
          <input className={formControlClasses} value={form.mileage} onChange={update("mileage")} placeholder="70 000 մղոն" />
        </label>
        <label className={formLabelClasses}>
          <span>Վառելիք</span>
          <select className={formControlClasses} value={form.fuel} onChange={update("fuel")}>
            <option>Բենզին</option><option>Դիզել</option><option>Հիբրիդ</option><option>Էլեկտրական</option>
          </select>
        </label>
        <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
          <span>Վնասվածք / վիճակ</span>
          <input className={formControlClasses} value={form.damage} onChange={update("damage")} placeholder="Առջևի թեթև վնասվածք" />
        </label>
        <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}>
          <span>Աղբյուր</span>
          <input className={formControlClasses} value={form.auction} onChange={update("auction")} placeholder="Copart • ցուցադրական" />
        </label>
      </div>
    </fieldset>
  );
}
