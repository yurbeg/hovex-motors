import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead, LeadStatus } from "../../../domain/lead";
import {
  listAdminLeads,
  subscribeAdminLeadChanges,
  updateAdminLeadStatus,
} from "../../../infrastructure/supabase/adminLeadRepository";
import { operationErrorMessage } from "../shared/errors";

export function useAdminLeads(notify: (message: string) => void) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState("");
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const pendingLeadIdRef = useRef<string | null>(null);
  const latestLoadRef = useRef(0);
  const realtimeTimerRef = useRef<number | undefined>(undefined);

  const loadLeadsFromSupabase = useCallback(async (
    signal?: AbortSignal,
    {
      background = false,
      preserveError = false,
    }: { background?: boolean; preserveError?: boolean } = {},
  ) => {
    const loadId = latestLoadRef.current + 1;
    latestLoadRef.current = loadId;
    if (!background) setLeadsLoading(true);
    if (!preserveError) setLeadsError("");
    try {
      const nextLeads = await listAdminLeads({ signal });
      if (!signal?.aborted && latestLoadRef.current === loadId) {
        setLeads(nextLeads);
      }
    } catch (error) {
      if (!signal?.aborted && latestLoadRef.current === loadId) {
        setLeadsError(operationErrorMessage(error));
      }
    } finally {
      if (!signal?.aborted && latestLoadRef.current === loadId) {
        setLeadsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLeadsFromSupabase(controller.signal);
    return () => controller.abort();
  }, [loadLeadsFromSupabase]);

  useEffect(() => {
    const unsubscribe = subscribeAdminLeadChanges(() => {
      window.clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = window.setTimeout(() => {
        void loadLeadsFromSupabase(undefined, { background: true });
      }, 120);
    });
    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      unsubscribe();
    };
  }, [loadLeadsFromSupabase]);

  const applySavedLead = useCallback((saved: Lead) => {
    setLeads((current) => {
      const exists = current.some((lead) => lead.id === saved.id);
      const next = exists
        ? current.map((lead) => lead.id === saved.id ? saved : lead)
        : [saved, ...current];
      return next.sort((left, right) => (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ));
    });
  }, []);

  const changeLeadStatus = useCallback(async (lead: Lead, status: LeadStatus) => {
    if (pendingLeadIdRef.current || leadsLoading || lead.status === status) return null;
    pendingLeadIdRef.current = lead.id;
    setPendingLeadId(lead.id);
    setLeadsError("");
    try {
      const saved = await updateAdminLeadStatus(lead.id, status, {
        expectedUpdatedAt: lead.updatedAt,
      });
      applySavedLead(saved);
      notify("Հարցման կարգավիճակը թարմացվեց");
      return saved;
    } catch (error) {
      setLeadsError(operationErrorMessage(error));
      notify("Հարցման կարգավիճակը չփոխվեց");
      // A failed optimistic-lock check means this copy may be stale. Reloading
      // also keeps the drawer accurate after another admin edits the request.
      void loadLeadsFromSupabase(undefined, {
        background: true,
        preserveError: true,
      });
      return null;
    } finally {
      pendingLeadIdRef.current = null;
      setPendingLeadId(null);
    }
  }, [applySavedLead, leadsLoading, loadLeadsFromSupabase, notify]);

  return {
    leads,
    leadsLoading,
    leadsError,
    pendingLeadId,
    loadLeadsFromSupabase,
    changeLeadStatus,
  };
}
