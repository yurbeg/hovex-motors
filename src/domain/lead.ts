export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export type LeadContactMethod =
  | "phone"
  | "whatsapp"
  | "video_call"
  | "showroom_visit";

export type LeadSource = "website" | "ai-assistant" | "auction-catalog";

export const LEAD_CONTACT_METHOD_LABELS: Readonly<Record<LeadContactMethod, string>> = {
  phone: "Հեռախոսազանգ",
  whatsapp: "WhatsApp",
  video_call: "Տեսազանգ",
  showroom_visit: "Այցելություն սրահ",
};

/**
 * The only shape accepted by the public lead-submission boundary.
 * Server-owned fields such as status and timestamps are deliberately absent.
 */
export interface PublicLeadSubmission {
  clientRequestId: string;
  name: string;
  phone: string;
  contactMethod: LeadContactMethod;
  vehicleId: string | null;
  vehicleLabel: string;
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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  method: LeadContactMethod;
  vehicleId: string | null;
  vehicleLabel: string;
  date: string;
  time: string;
  note: string;
  status: LeadStatus;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentVersion?: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentAt?: string;
}
