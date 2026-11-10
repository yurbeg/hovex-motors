import {
  Car,
  ChatCircleText,
  Plus,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { isLeadOverdue, type Lead, type LeadManager } from "../../../domain/lead";
import type { Vehicle, VehicleInventoryStatus } from "../../../domain/vehicle";
import { AdminButton } from "../components/AdminButton";
import { DataModeNotice } from "../components/DataModeNotice";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { RequestTable } from "../leads/RequestTable";
import type { NavView } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import { formatLongDate } from "../shared/formatters";
import { vehicleInventoryStatus } from "../shared/statuses";
import {
  eyebrowClasses,
  pageHeadingButtonClasses,
  pageHeadingClasses,
  panelClasses,
  panelHeaderClasses,
} from "../shared/styles";

interface DashboardPageProps {
  vehicles: Vehicle[];
  leads: Lead[];
  managers: LeadManager[];
  now: number;
  leadsLoading: boolean;
  onNavigate: (view: NavView) => void;
  onOpenLead: (lead: Lead) => void;
  onNewVehicle: () => void;
  vehicleActionsDisabled: boolean;
}

export function DashboardPage({
  vehicles,
  leads,
  managers,
  now,
  leadsLoading,
  onNavigate,
  onOpenLead,
  onNewVehicle,
  vehicleActionsDisabled,
}: DashboardPageProps) {
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const overdueLeads = leads.filter((lead) => isLeadOverdue(lead, now)).length;
  const published = vehicles.filter((vehicle) => vehicle.status === "published").length;
  const featured = vehicles.filter((vehicle) => vehicle.featured && vehicle.status === "published").length;
  const available = vehicles.filter((vehicle) => vehicle.inventoryStatus === "available").length;
  const recent = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const statusCounts = (Object.keys(vehicleInventoryStatus) as VehicleInventoryStatus[]).map((status) => ({
    status,
    count: vehicles.filter((vehicle) => vehicle.inventoryStatus === status).length,
  }));

  return (
    <>
      <section className={pageHeadingClasses} data-scroll-reveal="up">
        <div className="min-w-0">
          <p className={eyebrowClasses}>Այսօրվա պատկերը</p>
          <h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.22] font-bold max-[700px]:text-2xl max-[430px]:text-[21px]">Բարի գալուստ Hovex Admin</h1>
          <span className="text-[13px] text-[var(--ink-soft)]">{formatLongDate(new Date())}</span>
        </div>
        <AdminButton className={pageHeadingButtonClasses} icon={Plus} onClick={onNewVehicle} disabled={vehicleActionsDisabled} aria-label="Ավելացնել մեքենա">Ավելացնել մեքենա</AdminButton>
      </section>
      <DataModeNotice scope="dashboard" />
      <section className="mb-[22px] grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[700px]:gap-2.5 max-[430px]:grid-cols-1" aria-label="Հիմնական ցուցանիշներ" data-scroll-stagger>
        <StatCard label="Նոր հարցումներ" value={leadsLoading ? "…" : newLeads} note={leadsLoading ? "Տվյալները բեռնվում են" : "Սպասում են առաջին կապին"} icon={ChatCircleText} tone="blue" />
        <StatCard label="Ակտիվ առաջարկներ" value={published} note={`${vehicles.length} ընդհանուր մեքենայից`} icon={Car} tone="yellow" />
        <StatCard label="Առկա մեքենաներ" value={available} note={`${featured} ընտրյալ առաջարկ`} icon={Star} tone="ink" />
        <StatCard label="Ուշացած հարցումներ" value={leadsLoading ? "…" : overdueLeads} note={leadsLoading ? "Տվյալները բեռնվում են" : overdueLeads ? "Պահանջում են անհապաղ գործողություն" : "Ուշացած գործողություն չկա"} icon={WarningCircle} tone="orange" />
      </section>
      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(280px,0.72fr)] items-start gap-5 max-[1180px]:grid-cols-1" data-scroll-stagger>
        <section className={panelClasses} data-scroll-reveal="left">
          <header className={panelHeaderClasses}>
            <div><p className={eyebrowClasses}>Վերջին ակտիվությունը</p><h2 className="mb-0 mt-1 text-lg leading-[1.2]">Վերջին հարցումները</h2></div>
            <button type="button" className="inline-flex cursor-pointer items-center gap-[7px] border-0 bg-transparent text-[11px] font-extrabold text-[var(--yellow-ink)] max-[430px]:text-[0px] [&>span]:text-[17px] max-[430px]:[&>span]:text-lg" onClick={() => onNavigate("requests")}>Դիտել բոլորը <span>→</span></button>
          </header>
          <RequestTable leads={recent} managers={managers} now={now} onSelect={onOpenLead} compact loading={leadsLoading} />
        </section>
        <aside className={classNames(panelClasses, "max-[1180px]:grid max-[1180px]:grid-cols-2 max-[700px]:block")} data-scroll-reveal="right">
          <header className={classNames(panelHeaderClasses, "max-[1180px]:col-span-full")}>
            <div><p className={eyebrowClasses}>Կայքի բովանդակություն</p><h2 className="mb-0 mt-1 text-lg leading-[1.2]">Մեքենաների տեղաբաշխում</h2></div>
          </header>
          <div className="grid px-5 pb-[19px] pt-[7px]">
            {statusCounts.map(({ status, count }) => {
              const percentage = vehicles.length ? Math.round((count / vehicles.length) * 100) : 0;
              return (
                <div className="border-b border-[var(--border)] py-3.5 last:border-b-0" key={status}>
                  <p className="mb-[9px] mt-0 flex items-center justify-between"><StatusBadge type="inventory" value={status} /><strong className="text-sm">{count}</strong></p>
                  <span className="block h-[5px] overflow-hidden rounded-full bg-[var(--surface-soft)]"><i className="block h-full rounded-[inherit] bg-[var(--yellow)]" style={{ width: `${percentage}%` }} /></span>
                </div>
              );
            })}
          </div>
          <button type="button" className="mx-5 mb-5 flex min-h-16 w-[calc(100%_-_40px)] cursor-pointer items-center gap-[11px] rounded-[11px] border border-[var(--border)] bg-[var(--surface-soft)] px-[13px] py-[11px] text-left max-[1180px]:mt-5 max-[1180px]:self-center [&>svg]:text-[var(--yellow-ink)]" onClick={() => onNavigate("vehicles")}>
            <Car size={20} weight="bold" /><span className="grid flex-1"><strong className="text-[10px]">Կառավարել առաջարկները</strong><small className="text-[8px] text-[var(--muted)]">Թարմացնել գտնվելու և հրապարակման վիճակը</small></span><span>→</span>
          </button>
        </aside>
      </div>
    </>
  );
}
