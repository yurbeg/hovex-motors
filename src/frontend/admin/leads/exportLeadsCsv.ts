import { LEAD_REQUEST_KIND_LABELS, type Lead } from "../../../domain/lead";
import { leadStatus } from "../shared/statuses";
import { leadContactMethodLabel } from "./leadPresentation";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  const safeText = /^\s*[=+\-@]/u.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function buildLeadsCsv(leads: Lead[]): string {
  const rows = [
    ["Անուն", "Հեռախոս", "Հարցման տեսակ", "Մեքենա", "Լոտ ID", "VIN", "Կապի եղանակ", "Օր", "Ժամ", "Կարգավիճակ", "Մեկնաբանություն", "Ստացվել է"],
    ...leads.map((lead) => [
      lead.name,
      lead.phone,
      LEAD_REQUEST_KIND_LABELS[lead.requestKind],
      lead.vehicleLabel,
      lead.lotId,
      lead.vin,
      leadContactMethodLabel(lead.method),
      lead.date,
      lead.time,
      leadStatus[lead.status]?.label,
      lead.note,
      lead.createdAt,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function downloadLeadsCsv(leads: Lead[]): void {
  const blob = new Blob([buildLeadsCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hovex-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
