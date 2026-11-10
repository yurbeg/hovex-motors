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
    <fieldset className={formFieldsetClasses} disabled={disabled} data-scroll-reveal="up">
      <legend>Հիմնական տվյալներ</legend>
      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        <label className={formLabelClasses}>
          <span>Մակնիշ *</span>
          <input name="make" className={classNames(formControlClasses, errors.make && "border-[var(--red-border)]")} autoFocus value={form.make} onChange={update("make")} placeholder="Kia" aria-invalid={Boolean(errors.make)} aria-describedby={errors.make ? "vehicle-editor-make-error" : undefined} />
          {errors.make ? <small id="vehicle-editor-make-error">{errors.make}</small> : null}
        </label>
        <label className={formLabelClasses}>
          <span>Մոդել *</span>
          <input name="model" className={classNames(formControlClasses, errors.model && "border-[var(--red-border)]")} value={form.model} onChange={update("model")} placeholder="Forte LXS" aria-invalid={Boolean(errors.model)} aria-describedby={errors.model ? "vehicle-editor-model-error" : undefined} />
          {errors.model ? <small id="vehicle-editor-model-error">{errors.model}</small> : null}
        </label>
        <label className={formLabelClasses}>
          <span>Տարեթիվ *</span>
          <input name="year" className={classNames(formControlClasses, errors.year && "border-[var(--red-border)]")} type="number" min="1990" max={new Date().getFullYear() + 2} value={form.year} onChange={update("year")} aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? "vehicle-editor-year-error" : undefined} />
          {errors.year ? <small id="vehicle-editor-year-error">{errors.year}</small> : null}
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
          <span>Գտնվելու վայր / նշում</span>
          <input className={formControlClasses} value={form.auction} onChange={update("auction")} placeholder="Hovex Motors • Երևան" />
        </label>
      </div>
    </fieldset>
  );
}
