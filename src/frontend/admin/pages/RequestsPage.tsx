import { useMemo, useState } from "react";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import type { Lead, LeadStatus } from "../../../domain/lead";
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
  loading: boolean;
  onOpenLead: (lead: Lead) => void;
  onExport: () => void;
}

export function RequestsPage({ leads, loading, onOpenLead, onExport }: RequestsPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus<LeadStatus>>("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return [...leads]
      .filter((lead) => status === "all" || lead.status === status)
      .filter((lead) => !needle || [lead.name, lead.phone, lead.vehicleLabel, lead.note, lead.method]
        .some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, query, status]);

  return (
    <>
      <section className={pageHeadingClasses}>
        <div className="min-w-0"><p className={eyebrowClasses}>Հաճախորդների հոսք</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.15] tracking-[-0.035em] max-[700px]:text-2xl max-[430px]:text-[21px]">Խորհրդատվության հարցումներ</h1><span className="text-[13px] text-[#77726b]">{loading ? "Տվյալները բեռնվում են…" : `${leads.length} ընդհանուր · ${leads.filter((lead) => lead.status === "new").length} նոր`}</span></div>
        <AdminButton className={pageHeadingButtonClasses} icon={DownloadSimple} variant="secondary" onClick={onExport} disabled={loading || !leads.length} aria-label="Ներբեռնել հարցումները CSV ձևաչափով">Ներբեռնել CSV</AdminButton>
      </section>
      <DataModeNotice scope="requests" />
      <section className={panelClasses}>
        <div className={toolbarClasses}>
          <label className={searchClasses}><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել հարցում</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Անուն, հեռախոս կամ մեքենա" disabled={loading} /></label>
          <label className={filterClasses}><span>Կարգավիճակ</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus<LeadStatus>)} disabled={loading}><option value="all">Բոլորը</option>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <span className="ml-auto text-[10px] text-[#817c74] max-[700px]:self-center">{loading ? "Բեռնվում է" : `Ցուցադրվում է ${filtered.length}`}</span>
        </div>
        <RequestTable leads={filtered} onSelect={onOpenLead} loading={loading} />
      </section>
    </>
  );
}
