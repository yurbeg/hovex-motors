import { useMemo, useState } from "react";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import {
  compareLeadPriority,
  isLeadOverdue,
  isLeadUnassigned,
  type Lead,
  type LeadManager,
  type LeadStatus,
} from "../../../domain/lead";
import { AdminButton } from "../components/AdminButton";
import { DataModeNotice } from "../components/DataModeNotice";
import { RequestTable } from "../leads/RequestTable";
import type { FilterStatus } from "../shared/adminTypes";
import { leadStatus } from "../shared/statuses";
import {
  eyebrowClasses,
  filterClasses,
  pageHeadingButtonClasses,
  pageHeadingClasses,
  panelClasses,
  searchClasses,
  toolbarClasses,
} from "../shared/styles";

interface RequestsPageProps {
  leads: Lead[];
  managers: LeadManager[];
  now: number;
  loading: boolean;
  onOpenLead: (lead: Lead) => void;
  onExport: () => void;
}

type AttentionFilter = "all" | "overdue" | "unassigned";

export function RequestsPage({ leads, managers, now, loading, onOpenLead, onExport }: RequestsPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus<LeadStatus>>("all");
  const [manager, setManager] = useState("all");
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return [...leads]
      .filter((lead) => status === "all" || lead.status === status)
      .filter((lead) => manager === "all" || (manager === "unassigned" ? !lead.assignedManagerId : lead.assignedManagerId === manager))
      .filter((lead) => attention === "all" || (attention === "overdue" ? isLeadOverdue(lead, now) : isLeadUnassigned(lead)))
      .filter((lead) => {
        const assignedManager = managers.find((item) => item.id === lead.assignedManagerId);
        return !needle || [lead.name, lead.phone, lead.vehicleLabel, lead.note, lead.method, assignedManager?.displayName]
          .some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle));
      })
      .sort((a, b) => compareLeadPriority(a, b, now));
  }, [attention, leads, manager, managers, now, query, status]);
  const overdueCount = leads.filter((lead) => isLeadOverdue(lead, now)).length;

  return (
    <>
      <section className={pageHeadingClasses}>
        <div className="min-w-0"><p className={eyebrowClasses}>Հաճախորդների հոսք</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.22] font-bold max-[700px]:text-2xl max-[430px]:text-[21px]">Խորհրդատվության հարցումներ</h1><span className="text-[13px] text-[var(--ink-soft)]">{loading ? "Տվյալները բեռնվում են…" : `${leads.length} ընդհանուր · ${leads.filter((lead) => lead.status === "new").length} նոր · ${overdueCount} ուշացած`}</span></div>
        <AdminButton className={pageHeadingButtonClasses} icon={DownloadSimple} variant="secondary" onClick={onExport} disabled={loading || !leads.length} aria-label="Ներբեռնել հարցումները CSV ձևաչափով">Ներբեռնել CSV</AdminButton>
      </section>
      <DataModeNotice scope="requests" />
      <section className={panelClasses}>
        <div className={`${toolbarClasses} max-[1180px]:flex-wrap`}>
          <label className={`${searchClasses} max-[1180px]:w-full`}><MagnifyingGlass size={19} aria-hidden="true" /><span className="sr-only">Փնտրել հարցում</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Անուն, հեռախոս կամ մեքենա" disabled={loading} /></label>
          <label className={filterClasses}><span>Կարգավիճակ</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus<LeadStatus>)} disabled={loading}><option value="all">Բոլորը</option>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <label className={filterClasses}><span>Մենեջեր</span><select value={manager} onChange={(event) => setManager(event.target.value)} disabled={loading}><option value="all">Բոլորը</option><option value="unassigned">Չնշանակված</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.displayName}{item.active ? "" : " (ոչ ակտիվ)"}</option>)}</select></label>
          <label className={filterClasses}><span>Ուշադրություն</span><select value={attention} onChange={(event) => setAttention(event.target.value as AttentionFilter)} disabled={loading}><option value="all">Բոլորը</option><option value="overdue">Ուշացած</option><option value="unassigned">Չնշանակված</option></select></label>
          <span className="ml-auto text-[10px] text-[var(--muted)] max-[700px]:self-center">{loading ? "Բեռնվում է" : `Ցուցադրվում է ${filtered.length}`}</span>
        </div>
        <RequestTable leads={filtered} managers={managers} now={now} onSelect={onOpenLead} loading={loading} />
      </section>
    </>
  );
}
