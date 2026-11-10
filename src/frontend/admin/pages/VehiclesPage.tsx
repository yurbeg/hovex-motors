import { useMemo, useState } from "react";
import {
  ArrowCounterClockwise,
  Car,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
} from "@phosphor-icons/react";
import type {
  Vehicle,
  VehicleInventoryStatus,
  VehicleStatus,
} from "../../../domain/vehicle";
import { AdminButton } from "../components/AdminButton";
import { DataModeNotice } from "../components/DataModeNotice";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import type { FilterStatus } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import { formatDate, formatMoney } from "../shared/formatters";
import { vehicleInventoryStatus, vehicleStatus } from "../shared/statuses";
import {
  eyebrowClasses,
  filterClasses,
  pageHeadingButtonClasses,
  pageHeadingClasses,
  panelClasses,
  rowActionClasses,
  searchClasses,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
  toolbarClasses,
} from "../shared/styles";

interface VehiclesPageProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onNew: () => void;
  onChangeStatus: (vehicle: Vehicle) => Promise<void>;
  onToggleFeatured: (vehicle: Vehicle) => Promise<void>;
  onRefresh: () => void;
  pendingVehicleId: string | null;
  refreshing: boolean;
}

export function VehiclesPage({
  vehicles,
  onEdit,
  onNew,
  onChangeStatus,
  onToggleFeatured,
  onRefresh,
  pendingVehicleId,
  refreshing,
}: VehiclesPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus<VehicleStatus>>("all");
  const [inventoryStatus, setInventoryStatus] = useState<FilterStatus<VehicleInventoryStatus>>("all");
  const mutationsLocked = Boolean(pendingVehicleId) || refreshing;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return vehicles
      .filter((vehicle) => status === "all" || vehicle.status === status)
      .filter((vehicle) => inventoryStatus === "all" || vehicle.inventoryStatus === inventoryStatus)
      .filter((vehicle) => !needle || [vehicle.make, vehicle.model, vehicle.year, vehicle.badge, vehicle.body]
        .some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)));
  }, [vehicles, query, status, inventoryStatus]);

  const availableCount = vehicles.filter((vehicle) => vehicle.inventoryStatus === "available").length;
  const inTransitCount = vehicles.filter((vehicle) => vehicle.inventoryStatus === "in_transit").length;
  const atAuctionCount = vehicles.filter((vehicle) => vehicle.inventoryStatus === "at_auction").length;

  return (
    <>
      <section className={pageHeadingClasses}>
        <div className="min-w-0"><p className={eyebrowClasses}>Հանրային առաջարկներ</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.15] tracking-[-0.035em] max-[700px]:text-2xl max-[430px]:text-[21px]">Մեքենաների կառավարում</h1><span className="text-[13px] text-[var(--ink-soft)]">{availableCount} առկա · {inTransitCount} ճանապարհին · {atAuctionCount} աճուրդում</span></div>
        <AdminButton className={pageHeadingButtonClasses} icon={Plus} onClick={onNew} disabled={mutationsLocked} aria-label="Ավելացնել մեքենա">Ավելացնել մեքենա</AdminButton>
      </section>
      <DataModeNotice scope="vehicles" />
      <section className={panelClasses}>
        <div className={toolbarClasses}>
          <label className={searchClasses}><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել մեքենա</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Մակնիշ, մոդել կամ տարեթիվ" /></label>
          <label className={filterClasses}><span>Տեսանելիություն</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus<VehicleStatus>)}><option value="all">Բոլորը</option>{Object.entries(vehicleStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <label className={filterClasses}><span>Գտնվելու վիճակ</span><select value={inventoryStatus} onChange={(event) => setInventoryStatus(event.target.value as FilterStatus<VehicleInventoryStatus>)}><option value="all">Բոլորը</option>{Object.entries(vehicleInventoryStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <button type="button" className="ml-auto inline-flex cursor-pointer items-center gap-[7px] border-0 bg-transparent text-[11px] font-extrabold text-[var(--ink-soft)] disabled:cursor-wait disabled:opacity-50 max-[700px]:mt-0.5 max-[700px]:ml-0 max-[700px]:w-full" onClick={onRefresh} disabled={refreshing || Boolean(pendingVehicleId)}>
            <ArrowCounterClockwise className={refreshing ? "animate-spin" : ""} size={17} weight="bold" /> {refreshing ? "Թարմացվում է…" : "Թարմացնել Supabase-ից"}
          </button>
        </div>
        {filtered.length ? (
          <div className="w-full overflow-x-auto">
            <table className={tableClasses}>
              <thead><tr><th className={tableHeadClasses}>Մեքենա</th><th className={tableHeadClasses}>Գտնվելու վիճակ</th><th className={tableHeadClasses}>Գնային միջակայք</th><th className={tableHeadClasses}>Տեսանելիություն</th><th className={tableHeadClasses}>Գլխավոր էջ</th><th className={tableHeadClasses}>Թարմացվել է</th><th className={tableHeadClasses}><span className="sr-only">Գործողություններ</span></th></tr></thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr className="transition-colors hover:bg-[var(--yellow-pale)] [&:last-child>td]:border-b-0" key={vehicle.id}>
                    <td className={tableCellClasses} data-label="Մեքենա">
                      <div className="flex min-w-[245px] items-center gap-[11px] text-left max-[700px]:min-w-0"><img className="h-12 w-16 shrink-0 rounded-lg bg-[var(--surface-soft)] object-cover" src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} /><span className="grid min-w-0"><small className="text-[8px] not-italic text-[var(--muted)]">{vehicle.year} · {vehicle.body}</small><strong className="my-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">{vehicle.make} {vehicle.model}</strong><em className="text-[8px] not-italic text-[var(--muted)]">{vehicle.badge}</em></span></div>
                    </td>
                    <td className={tableCellClasses} data-label="Գտնվելու վիճակ"><StatusBadge type="inventory" value={vehicle.inventoryStatus} /></td>
                    <td className={tableCellClasses} data-label="Գնային միջակայք"><strong>{formatMoney(vehicle.estimateMin)}–{formatMoney(vehicle.estimateMax).replace("$", "")}</strong><span>Max bid՝ {formatMoney(vehicle.maxBid)}</span></td>
                    <td className={tableCellClasses} data-label="Տեսանելիություն"><button type="button" className="flex cursor-pointer items-center gap-[7px] border-0 bg-transparent disabled:cursor-wait disabled:opacity-50 [&>svg]:text-[var(--muted)]" onClick={() => void onChangeStatus(vehicle)} disabled={mutationsLocked} aria-label={`${vehicle.make} ${vehicle.model} հրապարակման վիճակը փոխել`}><StatusBadge type="vehicle" value={vehicle.status} />{vehicle.status === "published" ? <EyeSlash size={17} /> : <Eye size={17} />}</button></td>
                    <td className={tableCellClasses} data-label="Գլխավոր էջ"><button type="button" className={classNames("flex min-h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] border border-[var(--border)] bg-transparent px-[9px] text-[9px] font-bold text-[var(--muted)] disabled:cursor-wait disabled:opacity-50", vehicle.featured && "border-[var(--yellow-border)] bg-[var(--yellow-pale)] text-[var(--yellow-ink)]")} onClick={() => void onToggleFeatured(vehicle)} disabled={mutationsLocked} aria-pressed={vehicle.featured}><Star size={19} weight={vehicle.featured ? "fill" : "regular"} /><span>{vehicle.featured ? "Ընտրյալ" : "Սովորական"}</span></button></td>
                    <td className={tableCellClasses} data-label="Թարմացվել է"><span>{formatDate(vehicle.updatedAt)}</span></td>
                    <td className={classNames(tableCellClasses, "max-[700px]:min-h-0 max-[700px]:p-0")}><button type="button" className={classNames(rowActionClasses, "disabled:cursor-wait disabled:opacity-50")} onClick={() => onEdit(vehicle)} disabled={mutationsLocked} aria-label={`${vehicle.make} ${vehicle.model}-ը խմբագրել`}><PencilSimple size={19} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={Car} title="Մեքենա չգտնվեց" text="Փոխեք որոնման բառը կամ ֆիլտրերը։" action={<AdminButton icon={Plus} onClick={onNew} disabled={mutationsLocked}>Ավելացնել մեքենա</AdminButton>} />}
      </section>
    </>
  );
}
