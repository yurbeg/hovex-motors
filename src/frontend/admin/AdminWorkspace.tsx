import { useCallback, useEffect, useState } from "react";
import type { Lead } from "../../domain/lead";
import type { Vehicle } from "../../domain/vehicle";
import type { AuthorizedAdmin } from "./auth/authTypes";
import { AdminToast } from "./components/AdminToast";
import { useAdminNavigation } from "./hooks/useAdminNavigation";
import { useAdminLeads } from "./hooks/useAdminLeads";
import { useAdminVehicles } from "./hooks/useAdminVehicles";
import { useToast } from "./hooks/useToast";
import { AdminSidebar } from "./layout/AdminSidebar";
import { AdminTopbar } from "./layout/AdminTopbar";
import { downloadLeadsCsv } from "./leads/exportLeadsCsv";
import { RequestDetailsDrawer } from "./leads/RequestDetailsDrawer";
import { DashboardPage } from "./pages/DashboardPage";
import { RequestsPage } from "./pages/RequestsPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VehicleEditorDrawer } from "./vehicles/VehicleEditorDrawer";
import type { VehicleSavePayload } from "./vehicles/vehicleEditorModel";

interface AdminWorkspaceProps {
  admin: AuthorizedAdmin;
  onSignOut: () => Promise<void>;
}

