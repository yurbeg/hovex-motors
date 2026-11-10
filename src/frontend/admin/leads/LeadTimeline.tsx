import {
  CalendarCheck,
  ChatCircleText,
  ClockCounterClockwise,
  SpinnerGap,
  UserSwitch,
} from "@phosphor-icons/react";
import type { LeadActivity } from "../../../domain/lead";
import { formatDate } from "../shared/formatters";
import { leadStatus } from "../shared/statuses";

function activityText(activity: LeadActivity): string {
  switch (activity.type) {
    case "created":
      return "Հարցումը ստացվել է";
    case "status_changed":
      return activity.toStatus
        ? `Կարգավիճակը փոխվել է՝ ${leadStatus[activity.toStatus].label}`
        : "Կարգավիճակը փոխվել է";
    case "manager_assigned":
      return `Պատասխանատու է նշանակվել՝ ${activity.toManagerName || "մենեջեր"}`;
    case "manager_unassigned":
      return `Պատասխանատուն հանվել է${activity.fromManagerName ? `՝ ${activity.fromManagerName}` : ""}`;
    case "next_action_changed":
      return activity.toNextActionAt
        ? `Հաջորդ գործողությունը նշանակվել է՝ ${formatDate(activity.toNextActionAt)}`
        : "Հաջորդ գործողության ժամկետը հանվել է";
    case "note_added":
      return "Ներքին նշում";
  }
}

function ActivityIcon({ activity }: { activity: LeadActivity }) {
  if (activity.type === "note_added") return <ChatCircleText size={17} weight="fill" aria-hidden="true" />;
  if (activity.type.includes("manager")) return <UserSwitch size={17} weight="fill" aria-hidden="true" />;
  if (activity.type === "next_action_changed") return <CalendarCheck size={17} weight="fill" aria-hidden="true" />;
  return <ClockCounterClockwise size={17} weight="fill" aria-hidden="true" />;
}

export function LeadTimeline({
  activities,
  loading,
  error,
  onRetry,
}: {
  activities: LeadActivity[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[13px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="lead-timeline-title" data-scroll-reveal="up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="m-0 text-xs" id="lead-timeline-title">Գործողությունների պատմություն</h3>
        {loading ? <SpinnerGap className="animate-spin text-[var(--yellow-ink)] motion-reduce:animate-none" size={18} aria-label="Պատմությունը բեռնվում է" /> : null}
      </div>
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--red-pale)] p-2.5 text-[9px] font-bold text-[var(--red-ink)]" role="alert">
          <span>{error}</span>
          <button className="cursor-pointer border-0 bg-transparent font-black text-[var(--red-ink)] underline disabled:cursor-wait disabled:opacity-60" type="button" onClick={onRetry} disabled={loading}>Կրկին փորձել</button>
        </div>
      ) : null}
      {!loading && !error && !activities.length ? <p className="m-0 text-[9px] text-[var(--ink-soft)]">Գործողություններ դեռ չկան։</p> : null}
      <ol className="m-0 grid list-none gap-0 p-0" data-scroll-stagger>
        {activities.map((activity, index) => (
          <li className="relative grid grid-cols-[30px_1fr] gap-2.5 pb-4 last:pb-0" key={activity.id} data-scroll-reveal="up">
            {index < activities.length - 1 ? <span className="absolute bottom-0 left-[14px] top-[29px] w-px bg-[var(--surface-muted)]" aria-hidden="true" /> : null}
            <span className="relative z-[1] grid size-[29px] place-items-center rounded-full bg-[var(--yellow-pale)] text-[var(--yellow-ink)]">
              <ActivityIcon activity={activity} />
            </span>
            <div className="min-w-0 pt-0.5">
              <strong className="block text-[10px] leading-[1.45]">{activityText(activity)}</strong>
              {activity.type === "status_changed" && activity.fromStatus ? (
                <span className="mt-0.5 block text-[8px] text-[var(--ink-soft)]">{leadStatus[activity.fromStatus].label} → {activity.toStatus ? leadStatus[activity.toStatus].label : "—"}</span>
              ) : null}
              {activity.note ? <p className="mb-1 mt-1.5 break-words whitespace-pre-wrap rounded-lg bg-[var(--surface-soft)] p-2.5 text-[9px] leading-[1.55] text-[var(--ink)] [overflow-wrap:anywhere]">{activity.note}</p> : null}
              <small className="mt-1 block text-[8px] text-[var(--ink-soft)]">{activity.actorLabel} · {formatDate(activity.createdAt)}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
