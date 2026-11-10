export type LeadStatus = "new" | "contacted" | "booked" | "closed";

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
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentVersion?: string;
  /** Present for Supabase-backed leads; optional for legacy local fixtures. */
  consentAt?: string;
}
