import { Car, Phone, SpinnerGap, WhatsappLogo } from "@phosphor-icons/react";
import {
  LEAD_REQUEST_KIND_LABELS,
  type Lead,
  type LeadStatus,
} from "../../../domain/lead";
import { AdminDrawer } from "../components/AdminDrawer";
import { classNames } from "../shared/classNames";
import { formatDate, safePhone } from "../shared/formatters";
import { leadStatus } from "../shared/statuses";
import { leadContactMethodLabel, leadSourceLabel } from "./leadPresentation";
import {
  detailListClasses,
  detailSectionClasses,
  formControlClasses,
} from "../shared/styles";

interface RequestDetailsDrawerProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  pending: boolean;
}

export function RequestDetailsDrawer({ lead, onClose, onStatusChange, pending }: RequestDetailsDrawerProps) {
  const phone = safePhone(lead.phone);
  const whatsapp = phone.replace(/^\+/, "");

  return (
    <AdminDrawer title={lead.name} eyebrow="Հարցման մանրամասներ" onClose={onClose} locked={pending}>
      <div className="grid gap-[15px] p-5 [&_h3]:mb-[13px] [&_h3]:mt-0 [&_h3]:text-xs">
        <label className={classNames(detailSectionClasses, "flex items-center justify-between gap-4")}>
          <span className="text-[10px] font-extrabold">Կարգավիճակ</span>
          <span className="flex items-center gap-2">
            {pending ? <SpinnerGap className="animate-spin text-[#8a6a00] motion-reduce:animate-none" size={18} aria-label="Պահվում է" /> : null}
            <select className={classNames(formControlClasses, "max-w-[185px]")} value={lead.status} onChange={(event) => onStatusChange(lead, event.target.value as LeadStatus)} disabled={pending} aria-busy={pending}>
            {Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
            </select>
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2.5 max-[430px]:grid-cols-1">
          <a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`tel:${phone}`}>
            <Phone className="text-[#8a6a00]" size={20} weight="fill" />
            <span className="grid min-w-0"><strong className="text-[10px]">Զանգահարել</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">{lead.phone}</small></span>
          </a>
          <a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            <WhatsappLogo className="text-[#238b43]" size={20} weight="fill" />
            <span className="grid min-w-0"><strong className="text-[10px]">WhatsApp</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">Բացել զրույցը</small></span>
          </a>
        </div>
        <section className={detailSectionClasses}>
          <h3>Հաճախորդ</h3>
          <dl className={detailListClasses}>
            <div><dt>Անուն</dt><dd>{lead.name}</dd></div>
            <div><dt>Հեռախոս</dt><dd>{lead.phone}</dd></div>
            <div><dt>Կապի եղանակ</dt><dd>{leadContactMethodLabel(lead.method)}</dd></div>
            <div><dt>Աղբյուր</dt><dd>{leadSourceLabel(lead.source)}</dd></div>
            <div><dt>Ստացվել է</dt><dd>{formatDate(lead.createdAt)}</dd></div>
          </dl>
        </section>
        <section className={detailSectionClasses}>
          <h3>Հետաքրքրություն</h3>
          <div className="flex min-h-[58px] items-center gap-2.5 rounded-[10px] bg-[#f6f3ed] p-[11px] text-[#846600]">
            <Car size={22} weight="fill" />
            <span className="grid"><small className="text-[8px] text-[#817c74]">Ընտրված մեքենա</small><strong className="text-[10px] text-[#292722]">{lead.vehicleLabel || "Անհատական ընտրություն"}</strong></span>
          </div>
          <dl className={classNames(detailListClasses, "mt-3")}>
            <div><dt>Հարցման տեսակ</dt><dd>{LEAD_REQUEST_KIND_LABELS[lead.requestKind]}</dd></div>
            {lead.lotId ? <div><dt>Լոտ ID</dt><dd>{lead.lotId}</dd></div> : null}
            {lead.vin ? <div><dt>VIN</dt><dd>{lead.vin}</dd></div> : null}
          </dl>
        </section>
        <section className={detailSectionClasses}>
          <h3>Նախընտրելի ժամ</h3>
          <dl className={detailListClasses}>
            <div><dt>Օր</dt><dd>{lead.date || "Չի նշվել"}</dd></div>
            <div><dt>Ժամ</dt><dd>{lead.time || "Ճկուն"}</dd></div>
          </dl>
        </section>
        <section className={detailSectionClasses}>
          <h3>Մեկնաբանություն</h3>
          <p className="m-0 whitespace-pre-wrap text-[10px] leading-[1.65] text-[#5e5a54]">{lead.note || "Մեկնաբանություն չկա։"}</p>
        </section>
      </div>
    </AdminDrawer>
  );
}
