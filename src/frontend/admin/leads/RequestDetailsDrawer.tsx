import { Car, Phone, WhatsappLogo } from "@phosphor-icons/react";
import {
  LEAD_REQUEST_KIND_LABELS,
  type Lead,
  type LeadActivity,
  type LeadManager,
} from "../../../domain/lead";
import type { LeadWorkflowValues } from "../../../infrastructure/supabase/adminLeadRepository";
import { AdminDrawer } from "../components/AdminDrawer";
import { classNames } from "../shared/classNames";
import { formatDate, safePhone } from "../shared/formatters";
import { leadContactMethodLabel, leadSourceLabel } from "./leadPresentation";
import { detailListClasses, detailSectionClasses } from "../shared/styles";
import { LeadNoteComposer } from "./LeadNoteComposer";
import { LeadTimeline } from "./LeadTimeline";
import { LeadWorkflowCard } from "./LeadWorkflowCard";

interface RequestDetailsDrawerProps {
  lead: Lead;
  managers: LeadManager[];
  activities: LeadActivity[];
  activitiesLoading: boolean;
  activitiesError: string;
  currentAuthUserId: string;
  now: number;
  onClose: () => void;
  onWorkflowSave: (values: LeadWorkflowValues) => Promise<Lead | null>;
  onAddNote: (body: string) => Promise<LeadActivity | null>;
  onRetryActivities: () => void;
  pending: boolean;
}

export function RequestDetailsDrawer({
  lead,
  managers,
  activities,
  activitiesLoading,
  activitiesError,
  currentAuthUserId,
  now,
  onClose,
  onWorkflowSave,
  onAddNote,
  onRetryActivities,
  pending,
}: RequestDetailsDrawerProps) {
  const phone = safePhone(lead.phone);
  const whatsapp = phone.replace(/^\+/, "");

  return (
    <AdminDrawer title={lead.name} eyebrow="Հարցման մանրամասներ" onClose={onClose} locked={pending} wide>
      <div className="grid gap-[15px] p-5 max-[430px]:p-3.5 [&_h3]:mb-[13px] [&_h3]:mt-0 [&_h3]:text-xs">
        <LeadWorkflowCard
          lead={lead}
          managers={managers}
          currentAuthUserId={currentAuthUserId}
          now={now}
          pending={pending}
          onSave={onWorkflowSave}
        />

        <div className="grid grid-cols-2 gap-2.5 max-[430px]:grid-cols-1" aria-label="Արագ կապ">
          <a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`tel:${phone}`}>
            <Phone className="text-[#8a6a00]" size={20} weight="fill" aria-hidden="true" />
            <span className="grid min-w-0"><strong className="text-[10px]">Զանգահարել</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">{lead.phone}</small></span>
          </a>
          <a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            <WhatsappLogo className="text-[#238b43]" size={20} weight="fill" aria-hidden="true" />
            <span className="grid min-w-0"><strong className="text-[10px]">WhatsApp</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">Բացել զրույցը</small></span>
          </a>
        </div>

        <LeadNoteComposer pending={pending} onAdd={onAddNote} />
        <LeadTimeline activities={activities} loading={activitiesLoading} error={activitiesError} onRetry={onRetryActivities} />

        <section className={detailSectionClasses}>
          <h3>Հաճախորդ</h3>
          <dl className={detailListClasses}>
            <div><dt>Անուն</dt><dd>{lead.name}</dd></div>
            <div><dt>Հեռախոս</dt><dd>{lead.phone}</dd></div>
            <div><dt>Կապի եղանակ</dt><dd>{leadContactMethodLabel(lead.method)}</dd></div>
            <div><dt>Աղբյուր</dt><dd>{leadSourceLabel(lead.source)}</dd></div>
            <div><dt>Ստացվել է</dt><dd>{formatDate(lead.createdAt)}</dd></div>
            <div><dt>Առաջին կապ</dt><dd>{lead.firstContactedAt ? formatDate(lead.firstContactedAt) : lead.status === "new" ? "Դեռ չի եղել" : "Տվյալ չկա"}</dd></div>
          </dl>
        </section>
        <section className={detailSectionClasses}>
          <h3>Հետաքրքրություն</h3>
          <div className="flex min-h-[58px] items-center gap-2.5 rounded-[10px] bg-[#f6f3ed] p-[11px] text-[#846600]">
            <Car size={22} weight="fill" aria-hidden="true" />
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
          <h3>Հաճախորդի մեկնաբանություն</h3>
          <p className="m-0 whitespace-pre-wrap text-[10px] leading-[1.65] text-[#5e5a54]">{lead.note || "Մեկնաբանություն չկա։"}</p>
        </section>
      </div>
    </AdminDrawer>
  );
}
