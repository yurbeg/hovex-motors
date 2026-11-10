import { ChatCircleText, Eye, SpinnerGap } from "@phosphor-icons/react";
import type { Lead } from "../../../domain/lead";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { classNames } from "../shared/classNames";
import { formatDate } from "../shared/formatters";
import { leadContactMethodLabel } from "./leadPresentation";
import {
  rowActionClasses,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
} from "../shared/styles";

interface RequestTableProps {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  compact?: boolean;
  loading?: boolean;
}

export function RequestTable({ leads, onSelect, compact = false, loading = false }: RequestTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center gap-2 text-[11px] font-bold text-[#77726b]" role="status">
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
            <th className={classNames(tableHeadClasses, compact && "hidden")}>Հաճախորդ</th>
            <th className={classNames(tableHeadClasses, compact && "hidden")}>Հետաքրքրություն</th>
            <th className={classNames(tableHeadClasses, compact && "hidden")}>Նախընտրելի կապ</th>
            <th className={classNames(tableHeadClasses, compact && "hidden")}>Ստացվել է</th>
            <th className={classNames(tableHeadClasses, compact && "hidden")}>Կարգավիճակ</th>
            <th className={classNames(tableHeadClasses, compact && "hidden")}><span className="sr-only">Բացել</span></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr className="cursor-pointer transition-colors hover:bg-[#fffdf7] [&:last-child>td]:border-b-0" key={lead.id} onClick={() => onSelect(lead)}>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5", "[&>strong]:text-xs")} data-label="Հաճախորդ">
                <strong>{lead.name}</strong><span>{lead.phone}</span>
              </td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5")} data-label="Հետաքրքրություն">
                <strong>{lead.vehicleLabel || "Անհատական ընտրություն"}</strong><span>{lead.note || "Մեկնաբանություն չկա"}</span>
              </td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Նախընտրելի կապ">
                <strong>{leadContactMethodLabel(lead.method)}</strong><span>{lead.date ? `${lead.date} · ${lead.time || ""}` : lead.time || "Ճկուն ժամ"}</span>
              </td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Ստացվել է">
                <span>{formatDate(lead.createdAt)}</span>
                {lead.source === "ai-assistant" ? <small className="mt-1 block w-fit rounded bg-[#fff0a9] px-[5px] py-0.5 text-[7px] font-black tracking-[0.08em] text-[#775c00]">AI</small> : null}
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
