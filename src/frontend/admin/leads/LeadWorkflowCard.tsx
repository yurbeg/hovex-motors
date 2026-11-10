import { FloppyDisk, UserCircle, UserPlus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  LEAD_STATUS_TRANSITIONS,
  type Lead,
  type LeadManager,
  type LeadStatus,
} from "../../../domain/lead";
import type { LeadWorkflowValues } from "../../../infrastructure/supabase/adminLeadRepository";
import { AdminButton } from "../components/AdminButton";
import { classNames } from "../shared/classNames";
import { formatDate } from "../shared/formatters";
import { leadStatus } from "../shared/statuses";
import { formControlClasses } from "../shared/styles";
import { LeadUrgencyBadge } from "./LeadUrgencyBadge";

function isoToLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function LeadWorkflowCard({
  lead,
  managers,
  currentAuthUserId,
  now,
  pending,
  onSave,
}: {
  lead: Lead;
  managers: LeadManager[];
  currentAuthUserId: string;
  now: number;
  pending: boolean;
  onSave: (values: LeadWorkflowValues) => Promise<Lead | null>;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [managerId, setManagerId] = useState(lead.assignedManagerId || "");
  const [nextAction, setNextAction] = useState(isoToLocalInput(lead.nextActionAt));

  useEffect(() => {
    setStatus(lead.status);
    setManagerId(lead.assignedManagerId || "");
    setNextAction(isoToLocalInput(lead.nextActionAt));
  }, [lead.assignedManagerId, lead.nextActionAt, lead.status, lead.updatedAt]);

  const draftManager = managers.find((manager) => manager.id === managerId) || null;
  const assignedManager = managers.find((manager) => manager.id === lead.assignedManagerId) || null;
  const availableManagers = useMemo(() => managers.filter((manager) => (
    manager.active || manager.id === lead.assignedManagerId
  )), [lead.assignedManagerId, managers]);
  const myself = managers.find((manager) => manager.authUserId === currentAuthUserId && manager.active) || null;
  const allowedStatuses = [lead.status, ...LEAD_STATUS_TRANSITIONS[lead.status]];
  const originalNextActionInput = isoToLocalInput(lead.nextActionAt);
  const parsedNextAction = localInputToIso(nextAction);
  const nextActionIso = status === "closed"
    ? null
    : nextAction === originalNextActionInput
      ? lead.nextActionAt
      : parsedNextAction;
  const dirty = status !== lead.status
    || (managerId || null) !== lead.assignedManagerId
    || nextAction !== originalNextActionInput;
  const invalidNextAction = status !== "closed" && Boolean(nextAction) && parsedNextAction === null;

  const save = () => onSave({
    status,
    assignedManagerId: managerId || null,
    nextActionAt: nextActionIso,
  });

  return (
    <section className="rounded-[13px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(29,26,20,0.04)]" aria-labelledby="lead-workflow-title" data-scroll-reveal="up">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 mt-0 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--yellow-ink)]">Աշխատանքային հոսք</p>
          <h3 className="m-0 text-[14px]" id="lead-workflow-title">Արձագանք և պատասխանատու</h3>
        </div>
        <LeadUrgencyBadge lead={lead} now={now} />
      </div>

      <ol className="mb-4 grid list-none grid-cols-4 gap-1 p-0" aria-label="Հարցման փուլեր">
        {(Object.keys(leadStatus) as LeadStatus[]).map((item) => {
          const active = item === lead.status;
          return (
            <li
              className={classNames(
                "min-w-0 rounded-lg px-1.5 py-2 text-center text-[8px] font-extrabold",
                active ? "bg-[#11110f] text-white" : "bg-[var(--surface-soft)] text-[var(--ink-soft)]",
              )}
              key={item}
              aria-current={active ? "step" : undefined}
            >
              {leadStatus[item].label}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <label className="grid gap-1.5">
          <span className="text-[9px] font-extrabold text-[var(--ink-soft)]">Կարգավիճակ</span>
          <select
            className={formControlClasses}
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus)}
            disabled={pending}
          >
            {allowedStatuses.map((value) => <option value={value} key={value}>{leadStatus[value].label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[9px] font-extrabold text-[var(--ink-soft)]">Պատասխանատու մենեջեր</span>
          <select className={formControlClasses} value={managerId} onChange={(event) => setManagerId(event.target.value)} disabled={pending}>
            <option value="">Չնշանակված</option>
            {lead.assignedManagerId && !assignedManager ? <option value={lead.assignedManagerId}>Անհայտ մենեջեր</option> : null}
            {availableManagers.map((manager) => (
              <option value={manager.id} key={manager.id}>
                {manager.displayName}{manager.active ? "" : " (ոչ ակտիվ)"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 max-[560px]:col-span-1">
          <span className="text-[9px] font-extrabold text-[var(--ink-soft)]">Հաջորդ գործողության ժամկետ</span>
          <input
            className={formControlClasses}
            type="datetime-local"
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            disabled={pending || status === "closed"}
          />
          {lead.status === "new" ? <small className="text-[8px] text-[var(--ink-soft)]">Առաջին կապի SLA՝ {formatDate(lead.firstResponseDueAt)}</small> : null}
        </label>
        <div className="flex items-end gap-2 max-[560px]:flex-wrap">
          {myself && myself.id !== managerId ? (
            <button
              className="inline-flex min-h-[43px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[9px] font-extrabold"
              type="button"
              onClick={() => setManagerId(myself.id)}
              disabled={pending}
            >
              <UserPlus size={17} aria-hidden="true" /> Վերցնել ինձ վրա
            </button>
          ) : (
            <span className="inline-flex min-h-[43px] flex-1 items-center gap-2 rounded-[9px] bg-[var(--surface-soft)] px-3 text-[9px] text-[var(--ink-soft)]">
              <UserCircle size={17} aria-hidden="true" /> {draftManager?.displayName || (managerId ? "Անհայտ մենեջեր" : "Պատասխանատու չկա")}
            </span>
          )}
          <AdminButton
            className="min-w-[122px] max-[560px]:flex-1"
            icon={FloppyDisk}
            onClick={() => void save()}
            disabled={pending || !dirty || invalidNextAction}
          >
            {pending ? "Պահվում է…" : "Պահպանել"}
          </AdminButton>
        </div>
      </div>
    </section>
  );
}
