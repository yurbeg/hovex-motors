export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export type LeadActivityType =
  | "created"
  | "status_changed"
  | "manager_assigned"
  | "manager_unassigned"
  | "next_action_changed"
  | "note_added";

export type LeadContactMethod =
  | "phone"
  | "whatsapp"
  | "video_call"
  | "showroom_visit";

export type LeadSource = "website" | "ai-assistant" | "auction-catalog";

export type LeadRequestKind = "consultation" | "full_calculation";

export const LEAD_CONTACT_METHOD_LABELS: Readonly<Record<LeadContactMethod, string>> = {
  phone: "Հեռախոսազանգ",
  whatsapp: "WhatsApp",
  video_call: "Տեսազանգ",
  showroom_visit: "Այցելություն սրահ",
};

export const LEAD_REQUEST_KIND_LABELS: Readonly<Record<LeadRequestKind, string>> = {
  consultation: "Խորհրդատվություն",
  full_calculation: "Ամբողջական հաշվարկ",
};

export interface LeadVehicleContext {
  vehicleId: string | null;
  vehicleLabel: string;
  lotId: string | null;
  vin: string | null;
}

export interface LeadManager {
  id: string;
  authUserId: string | null;
  displayName: string;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  actorUserId: string | null;
  actorLabel: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  fromManagerId: string | null;
  toManagerId: string | null;
  fromManagerName: string | null;
  toManagerName: string | null;
  fromNextActionAt: string | null;
  toNextActionAt: string | null;
  note: string | null;
  createdAt: string;
}

/**
 * The only shape accepted by the public lead-submission boundary.
 * Server-owned fields such as status and timestamps are deliberately absent.
 */
export interface PublicLeadSubmission extends LeadVehicleContext {
  clientRequestId: string;
  name: string;
  phone: string;
  contactMethod: LeadContactMethod;
  requestKind: LeadRequestKind;
  preferredDate: string;
  preferredTime: string;
  note: string;
  source: LeadSource;
  consent: true;
}

export interface LeadSubmissionReceipt {
  id: string;
  receivedAt: string;
  duplicate: boolean;
}

export interface Lead extends LeadVehicleContext {
  id: string;
  name: string;
  phone: string;
  method: LeadContactMethod;
  requestKind: LeadRequestKind;
  date: string;
  time: string;
  note: string;
  status: LeadStatus;
  assignedManagerId: string | null;
  firstResponseDueAt: string;
  firstContactedAt: string | null;
  nextActionAt: string | null;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentVersion?: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentAt?: string;
}

export const LEAD_STATUS_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  new: ["contacted", "closed"],
  contacted: ["booked", "closed"],
  booked: ["contacted", "closed"],
  closed: ["contacted"],
};

/** Returns the normal forward action; other practical transitions remain available. */
export function nextLeadStatus(status: LeadStatus): LeadStatus | null {
  if (status === "new" || status === "closed") return "contacted";
  if (status === "contacted") return "booked";
  if (status === "booked") return "closed";
  return null;
}

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  return from === to || LEAD_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * New requests use the first-response SLA; later active states use the explicit
 * next-action deadline selected by a manager. Closed requests have no deadline.
 */
export function leadDueAt(lead: Lead): string | null {
  if (lead.status === "closed") return null;
  return lead.status === "new" ? lead.firstResponseDueAt : lead.nextActionAt;
}

export function isLeadOverdue(lead: Lead, now: number | Date = Date.now()): boolean {
  const dueAt = leadDueAt(lead);
  if (!dueAt) return false;
  const due = Date.parse(dueAt);
  const current = now instanceof Date ? now.getTime() : now;
  return !Number.isNaN(due) && due <= current;
}

export function isLeadUnassigned(lead: Lead): boolean {
  return lead.status !== "closed" && !lead.assignedManagerId;
}

/** Sorts the operational queue by attention first, then by newest request. */
export function compareLeadPriority(left: Lead, right: Lead, now: number | Date = Date.now()): number {
  const rank = (lead: Lead) => {
    if (isLeadOverdue(lead, now)) return 0;
    if (isLeadUnassigned(lead)) return 1;
    if (lead.status === "new") return 2;
    return 3;
  };
  const byRank = rank(left) - rank(right);
  if (byRank) return byRank;
  const byCreatedAt = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  return byCreatedAt || left.id.localeCompare(right.id);
}
