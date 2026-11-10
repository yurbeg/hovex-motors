import { ChatCircleText, Eye, SpinnerGap } from "@phosphor-icons/react";
import { LEAD_REQUEST_KIND_LABELS, type Lead, type LeadManager } from "../../../domain/lead";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { classNames } from "../shared/classNames";
import { formatDate } from "../shared/formatters";
import { leadContactMethodLabel } from "./leadPresentation";
import { LeadUrgencyBadge } from "./LeadUrgencyBadge";
import {
  rowActionClasses,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
} from "../shared/styles";

interface RequestTableProps {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  managers?: LeadManager[];
  now?: number;
  compact?: boolean;
  loading?: boolean;
}

export function RequestTable({ leads, onSelect, managers = [], now = Date.now(), compact = false, loading = false }: RequestTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center gap-2 text-[11px] font-bold text-[var(--ink-soft)]" role="status">
        <SpinnerGap className="animate-spin motion-reduce:animate-none" size={21} aria-hidden="true" />
        <span>Հարցումները բեռնվում են…</span>
      </div>
    );
  }

  if (!leads.length) {
    return <EmptyState icon={ChatCircleText} title="Հարցումներ չկան" text="Նոր հարցումները կհայտնվեն այստեղ։" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className={tableClasses}>
        <thead>
          <tr>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}>Հաճախորդ</th>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}>Հետաքրքրություն</th>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}>Արձագանք</th>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}>Պատասխանատու</th>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}>Կարգավիճակ</th>
            <th className={classNames(tableHeadClasses, compact && "sr-only")}><span className="sr-only">Բացել</span></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr className="cursor-pointer transition-colors hover:bg-[var(--yellow-pale)] [&:last-child>td]:border-b-0" key={lead.id} onClick={() => onSelect(lead)}>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5", "[&>strong]:text-xs")} data-label="Հաճախորդ">
                <strong>{lead.name}</strong><span>{lead.phone} · {leadContactMethodLabel(lead.method)}</span>
              </td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5")} data-label="Հետաքրքրություն">
                <strong>{lead.vehicleLabel || "Անհատական ընտրություն"}</strong><span>{LEAD_REQUEST_KIND_LABELS[lead.requestKind]}</span>
              </td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Արձագանք">
                <strong>{formatDate(lead.createdAt)}</strong>
                <LeadUrgencyBadge lead={lead} now={now} className="mt-1" />
              </td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Պատասխանատու">
                {(() => {
                  const manager = managers.find((item) => item.id === lead.assignedManagerId);
                  return manager
                    ? <span className="!inline-flex min-h-7 w-fit items-center rounded-full bg-[var(--green-pale)] px-2.5 !text-[9px] font-extrabold !text-[var(--green-ink)]">{manager.displayName}</span>
                    : lead.assignedManagerId
                      ? <span className="!inline-flex min-h-7 w-fit items-center rounded-full bg-[var(--surface-soft)] px-2.5 !text-[9px] font-extrabold !text-[var(--ink-soft)]">Անհայտ մենեջեր</span>
                      : <span className="!inline-flex min-h-7 w-fit items-center rounded-full bg-[var(--orange-pale)] px-2.5 !text-[9px] font-extrabold !text-[var(--orange-ink)]">Չնշանակված</span>;
                })()}
              </td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5")} data-label="Կարգավիճակ">
                <StatusBadge type="lead" value={lead.status} />
              </td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5", "max-[700px]:min-h-0 max-[700px]:p-0")}>
                <button
                  type="button"
                  className={rowActionClasses}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(lead);
                  }}
                  aria-label={`${lead.name} հարցումը բացել`}
                >
                  <Eye size={19} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
