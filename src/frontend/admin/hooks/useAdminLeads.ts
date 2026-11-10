import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead, LeadActivity, LeadManager } from "../../../domain/lead";
import {
  addAdminLeadNote,
  listAdminLeadActivities,
  listAdminLeadManagers,
  listAdminLeads,
  subscribeAdminLeadChanges,
  updateAdminLeadWorkflow,
  type LeadWorkflowValues,
} from "../../../infrastructure/supabase/adminLeadRepository";
import { operationErrorMessage } from "../shared/errors";

const LEAD_WRITE_TIMEOUT_MS = 15_000;

export function useAdminLeads(notify: (message: string) => void) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [managers, setManagers] = useState<LeadManager[]>([]);
  const [activitiesByLeadId, setActivitiesByLeadId] = useState<Record<string, LeadActivity[]>>({});
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [managersLoading, setManagersLoading] = useState(true);
  const [activitiesLoadingLeadId, setActivitiesLoadingLeadId] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState("");
  const [managersError, setManagersError] = useState("");
  const [activitiesError, setActivitiesError] = useState("");
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const pendingLeadIdRef = useRef<string | null>(null);
  const activeLeadIdRef = useRef<string | null>(null);
  const latestLoadRef = useRef(0);
  const latestManagersLoadRef = useRef(0);
  const latestActivitiesLoadRef = useRef(0);
  const realtimeTimerRef = useRef<number | undefined>(undefined);

  const loadLeadsFromSupabase = useCallback(async (
    signal?: AbortSignal,
    { background = false, preserveError = false }: { background?: boolean; preserveError?: boolean } = {},
  ) => {
    const loadId = latestLoadRef.current + 1;
    latestLoadRef.current = loadId;
    if (!background) setLeadsLoading(true);
    if (!preserveError) setLeadsError("");
    try {
      const nextLeads = await listAdminLeads({ signal });
      if (!signal?.aborted && latestLoadRef.current === loadId) setLeads(nextLeads);
    } catch (error) {
      if (!signal?.aborted && latestLoadRef.current === loadId) setLeadsError(operationErrorMessage(error));
    } finally {
      if (!signal?.aborted && latestLoadRef.current === loadId) setLeadsLoading(false);
    }
  }, []);

  const loadManagersFromSupabase = useCallback(async (
    signal?: AbortSignal,
    { background = false }: { background?: boolean } = {},
  ) => {
    const loadId = latestManagersLoadRef.current + 1;
    latestManagersLoadRef.current = loadId;
    if (!background) setManagersLoading(true);
    setManagersError("");
    try {
      const nextManagers = await listAdminLeadManagers({ signal });
      if (!signal?.aborted && latestManagersLoadRef.current === loadId) setManagers(nextManagers);
    } catch (error) {
      if (!signal?.aborted && latestManagersLoadRef.current === loadId) setManagersError(operationErrorMessage(error));
    } finally {
      if (!signal?.aborted && latestManagersLoadRef.current === loadId) setManagersLoading(false);
    }
  }, []);

  const loadLeadActivities = useCallback(async (
    leadId: string,
    { background = false }: { background?: boolean } = {},
  ) => {
    activeLeadIdRef.current = leadId;
    const loadId = latestActivitiesLoadRef.current + 1;
    latestActivitiesLoadRef.current = loadId;
    if (!background) setActivitiesLoadingLeadId(leadId);
    setActivitiesError("");
    try {
      const activities = await listAdminLeadActivities(leadId);
      if (activeLeadIdRef.current === leadId && latestActivitiesLoadRef.current === loadId) {
        setActivitiesByLeadId((current) => ({ ...current, [leadId]: activities }));
      }
    } catch (error) {
      if (activeLeadIdRef.current === leadId && latestActivitiesLoadRef.current === loadId) {
        setActivitiesError(operationErrorMessage(error));
      }
    } finally {
      if (latestActivitiesLoadRef.current === loadId) setActivitiesLoadingLeadId(null);
    }
  }, []);

  const stopWatchingLeadActivities = useCallback(() => {
    activeLeadIdRef.current = null;
    setActivitiesError("");
    setActivitiesLoadingLeadId(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      loadLeadsFromSupabase(controller.signal),
      loadManagersFromSupabase(controller.signal),
    ]);
    return () => controller.abort();
  }, [loadLeadsFromSupabase, loadManagersFromSupabase]);

  useEffect(() => {
    const unsubscribe = subscribeAdminLeadChanges(() => {
      window.clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = window.setTimeout(() => {
        void loadLeadsFromSupabase(undefined, { background: true });
        void loadManagersFromSupabase(undefined, { background: true });
        const activeLeadId = activeLeadIdRef.current;
        if (activeLeadId) void loadLeadActivities(activeLeadId, { background: true });
      }, 120);
    });
    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      unsubscribe();
    };
  }, [loadLeadActivities, loadLeadsFromSupabase, loadManagersFromSupabase]);

  const applySavedLead = useCallback((saved: Lead) => {
    setLeads((current) => {
      const exists = current.some((lead) => lead.id === saved.id);
      const next = exists ? current.map((lead) => lead.id === saved.id ? saved : lead) : [saved, ...current];
      return next.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    });
  }, []);

  const saveLeadWorkflow = useCallback(async (lead: Lead, values: LeadWorkflowValues) => {
    if (pendingLeadIdRef.current || leadsLoading) return null;
    pendingLeadIdRef.current = lead.id;
    setPendingLeadId(lead.id);
    setLeadsError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LEAD_WRITE_TIMEOUT_MS);
    try {
      const saved = await updateAdminLeadWorkflow(lead, values, { signal: controller.signal });
      applySavedLead(saved);
      notify("Հարցման աշխատանքային տվյալները թարմացվեցին");
      void loadLeadActivities(lead.id, { background: true });
      return saved;
    } catch (error) {
      setLeadsError(operationErrorMessage(error));
      notify("Հարցման փոփոխությունները չպահվեցին");
      void loadLeadsFromSupabase(undefined, { background: true, preserveError: true });
      void loadLeadActivities(lead.id, { background: true });
      return null;
    } finally {
      window.clearTimeout(timeout);
      pendingLeadIdRef.current = null;
      setPendingLeadId(null);
    }
  }, [applySavedLead, leadsLoading, loadLeadActivities, loadLeadsFromSupabase, notify]);

  const addLeadNote = useCallback(async (leadId: string, body: string) => {
    if (pendingLeadIdRef.current || leadsLoading) return null;
    pendingLeadIdRef.current = leadId;
    setPendingLeadId(leadId);
    setActivitiesError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LEAD_WRITE_TIMEOUT_MS);
    try {
      const saved = await addAdminLeadNote(leadId, body, { signal: controller.signal });
      setActivitiesByLeadId((current) => ({
        ...current,
        [leadId]: [saved, ...(current[leadId] || []).filter((activity) => activity.id !== saved.id)],
      }));
      notify("Ներքին նշումը պահպանվեց");
      return saved;
    } catch (error) {
      setActivitiesError(operationErrorMessage(error));
      notify("Ներքին նշումը չպահպանվեց");
      return null;
    } finally {
      window.clearTimeout(timeout);
      pendingLeadIdRef.current = null;
      setPendingLeadId(null);
    }
  }, [leadsLoading, notify]);

  return {
    leads,
    managers,
    activitiesByLeadId,
    leadsLoading,
    managersLoading,
    activitiesLoadingLeadId,
    leadsError,
    managersError,
    activitiesError,
    pendingLeadId,
    loadLeadsFromSupabase,
    loadManagersFromSupabase,
    loadLeadActivities,
    stopWatchingLeadActivities,
    saveLeadWorkflow,
    addLeadNote,
  };
}