export function AdminWorkspace({ admin, onSignOut }: AdminWorkspaceProps) {
  const [editorVehicle, setEditorVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [editorBusy, setEditorBusy] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast, notify } = useToast();
  const {
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
  } = useAdminLeads(notify);
  const [now, setNow] = useState(() => Date.now());
  const {
    vehicles,
    vehiclesLoading,
    vehiclesError,
    pendingVehicleId,
    loadVehiclesFromSupabase,
    saveVehicle,
    changeVehicleStatus,
    toggleFeatured,
    archiveVehicle,
  } = useAdminVehicles(notify);
  const closeOverlays = useCallback(() => {
    if (pendingVehicleId || pendingLeadId || editorBusy) return;
    setEditorVehicle(undefined);
    setSelectedLead(null);
    stopWatchingLeadActivities();
  }, [editorBusy, pendingLeadId, pendingVehicleId, stopWatchingLeadActivities]);
  const { view, navigate } = useAdminNavigation(closeOverlays);

  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const timer = window.setInterval(updateClock, 60_000);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  useEffect(() => {
    setSelectedLead((current) => {
      if (!current) return null;
      return leads.find((lead) => lead.id === current.id) || current;
    });
  }, [leads]);

  const handleSaveVehicle = async (vehicle: VehicleSavePayload) => {
    if (await saveVehicle(vehicle)) setEditorVehicle(undefined);
  };

  const handleArchiveVehicle = async (vehicle: Vehicle) => {
    if (await archiveVehicle(vehicle)) setEditorVehicle(undefined);
  };

  const openLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    void loadLeadActivities(lead.id);
  }, [loadLeadActivities]);

  const handleLeadWorkflow = async (lead: Lead, values: Parameters<typeof saveLeadWorkflow>[1]) => {
    const saved = await saveLeadWorkflow(lead, values);
    if (saved) {
      setSelectedLead((current) => current?.id === lead.id ? saved : current);
    }
    return saved;
  };

  const exportLeads = () => {
    if (leadsLoading || !leads.length) return;
    downloadLeadsCsv(leads, managers);
    notify("CSV ֆայլը պատրաստ է");
  };

  const requestSignOut = () => {
    void onSignOut().catch(() => notify("Դուրս գալը չհաջողվեց"));
  };

  const newLeadCount = leads.filter((lead) => lead.status === "new").length;
  const dataLoading = vehiclesLoading || leadsLoading || managersLoading;
  const leadDataError = leadsError || managersError;
  const dataError = vehiclesError || leadDataError;
  const connectionLabel = dataLoading
    ? "Supabase-ից բեռնվում է"
    : dataError
      ? "Supabase կապի խնդիր"
      : "Supabase-ին միացված է";
  const connectionDot = dataLoading
    ? "bg-[#dca900]"
    : dataError
      ? "bg-[#c94b36]"
      : "bg-[#36ad55]";

  return (
    <div className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)] bg-[radial-gradient(circle_at_92%_0%,rgba(255,196,0,0.08),transparent_28%),var(--paper)] text-[var(--ink)] max-[900px]:block">
      <AdminSidebar
        view={view}
        onNavigate={navigate}
        newLeadCount={newLeadCount}
        adminEmail={admin.email}
        onSignOut={requestSignOut}
      />
      <div className="min-w-0">
        <AdminTopbar
          connectionLabel={connectionLabel}
          connectionDot={connectionDot}
          adminEmail={admin.email}
          onSignOut={requestSignOut}
        />
        <main
          className="mx-auto w-[min(1480px,100%)] px-[clamp(24px,3.2vw,50px)] pb-[60px] pt-[38px] max-[900px]:pt-7 max-[700px]:px-3.5 max-[700px]:pb-11 max-[700px]:pt-[23px]"
          data-admin-focus-fallback
          tabIndex={-1}
        >
          {vehiclesError ? (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--red-border)] bg-[var(--red-pale)] px-4 py-3 text-[10px] font-bold text-[var(--red-ink)]" role="alert">
              <span>{vehiclesError}</span>
              <button className="shrink-0 cursor-pointer border-0 bg-transparent font-black text-[var(--red-ink)] underline" type="button" onClick={() => void loadVehiclesFromSupabase()} disabled={vehiclesLoading || Boolean(pendingVehicleId)}>Կրկին փորձել</button>
            </div>
          ) : null}
          {leadDataError ? (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--red-border)] bg-[var(--red-pale)] px-4 py-3 text-[10px] font-bold text-[var(--red-ink)]" role="alert">
              <span>{leadDataError}</span>
              <button className="shrink-0 cursor-pointer border-0 bg-transparent font-black text-[var(--red-ink)] underline" type="button" onClick={() => void Promise.all([loadLeadsFromSupabase(), loadManagersFromSupabase()])} disabled={leadsLoading || managersLoading || Boolean(pendingLeadId)}>Կրկին փորձել</button>
            </div>
          ) : null}
          {view === "dashboard" ? <DashboardPage vehicles={vehicles} leads={leads} managers={managers} now={now} leadsLoading={leadsLoading || managersLoading} onNavigate={navigate} onOpenLead={openLead} onNewVehicle={() => { if (!vehiclesLoading && !pendingVehicleId) setEditorVehicle(null); }} vehicleActionsDisabled={vehiclesLoading || Boolean(pendingVehicleId)} /> : null}
          {view === "requests" ? <RequestsPage leads={leads} managers={managers} now={now} loading={leadsLoading || managersLoading} onOpenLead={openLead} onExport={exportLeads} /> : null}
          {view === "vehicles" ? <VehiclesPage vehicles={vehicles} onEdit={setEditorVehicle} onNew={() => setEditorVehicle(null)} onChangeStatus={changeVehicleStatus} onToggleFeatured={toggleFeatured} onRefresh={() => void loadVehiclesFromSupabase()} pendingVehicleId={pendingVehicleId} refreshing={vehiclesLoading} /> : null}
        </main>
      </div>
      {editorVehicle !== undefined ? (
        <VehicleEditorDrawer
          key={editorVehicle?.id || "__new__"}
          vehicle={editorVehicle}
          onClose={() => {
            if (!pendingVehicleId && !editorBusy) setEditorVehicle(undefined);
          }}
          onSave={handleSaveVehicle}
          onArchive={handleArchiveVehicle}
          onBusyChange={setEditorBusy}
          busy={pendingVehicleId === (editorVehicle?.id || "__new__")}
        />
      ) : null}
      {selectedLead ? (
        <RequestDetailsDrawer
          lead={selectedLead}
          managers={managers}
          activities={activitiesByLeadId[selectedLead.id] || []}
          activitiesLoading={activitiesLoadingLeadId === selectedLead.id}
          activitiesError={activitiesError}
          currentAuthUserId={admin.id}
          now={now}
          onClose={() => {
            if (!pendingLeadId) {
              setSelectedLead(null);
              stopWatchingLeadActivities();
            }
          }}
          onWorkflowSave={(values) => handleLeadWorkflow(selectedLead, values)}
          onAddNote={(body) => addLeadNote(selectedLead.id, body)}
          onRetryActivities={() => void loadLeadActivities(selectedLead.id)}
          pending={pendingLeadId === selectedLead.id}
        />
      ) : null}
      <AdminToast message={toast} />
    </div>
  );
}
