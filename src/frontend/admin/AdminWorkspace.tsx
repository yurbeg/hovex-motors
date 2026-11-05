import { useCallback, useEffect, useState } from "react";
import type { Lead, LeadStatus } from "../../domain/lead";
import type { Vehicle } from "../../domain/vehicle";
import type { AuthorizedAdmin } from "./auth/authTypes";
import { AdminToast } from "./components/AdminToast";
import { useAdminNavigation } from "./hooks/useAdminNavigation";
import { useAdminVehicles } from "./hooks/useAdminVehicles";
import { useLocalLeads } from "./hooks/useLocalLeads";
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
  const { leads, updateLeadStatus } = useLocalLeads(notify);
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
    if (pendingVehicleId || editorBusy) return;
    setEditorVehicle(undefined);
    setSelectedLead(null);
  }, [editorBusy, pendingVehicleId]);
  const { view, navigate } = useAdminNavigation(closeOverlays);

  useEffect(() => {
    document.body.classList.add("bg-[#f5f2ec]", "text-[#11110f]");
    return () => {
      document.body.classList.remove("bg-[#f5f2ec]", "text-[#11110f]");
    };
  }, []);

  const handleSaveVehicle = async (vehicle: VehicleSavePayload) => {
    if (await saveVehicle(vehicle)) setEditorVehicle(undefined);
  };

  const handleArchiveVehicle = async (vehicle: Vehicle) => {
    if (await archiveVehicle(vehicle)) setEditorVehicle(undefined);
  };

  const handleLeadStatus = (lead: Lead, status: LeadStatus) => {
    if (updateLeadStatus(lead, status)) {
      setSelectedLead((current) => current?.id === lead.id ? { ...current, status } : current);
    }
  };

  const exportLeads = () => {
    downloadLeadsCsv(leads);
    notify("CSV ֆայլը պատրաստ է");
  };

  const requestSignOut = () => {
    void onSignOut().catch(() => notify("Դուրս գալը չհաջողվեց"));
  };

  const newLeadCount = leads.filter((lead) => lead.status === "new").length;
  const connectionLabel = vehiclesLoading
    ? "Supabase-ից բեռնվում է"
    : vehiclesError
      ? "Supabase կապի խնդիր"
      : "Supabase-ին միացված է";
  const connectionDot = vehiclesLoading
    ? "bg-[#dca900]"
    : vehiclesError
      ? "bg-[#c94b36]"
      : "bg-[#36ad55]";

  return (
    <div className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)] bg-[radial-gradient(circle_at_92%_0%,rgba(255,196,0,0.08),transparent_28%),#f5f2ec] text-[#11110f] max-[900px]:block">
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
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[#efc9c1] bg-[#fff4f1] px-4 py-3 text-[10px] font-bold text-[#9c3424]" role="alert">
              <span>{vehiclesError}</span>
              <button className="shrink-0 cursor-pointer border-0 bg-transparent font-black text-[#6e251a] underline" type="button" onClick={() => void loadVehiclesFromSupabase()} disabled={vehiclesLoading || Boolean(pendingVehicleId)}>Կրկին փորձել</button>
            </div>
          ) : null}
          {view === "dashboard" ? <DashboardPage vehicles={vehicles} leads={leads} onNavigate={navigate} onOpenLead={setSelectedLead} onNewVehicle={() => { if (!vehiclesLoading && !pendingVehicleId) setEditorVehicle(null); }} vehicleActionsDisabled={vehiclesLoading || Boolean(pendingVehicleId)} /> : null}
          {view === "requests" ? <RequestsPage leads={leads} onOpenLead={setSelectedLead} onExport={exportLeads} /> : null}
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
      {selectedLead ? <RequestDetailsDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} onStatusChange={handleLeadStatus} /> : null}
      <AdminToast message={toast} />
    </div>
  );
}
