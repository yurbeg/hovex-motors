import { classNames } from "../shared/classNames";
import { formControlClasses, formLabelClasses } from "../shared/styles";
import { StatusBadge } from "../components/StatusBadge";
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
        <input name="estimateMin" className={classNames(formControlClasses, errors.estimateMin && "border-[var(--red-border)]")} type="number" min="0" step="100" value={form.estimateMin} onChange={update("estimateMin")} aria-invalid={Boolean(errors.estimateMin)} aria-describedby={errors.estimateMin ? "vehicle-editor-estimate-min-error" : undefined} />
        {errors.estimateMin ? <small id="vehicle-editor-estimate-min-error">{errors.estimateMin}</small> : null}
      </label>
      <label className={formLabelClasses}>
        <span>Առավելագույն արժեք, $ *</span>
        <input name="estimateMax" className={classNames(formControlClasses, errors.estimateMax && "border-[var(--red-border)]")} type="number" min="0" step="100" value={form.estimateMax} onChange={update("estimateMax")} aria-invalid={Boolean(errors.estimateMax)} aria-describedby={errors.estimateMax ? "vehicle-editor-estimate-max-error" : undefined} />
        {errors.estimateMax ? <small id="vehicle-editor-estimate-max-error">{errors.estimateMax}</small> : null}
      </label>
      <label className={formLabelClasses}>
        <span>Առավելագույն խաղադրույք, $ *</span>
        <input name="maxBid" className={classNames(formControlClasses, errors.maxBid && "border-[var(--red-border)]")} type="number" min="0" step="100" value={form.maxBid} onChange={update("maxBid")} aria-invalid={Boolean(errors.maxBid)} aria-describedby={errors.maxBid ? "vehicle-editor-max-bid-error" : undefined} />
        {errors.maxBid ? <small id="vehicle-editor-max-bid-error">{errors.maxBid}</small> : null}
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
        <span>Մեքենայի գտնվելու վիճակ</span>
        <span className="flex min-h-[43px] items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-[11px]">
          <StatusBadge type="inventory" value={form.inventoryStatus} />
        </span>
        <small className="!leading-[1.5] !text-[var(--muted)]">
          {form.id
            ? "Կարգավիճակը պահպանվում է։ Նոր աճուրդային մեքենաները ներմուծվում են Copart API-ով։"
            : "Admin-ից նոր մեքենան ավելացվում է միայն որպես «Առկա»։ Աճուրդային մեքենաները գալիս են Copart API-ից։"}
        </small>
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
