export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  method: string;
  vehicleId: string | null;
  vehicleLabel: string;
  date: string;
  time: string;
  note: string;
  status: LeadStatus;
  source: string;
  demo: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type LeadInput = Partial<Lead> & {
  vehicle?: string;
  preferredDate?: string;
  preferredTime?: string;
  [key: string]: unknown;
};
