import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CalendarBlank, Car, Check, CheckCircle, Phone, SpinnerGap, WhatsappLogo } from "@phosphor-icons/react";
import {
  LEAD_CONTACT_METHOD_LABELS,
  type LeadContactMethod,
  type LeadSubmissionReceipt,
  type PublicLeadSubmission,
} from "../../../domain/lead";
import type { Vehicle } from "../../../domain/vehicle";
import { getPublicLeadErrorMessage } from "../../../infrastructure/supabase/publicLeadRepository";
import type { ConsultationSource } from "../shared/types";
import { Button } from "../shared/Button";
import { Modal } from "../shared/Modal";
import { formFieldClasses } from "../shared/styles";
import { classNames, localDateInputValue, phoneDisplay, phoneHref } from "../shared/utils";

type ConsultationStatus = "idle" | "submitting" | "success";

interface ConsultationFormState {
  name: string;
  phone: string;
  method: LeadContactMethod;
  date: string;
  time: string;
  note: string;
  consent: boolean;
}

type ConsultationErrors = Partial<Record<keyof ConsultationFormState, string>>;

interface ConsultationModalProps {
  selectedVehicle: Vehicle | null;
  onClose: () => void;
  onSubmitLead: (payload: PublicLeadSubmission) => Promise<LeadSubmissionReceipt>;
  source?: ConsultationSource;
}

const initialForm: ConsultationFormState = { name: "", phone: "", method: "phone", date: "", time: "10:00–13:00", note: "", consent: false };

function createClientRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function ConsultationModal({ selectedVehicle, onClose, onSubmitLead, source = "website" }: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationFormState>(initialForm);
  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [status, setStatus] = useState<ConsultationStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<LeadSubmissionReceipt | null>(null);
  const [clientRequestId] = useState(createClientRequestId);
  const submissionInFlightRef = useRef(false);
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const consentRef = useRef<HTMLInputElement | null>(null);
  const today = localDateInputValue();
  const selectedVehicleText = selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : "Անհատական ընտրություն";
  const whatsappMessage = encodeURIComponent([
    "Բարև, Hovex Motors։ Ցանկանում եմ խորհրդատվություն ամրագրել։",
    `Անուն՝ ${form.name}`,
    `Հեռախոս՝ ${form.phone}`,
    `Հետաքրքրող մեքենա՝ ${selectedVehicleText}`,
    `Կապի եղանակ՝ ${LEAD_CONTACT_METHOD_LABELS[form.method]}`,
    form.date ? `Նախընտրելի օր՝ ${form.date}` : null,
    `Ժամային միջակայք՝ ${form.time}`,
    form.note ? `Մեկնաբանություն՝ ${form.note}` : null,
  ].filter(Boolean).join("\n"));
  const whatsappUrl = `https://wa.me/37433344366?text=${whatsappMessage}`;

  useEffect(() => {
    if (status !== "success") return undefined;
    const frame = window.requestAnimationFrame(() => successHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [status]);

  const update = (key: keyof ConsultationFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const value = event.target instanceof HTMLInputElement && event.target.type === "checkbox"
      ? event.target.checked
      : event.target.value;
    setForm((current) => ({ ...current, [key]: value } as ConsultationFormState));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submissionInFlightRef.current) return;
    const nextErrors: ConsultationErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = "Մուտքագրեք առնվազն 2 նիշ";
    const phone = form.phone.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15 || !/^\+?[0-9][0-9 ()-]{6,31}$/.test(phone)) {
      nextErrors.phone = "Մուտքագրեք վավեր հեռախոսահամար";
    }
    if (form.date && form.date < today) nextErrors.date = "Ընտրեք այսօրվա կամ ավելի ուշ օր";
    if (!form.consent) nextErrors.consent = "Շարունակելու համար անհրաժեշտ է տալ համաձայնություն";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => {
        if (nextErrors.name) nameRef.current?.focus();
        else if (nextErrors.phone) phoneRef.current?.focus();
        else if (nextErrors.date) document.getElementById("consult-date")?.focus();
        else if (nextErrors.consent) consentRef.current?.focus();
      });
      return;
    }
    submissionInFlightRef.current = true;
    setStatus("submitting");
    setSubmitError("");
    try {
      const nextReceipt = await onSubmitLead({
        clientRequestId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        contactMethod: form.method,
        vehicleId: selectedVehicle?.id ?? null,
        vehicleLabel: selectedVehicleText,
        preferredDate: form.date,
        preferredTime: form.time,
        note: form.note.trim(),
        source,
        consent: true,
      });
      setReceipt(nextReceipt);
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      setSubmitError(getPublicLeadErrorMessage(error));
    } finally {
      submissionInFlightRef.current = false;
    }
  };

  if (status === "success") {
    return (
      <Modal title="Հարցումն ուղարկվել է" onClose={onClose}>
        <div className="px-[30px] py-[42px] text-center">
          <span className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-[#e7f7e9] text-[var(--green)]"><CheckCircle size={44} weight="fill" /></span>
          <h3 ref={successHeadingRef} className="mt-[18px] mb-2 text-2xl outline-none" tabIndex={-1}>Շնորհակալություն, {form.name}</h3>
          <p className="mx-auto mt-0 mb-5 max-w-[500px] text-xs leading-[1.65] text-[var(--ink-soft)]">{receipt?.duplicate ? "Ձեր հարցումն արդեն ստացել էինք․ այն կրկին չի գրանցվել։" : "Ձեր հարցումն անվտանգ ստացել ենք։ Hovex Motors-ի մասնագետը կկապվի ձեր նշած եղանակով։"} Ցանկության դեպքում կարող եք նաև գրել WhatsApp-ով կամ զանգահարել մեզ։</p>
          <div className="mx-auto flex min-h-11 max-w-[470px] items-center justify-between gap-5 border-t border-[var(--border)] text-left text-[10px] [&_span]:text-right"><strong>Կապի եղանակ</strong><span>{LEAD_CONTACT_METHOD_LABELS[form.method]}</span></div>
          {selectedVehicle ? <div className="mx-auto flex min-h-11 max-w-[470px] items-center justify-between gap-5 border-t border-[var(--border)] text-left text-[10px] [&_span]:text-right"><strong>Ընտրված մեքենա</strong><span>{selectedVehicleText}</span></div> : null}
          <a className={classNames("mt-[23px] inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-xl border border-transparent bg-[var(--yellow)] px-[21px] leading-[1.15] font-bold text-[var(--ink)] transition-[background,transform] duration-150 hover:-translate-y-px hover:bg-[var(--yellow-hover)]")} href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="bold" /><span>Ուղարկել WhatsApp-ով</span></a>
          <a className="mt-[13px] flex items-center justify-center gap-2 text-xs font-bold" href={`tel:${phoneHref}`}><Phone size={18} weight="fill" /> Զանգահարել {phoneDisplay}</a>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Ամրագրել անվճար խորհրդատվություն" onClose={onClose} locked={status === "submitting"}>
      <form className="p-6" onSubmit={(event) => void submit(event)} noValidate aria-busy={status === "submitting"}>
        <fieldset className="m-0 min-w-0 border-0 p-0" disabled={status === "submitting"}>
        <p className="mt-0 mb-[17px] text-[13px] leading-[1.65] text-[var(--ink-soft)]">Թողեք ձեր տվյալները, և Hovex Motors-ի մասնագետը կօգնի ճշտել մեքենան ու ամբողջական հաշվարկը։</p>
        {selectedVehicle ? <div className="mb-[17px] flex items-center gap-[11px] rounded-[11px] bg-[var(--yellow-pale)] px-3.5 py-3"><Car size={21} weight="fill" /><span><small className="block text-[10px] text-[#76653a]">Ընտրված տարբերակ</small><strong className="mt-0.5 block text-xs">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong></span></div> : null}
        <div className="mb-[13px] grid grid-cols-2 gap-[13px] max-[800px]:grid-cols-1 max-[800px]:gap-0">
          <label className={classNames(formFieldClasses, errors.name && "[&_input]:!border-[#be3128] [&_small]:!text-[#a51f18]")}><span>Անուն *</span><input ref={nameRef} autoFocus autoComplete="name" value={form.name} onChange={update("name")} maxLength={100} placeholder="Ինչպե՞ս դիմենք ձեզ" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "consult-name-error" : undefined} />{errors.name ? <small id="consult-name-error" role="alert">{errors.name}</small> : null}</label>
          <label className={classNames(formFieldClasses, errors.phone && "[&_input]:!border-[#be3128] [&_small]:!text-[#a51f18]")}><span>Հեռախոսահամար *</span><input ref={phoneRef} type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} maxLength={32} placeholder="+374 __ ___ ___" inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "consult-phone-error" : undefined} />{errors.phone ? <small id="consult-phone-error" role="alert">{errors.phone}</small> : null}</label>
        </div>
        <label className={classNames(formFieldClasses, "mb-[13px]")}><span>Կապի նախընտրելի եղանակ</span><select value={form.method} onChange={update("method")}><option value="phone">{LEAD_CONTACT_METHOD_LABELS.phone}</option><option value="whatsapp">{LEAD_CONTACT_METHOD_LABELS.whatsapp}</option><option value="video_call">{LEAD_CONTACT_METHOD_LABELS.video_call}</option><option value="showroom_visit">{LEAD_CONTACT_METHOD_LABELS.showroom_visit}</option></select></label>
        <div className="mb-[13px] grid grid-cols-2 gap-[13px] max-[800px]:grid-cols-1 max-[800px]:gap-0">
          <label className={classNames(formFieldClasses, errors.date && "[&_input]:!border-[#be3128] [&_small]:!text-[#a51f18]")}><span>Նախընտրելի օր</span><input id="consult-date" type="date" min={today} value={form.date} onChange={update("date")} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "consult-date-error" : undefined} />{errors.date ? <small id="consult-date-error" role="alert">{errors.date}</small> : null}</label>
          <label className={formFieldClasses}><span>Նախընտրելի ժամ</span><select value={form.time} onChange={update("time")}><option>10:00–13:00</option><option>13:00–16:00</option><option>16:00–19:00</option></select></label>
        </div>
        <label className={classNames(formFieldClasses, "mb-[13px]")}><span>Մեկնաբանություն</span><textarea value={form.note} onChange={update("note")} rows={3} maxLength={2000} placeholder="Նշեք ցանկալի մոդելը կամ ձեզ հետաքրքրող հարցը" /></label>
        <label className={classNames("relative mt-1 grid cursor-pointer grid-cols-[23px_1fr] items-start gap-2 [&>input]:absolute [&>input]:top-0 [&>input]:left-0 [&>input]:m-0 [&>input]:h-[22px] [&>input]:w-[22px] [&>input]:opacity-0 [&>span]:grid [&>span]:h-[22px] [&>span]:w-[22px] [&>span]:place-items-center [&>span]:rounded-md [&>span]:border [&>span]:border-[var(--border)] [&>span]:text-transparent [&>input:checked+span]:border-[var(--yellow-hover)] [&>input:checked+span]:bg-[var(--yellow)] [&>input:checked+span]:text-[var(--ink)] [&>input:focus-visible+span]:outline-3 [&>input:focus-visible+span]:outline-offset-3 [&>input:focus-visible+span]:outline-[#7a5b00] [&>p]:mt-px [&>p]:mb-0 [&>p]:text-[11px] [&>p]:leading-[1.55] [&>p]:text-[var(--ink-soft)]", errors.consent && "[&>span]:!border-[#be3128]")}><input ref={consentRef} type="checkbox" checked={form.consent} onChange={update("consent")} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consult-consent-error" : undefined} /><span><Check size={14} weight="bold" /></span><p>Համաձայն եմ, որ Hovex Motors-ը կապվի ինձ հետ այս հարցման վերաբերյալ։</p></label>
        {errors.consent ? <p id="consult-consent-error" className="mt-1 mr-0 mb-0 ml-[31px] text-[11px] text-[#a51f18]" role="alert">{errors.consent}</p> : null}
        {submitError ? <p className="mt-3 mb-0 rounded-[10px] border border-[#efc9c1] bg-[#fff4f1] px-3.5 py-3 text-[11px] font-bold text-[#9c3424]" role="alert">{submitError}</p> : null}
        <Button className="mt-[17px] w-full" type="submit" icon={status === "submitting" ? SpinnerGap : CalendarBlank} disabled={status === "submitting"}>{status === "submitting" ? "Ուղարկվում է…" : "Ուղարկել հարցումը"}</Button>
        <small className="mt-2.5 block text-center text-[10px] leading-[1.5] text-[var(--muted)]">Ընտրված ժամը վերջնական կհաստատվի մասնագետի հետ կապվելուց հետո։</small>
        </fieldset>
      </form>
    </Modal>
  );
}
