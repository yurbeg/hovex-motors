import { useCallback, useEffect, useState } from "react";
import {
  getLeads,
  saveLeads,
  subscribeLeads,
} from "../../../infrastructure/browser/adminStore";
import type { Lead, LeadStatus } from "../../../domain/lead";

export function useLocalLeads(notify: (message: string) => void) {
  const [leads, setLeads] = useState<Lead[]>(getLeads);

  useEffect(() => subscribeLeads(setLeads), []);

  const updateLeadStatus = useCallback((lead: Lead, status: LeadStatus) => {
    const next = leads.map((item) => (
      item.id === lead.id
        ? { ...item, status, updatedAt: new Date().toISOString() }
        : item
    ));
    try {
      const saved = saveLeads(next);
      setLeads(saved);
      notify("Հարցման կարգավիճակը թարմացվեց");
      return true;
    } catch {
      notify("Հարցման կարգավիճակը չպահպանվեց");
      return false;
    }
  }, [leads, notify]);

  return { leads, updateLeadStatus };
}
