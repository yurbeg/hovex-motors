import { ClockCountdown, WarningCircle } from "@phosphor-icons/react";
import { isLeadOverdue, leadDueAt, type Lead } from "../../../domain/lead";
import { classNames } from "../shared/classNames";
import { formatDate } from "../shared/formatters";

function relativeDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(Math.abs(milliseconds) / 60_000));
  if (minutes < 60) return `${minutes} ր`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} ժ ${remainingMinutes} ր` : `${hours} ժ`;
  }
  const days = Math.floor(minutes / (24 * 60));
  const remainingHours = Math.floor((minutes % (24 * 60)) / 60);
  return remainingHours ? `${days} օր ${remainingHours} ժ` : `${days} օր`;
}

export function LeadUrgencyBadge({ lead, now, className }: {
  lead: Lead;
  now: number;
  className?: string;
}) {
  const dueAt = leadDueAt(lead);
  if (!dueAt) return null;
  const due = Date.parse(dueAt);
  if (Number.isNaN(due)) return null;
  const overdue = isLeadOverdue(lead, now);
  const Icon = overdue ? WarningCircle : ClockCountdown;
  const prefix = lead.status === "new" ? "Առաջին կապ" : "Հաջորդ քայլ";

  return (
    <span
      className={classNames(
        "inline-flex min-h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[9px] font-extrabold",
        overdue ? "bg-[#fff0ed] text-[#a33b29]" : "bg-[#fff4c9] text-[#775d00]",
        className,
      )}
      title={`${prefix}՝ ${formatDate(dueAt)}`}
    >
      <Icon size={14} weight="fill" aria-hidden="true" />
      {overdue ? `Ուշացած · ${relativeDuration(now - due)}` : `Մինչև · ${relativeDuration(due - now)}`}
    </span>
  );
}
