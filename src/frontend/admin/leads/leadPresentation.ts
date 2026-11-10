import {
  LEAD_CONTACT_METHOD_LABELS,
  type LeadContactMethod,
  type LeadSource,
} from "../../../domain/lead";

const leadSourceLabels: Readonly<Record<LeadSource, string>> = {
  website: "Կայք",
  "ai-assistant": "Hovex AI օգնական",
  "auction-catalog": "Աճուրդների կատալոգ",
};

export function leadContactMethodLabel(value: string): string {
  return value in LEAD_CONTACT_METHOD_LABELS
    ? LEAD_CONTACT_METHOD_LABELS[value as LeadContactMethod]
    : value || "Չի նշվել";
}

export function leadSourceLabel(value: string): string {
  return value in leadSourceLabels
    ? leadSourceLabels[value as LeadSource]
    : value || "Չի նշվել";
}
