import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  FormEvent,
  MouseEvent,
  ReactNode,
} from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  Archive,
  ArrowCounterClockwise,
  ArrowSquareOut,
  Car,
  ChatCircleText,
  Check,
  CheckCircle,
  Clock,
  Database,
  DownloadSimple,
  Eye,
  EyeSlash,
  FloppyDisk,
  ImageSquare,
  MagnifyingGlass,
  PencilSimple,
  Phone,
  Plus,
  SealCheck,
  SquaresFour,
  Star,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import {
  getLeads,
  getVehicles,
  resetVehicles,
  saveLeads,
  saveVehicles,
  subscribeLeads,
  subscribeVehicles,
} from "./adminStore";
import type {
  Lead,
  LeadStatus,
  Vehicle,
  VehicleStatus,
} from "./adminStore";

type NavView = "dashboard" | "requests" | "vehicles";
type StatusTone = "blue" | "yellow" | "green" | "gray" | "orange";
type StatTone = "ink" | "blue" | "yellow" | "orange";
type FilterStatus<T extends string> = T | "all";

interface StatusConfig {
  label: string;
  tone: StatusTone;
}

interface NavItem {
  id: NavView;
  label: string;
  path: string;
  icon: Icon;
}

const buttonBaseClasses = "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-transparent px-[18px] font-extrabold leading-[1.15] transition duration-150 hover:-translate-y-px";
const buttonVariantClasses: Record<NonNullable<AdminButtonProps["variant"]>, string> = {
  primary: "bg-[#ffc400] text-[#11110f] shadow-[0_8px_20px_rgba(255,196,0,0.18)] hover:bg-[#eaae00]",
  secondary: "bg-[#11110f] text-white",
  ghost: "border-[#d9d4cb] bg-white text-[#11110f]",
  danger: "border-[#f0cbc2] bg-[#fff5f2] text-[#a53624]",
};

const statusToneClasses: Record<StatusTone, string> = {
  green: "bg-[#e8f6eb] text-[#24733a]",
  blue: "bg-[#e7f2fb] text-[#216d9f]",
  yellow: "bg-[#fff3c7] text-[#846500]",
  orange: "bg-[#fff0df] text-[#ad5c14]",
  gray: "bg-[#efede9] text-[#6d6963]",
};

const statToneClasses: Record<StatTone, string> = {
  yellow: "bg-[#fff1bb] text-[#8b6900]",
  blue: "bg-[#e7f2fb] text-[#226d9e]",
  orange: "bg-[#fff0df] text-[#b96112]",
  ink: "bg-[#eceae5] text-[#11110f]",
};

const pageHeadingClasses = "mb-[25px] flex items-end justify-between gap-6 max-[700px]:items-start max-[430px]:gap-2.5";
const pageHeadingButtonClasses = "max-[700px]:min-w-[46px] max-[700px]:px-[13px] max-[700px]:[&>span]:hidden";
const eyebrowClasses = "m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6b00]";
const panelClasses = "min-w-0 overflow-hidden rounded-[17px] border border-[#e0dcd4] bg-white shadow-[0_10px_32px_rgba(26,24,19,0.045)]";
const panelHeaderClasses = "flex min-h-[76px] items-center justify-between gap-[15px] border-b border-[#eeeae3] px-5 py-[17px] max-[430px]:px-[15px]";
const toolbarClasses = "flex min-h-[72px] items-center gap-3 border-b border-[#eeeae3] bg-[#fdfcf9] px-4 py-[13px] max-[700px]:flex-wrap max-[700px]:items-stretch";
const searchClasses = "flex min-h-[43px] w-[min(400px,44%)] items-center gap-[9px] rounded-[10px] border border-[#dad6ce] bg-white px-[13px] text-[#7b766f] focus-within:border-[#856b0c] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.14)] max-[700px]:w-full [&>input]:w-full [&>input]:border-0 [&>input]:bg-transparent [&>input]:text-[11px] [&>input]:outline-none";
const filterClasses = "flex min-h-[43px] items-center gap-2 rounded-[10px] border border-[#dad6ce] bg-white py-0 pl-[13px] pr-2.5 focus-within:border-[#856b0c] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.14)] max-[700px]:flex-1 [&>span]:text-[9px] [&>span]:font-bold [&>span]:text-[#8b867e] [&>select]:border-0 [&>select]:bg-transparent [&>select]:text-[10px] [&>select]:font-extrabold [&>select]:text-[#26241f] [&>select]:outline-none";
const tableClasses = "w-full border-collapse text-left max-[700px]:block max-[700px]:[&_tbody]:block max-[700px]:[&_thead]:hidden max-[700px]:[&_tr]:block max-[700px]:[&_tr]:w-full max-[700px]:[&_tbody_tr]:border-b max-[700px]:[&_tbody_tr]:border-[#e7e2da] max-[700px]:[&_tbody_tr]:px-3.5 max-[700px]:[&_tbody_tr]:py-3";
const tableHeadClasses = "h-[43px] whitespace-nowrap border-b border-[#eeeae3] bg-[#fbfaf8] px-4 py-0 text-[9px] font-black uppercase tracking-[0.045em] text-[#8b867e]";
const tableCellClasses = "h-[72px] min-w-28 border-b border-[#f0ede8] px-4 py-[11px] align-middle text-[11px] [&>strong]:mb-1 [&>strong]:block [&>strong]:text-[11px] [&>strong]:leading-[1.3] [&>span]:block [&>span]:max-w-[220px] [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[9px] [&>span]:leading-[1.35] [&>span]:text-[#817c74] max-[700px]:grid max-[700px]:h-auto max-[700px]:min-h-[35px] max-[700px]:w-full max-[700px]:min-w-0 max-[700px]:grid-cols-[110px_1fr] max-[700px]:items-center max-[700px]:border-0 max-[700px]:px-0 max-[700px]:py-[7px] max-[700px]:text-right max-[700px]:before:text-left max-[700px]:before:text-[8px] max-[700px]:before:font-extrabold max-[700px]:before:text-[#8c877f] max-[700px]:before:content-[attr(data-label)] max-[700px]:[&>*]:col-start-2 max-[700px]:[&>*]:justify-self-end max-[700px]:[&>span]:max-w-[210px]";
const rowActionClasses = "grid size-9 cursor-pointer place-items-center rounded-[9px] border border-[#ddd8d0] bg-white text-[#3d3a35] hover:border-[#b99b33] hover:bg-[#fffbec] max-[700px]:mt-[-37px]";
const formControlClasses = "h-[43px] w-full rounded-[9px] border border-[#d8d4cc] bg-white px-[11px] text-[10px] text-[#26241f] outline-none focus:border-[#806600] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]";
const formLabelClasses = "grid gap-1.5 [&>span]:text-[9px] [&>span]:font-extrabold [&>span]:text-[#5f5b55] [&>small]:text-[8px] [&>small]:text-[#aa3825]";
const formFieldsetClasses = "m-0 border-0 border-t border-[#e7e2d9] bg-white p-5 [&>legend]:mb-[15px] [&>legend]:w-full [&>legend]:p-0 [&>legend]:text-[13px] [&>legend]:font-black";
const detailSectionClasses = "rounded-[13px] border border-[#e0dcd4] bg-white p-4";
const detailListClasses = "m-0 grid [&>div]:grid [&>div]:min-h-[38px] [&>div]:grid-cols-[125px_1fr] [&>div]:items-center [&>div]:border-b [&>div]:border-[#eeeae3] [&>div:last-child]:border-b-0 [&_dt]:text-[9px] [&_dt]:text-[#817c74] [&_dd]:m-0 [&_dd]:text-right [&_dd]:text-[10px] [&_dd]:font-bold max-[430px]:[&>div]:grid-cols-1 max-[430px]:[&>div]:gap-0.5 max-[430px]:[&>div]:py-[7px] max-[430px]:[&_dd]:text-left";

const vehicleStatus: Record<VehicleStatus, StatusConfig> = {
  published: { label: "Հրապարակված", tone: "green" },
  draft: { label: "Սևագիր", tone: "gray" },
  archived: { label: "Արխիվացված", tone: "orange" },
};

const leadStatus: Record<LeadStatus, StatusConfig> = {
  new: { label: "Նոր", tone: "blue" },
  contacted: { label: "Կապ հաստատված", tone: "yellow" },
  booked: { label: "Ամրագրված", tone: "green" },
  closed: { label: "Փակված", tone: "gray" },
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Գլխավոր", path: "/admin", icon: SquaresFour },
  { id: "requests", label: "Հարցումներ", path: "/admin/requests", icon: ChatCircleText },
  { id: "vehicles", label: "Մեքենաներ", path: "/admin/vehicles", icon: Car },
];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const armenianWeekdays = ["Կիրակի", "Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ"];
const armenianMonths = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
const armenianMonthsShort = ["հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"];

function formatMoney(value: string | number): string {
  return moneyFormatter.format(Number(value) || 0);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${armenianMonthsShort[date.getMonth()]} · ${hours}:${minutes}`;
}

function formatLongDate(date: Date): string {
  return `${armenianWeekdays[date.getDay()]}, ${armenianMonths[date.getMonth()]} ${date.getDate()}`;
}

function routeFromPath(): NavView {
  const segment = window.location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return navItems.some((item) => item.id === segment) ? segment as NavView : "dashboard";
}

function safePhone(value = ""): string {
  return value.replace(/[^+\d]/g, "");
}

function classNames(...items: Array<string | false | null | undefined>): string {
  return items.filter(Boolean).join(" ");
}

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: Icon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

function AdminButton({ children, icon: IconComponent, variant = "primary", className = "", ...props }: AdminButtonProps) {
  return (
    <button className={classNames(buttonBaseClasses, buttonVariantClasses[variant], className)} {...props}>
      {IconComponent ? <IconComponent size={19} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

type StatusBadgeProps =
  | { type: "lead"; value: LeadStatus }
  | { type: "vehicle"; value: VehicleStatus };

function StatusBadge(props: StatusBadgeProps) {
  const { type, value } = props;
  const config: StatusConfig | undefined = type === "lead" ? leadStatus[value] : vehicleStatus[value];
  const fallback = { label: value || "—", tone: "gray" };
  const resolved = config || fallback;
  return <span className={classNames("inline-flex min-h-[25px] w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] text-[9px] font-extrabold", statusToneClasses[resolved.tone])}><i className="size-1.5 rounded-full bg-current" />{resolved.label}</span>;
}

interface EmptyStateProps {
  icon: Icon;
  title: string;
  text: string;
  action?: ReactNode;
}

function EmptyState({ icon: IconComponent, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-[50px] text-center">
      <span className="grid size-[58px] place-items-center rounded-2xl bg-[#f3f0ea] text-[#716d66]"><IconComponent size={28} weight="bold" /></span>
      <h3 className="mb-[5px] mt-4 text-base">{title}</h3>
      <p className="mb-[18px] mt-0 max-w-[360px] text-[11px] text-[#837e76]">{text}</p>
      {action}
    </div>
  );
}

interface AdminDrawerProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

function AdminDrawer({ title, eyebrow, onClose, children, wide = false }: AdminDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    document.body.classList.add("overflow-hidden");
    const drawer = drawerRef.current;
    window.requestAnimationFrame(() => drawer?.querySelector<HTMLElement>("button, input, select, textarea")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overflow-hidden");
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-[rgba(16,15,13,0.56)] backdrop-blur-[3px] [animation:admin-fade-in_160ms_ease_both]" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <aside ref={drawerRef} className={classNames("flex h-full flex-col bg-white shadow-[-24px_0_70px_rgba(17,17,15,0.22)] [animation:admin-slide-in_220ms_ease_both] max-[700px]:w-full", wide ? "w-[min(720px,100%)]" : "w-[min(470px,100%)]")} role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title">
        <header className="flex min-h-[82px] items-center justify-between gap-4 border-b border-[#e5e1da] bg-white px-[22px] py-[17px]">
          <div>{eyebrow ? <p className="mb-[3px] mt-0 text-[9px] font-black uppercase tracking-[0.1em] text-[#8b6b00]">{eyebrow}</p> : null}<h2 className="m-0 text-[21px] leading-[1.2]" id="admin-drawer-title">{title}</h2></div>
          <button className="grid size-10 cursor-pointer place-items-center rounded-[10px] border border-[#dedad2] bg-white" type="button" onClick={onClose} aria-label="Փակել"><X size={22} weight="bold" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f6f1]">{children}</div>
      </aside>
    </div>
  );
}

function LocalModeNotice() {
  return (
    <div className="mb-[22px] flex items-center gap-[11px] rounded-xl border border-[#dfd6bd] bg-[#fffaf0] px-4 py-[13px] text-[#7e6200] max-[700px]:items-start">
      <Database size={20} weight="fill" aria-hidden="true" />
      <p className="m-0 flex flex-wrap gap-x-[9px] gap-y-[5px] text-[11px] max-[700px]:grid"><strong>Ցուցադրական կառավարման վահանակ</strong><span className="text-[#777067]">Փոփոխությունները պահվում են միայն այս դիտարկիչում և տեսանելի են նույն սարքի հանրային կայքում։</span></p>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  note: string;
  icon: Icon;
  tone?: StatTone;
}

function StatCard({ label, value, note, icon: IconComponent, tone = "ink" }: StatCardProps) {
  return (
    <article className="grid min-w-0 grid-cols-[auto_1fr] rounded-2xl border border-[#e0dcd4] bg-white p-5 shadow-[0_8px_28px_rgba(26,24,19,0.04)] [column-gap:13px] max-[700px]:block max-[700px]:p-3.5 max-[430px]:grid">
      <div className={classNames("row-span-3 grid size-11 place-items-center rounded-xl max-[700px]:mb-[13px] max-[700px]:size-[38px] max-[430px]:m-0", statToneClasses[tone])}><IconComponent size={23} weight="bold" /></div>
      <p className="mb-[3px] mt-0 text-[11px] font-bold text-[#77726b]">{label}</p>
      <strong className="text-[26px] leading-[1.05] max-[700px]:block max-[700px]:text-[22px]">{value}</strong>
      <small className="mt-1 text-[9px] text-[#99938a]">{note}</small>
    </article>
  );
}

interface RequestTableProps {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  compact?: boolean;
}

function RequestTable({ leads, onSelect, compact = false }: RequestTableProps) {
  if (!leads.length) {
    return <EmptyState icon={ChatCircleText} title="Հարցումներ չկան" text="Նոր հարցումները կհայտնվեն այստեղ։" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className={tableClasses}>
        <thead><tr><th className={classNames(tableHeadClasses, compact && "hidden")}>Հաճախորդ</th><th className={classNames(tableHeadClasses, compact && "hidden")}>Հետաքրքրություն</th><th className={classNames(tableHeadClasses, compact && "hidden")}>Նախընտրելի կապ</th><th className={classNames(tableHeadClasses, compact && "hidden")}>Ստացվել է</th><th className={classNames(tableHeadClasses, compact && "hidden")}>Կարգավիճակ</th><th className={classNames(tableHeadClasses, compact && "hidden")}><span className="sr-only">Բացել</span></th></tr></thead>
        <tbody>
          {leads.map((lead) => (
            <tr className="cursor-pointer transition-colors hover:bg-[#fffdf7] [&:last-child>td]:border-b-0" key={lead.id} onClick={() => onSelect(lead)}>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5", "[&>strong]:text-xs")} data-label="Հաճախորդ"><strong>{lead.name}</strong><span>{lead.phone}</span></td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5")} data-label="Հետաքրքրություն"><strong>{lead.vehicleLabel || "Անհատական ընտրություն"}</strong><span>{lead.note || "Մեկնաբանություն չկա"}</span></td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Նախընտրելի կապ"><strong>{lead.method}</strong><span>{lead.date ? `${lead.date} · ${lead.time || ""}` : lead.time || "Ճկուն ժամ"}</span></td>
              <td className={classNames(tableCellClasses, compact && "hidden h-[69px] py-2.5 max-[700px]:grid")} data-label="Ստացվել է"><span>{formatDate(lead.createdAt)}</span>{lead.source === "ai-assistant" ? <small className="mt-1 block w-fit rounded bg-[#fff0a9] px-[5px] py-0.5 text-[7px] font-black tracking-[0.08em] text-[#775c00]">AI</small> : null}{lead.demo ? <small className="mt-1 block w-fit rounded bg-[#f0ede7] px-[5px] py-0.5 text-[7px] font-black tracking-[0.08em] text-[#858078]">ԴԵՄՈ</small> : null}</td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5")} data-label="Կարգավիճակ"><StatusBadge type="lead" value={lead.status} /></td>
              <td className={classNames(tableCellClasses, compact && "h-[69px] py-2.5", "max-[700px]:min-h-0 max-[700px]:p-0")}><button type="button" className={rowActionClasses} onClick={(event) => { event.stopPropagation(); onSelect(lead); }} aria-label={`${lead.name} հարցումը բացել`}><Eye size={19} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DashboardProps {
  vehicles: Vehicle[];
  leads: Lead[];
  onNavigate: (view: NavView) => void;
  onOpenLead: (lead: Lead) => void;
  onNewVehicle: () => void;
}

function Dashboard({ vehicles, leads, onNavigate, onOpenLead, onNewVehicle }: DashboardProps) {
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const waitingLeads = leads.filter((lead) => ["new", "contacted"].includes(lead.status)).length;
  const published = vehicles.filter((vehicle) => vehicle.status === "published").length;
  const featured = vehicles.filter((vehicle) => vehicle.featured && vehicle.status === "published").length;
  const recent = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const statusCounts = (Object.keys(vehicleStatus) as VehicleStatus[]).map((status) => ({
    status,
    count: vehicles.filter((vehicle) => vehicle.status === status).length,
  }));

  return (
    <>
      <section className={pageHeadingClasses}>
        <div className="min-w-0"><p className={eyebrowClasses}>Այսօրվա պատկերը</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.15] tracking-[-0.035em] max-[700px]:text-2xl max-[430px]:text-[21px]">Բարի գալուստ Hovex Admin</h1><span className="text-[13px] text-[#77726b]">{formatLongDate(new Date())}</span></div>
        <AdminButton className={pageHeadingButtonClasses} icon={Plus} onClick={onNewVehicle}>Ավելացնել մեքենա</AdminButton>
      </section>
      <LocalModeNotice />
      <section className="mb-[22px] grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[700px]:gap-2.5 max-[430px]:grid-cols-1" aria-label="Հիմնական ցուցանիշներ">
        <StatCard label="Նոր հարցումներ" value={newLeads} note="Սպասում են առաջին կապին" icon={ChatCircleText} tone="blue" />
        <StatCard label="Ակտիվ առաջարկներ" value={published} note={`${vehicles.length} ընդհանուր մեքենայից`} icon={Car} tone="yellow" />
        <StatCard label="Ընտրյալ առաջարկներ" value={featured} note="Ցուցադրվում են գլխավոր էջում" icon={Star} tone="ink" />
        <StatCard label="Կապի հերթում" value={waitingLeads} note="Նոր կամ ընթացքի մեջ" icon={Clock} tone="orange" />
      </section>
      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(280px,0.72fr)] items-start gap-5 max-[1180px]:grid-cols-1">
        <section className={panelClasses}>
          <header className={panelHeaderClasses}><div><p className={eyebrowClasses}>Վերջին ակտիվությունը</p><h2 className="mb-0 mt-1 text-lg leading-[1.2]">Վերջին հարցումները</h2></div><button type="button" className="inline-flex cursor-pointer items-center gap-[7px] border-0 bg-transparent text-[11px] font-extrabold text-[#6c5600] max-[430px]:text-[0px] [&>span]:text-[17px] max-[430px]:[&>span]:text-lg" onClick={() => onNavigate("requests")}>Դիտել բոլորը <span>→</span></button></header>
          <RequestTable leads={recent} onSelect={onOpenLead} compact />
        </section>
        <aside className={classNames(panelClasses, "max-[1180px]:grid max-[1180px]:grid-cols-2 max-[700px]:block")}>
          <header className={classNames(panelHeaderClasses, "max-[1180px]:col-span-full")}><div><p className={eyebrowClasses}>Կայքի բովանդակություն</p><h2 className="mb-0 mt-1 text-lg leading-[1.2]">Մեքենաների վիճակ</h2></div></header>
          <div className="grid px-5 pb-[19px] pt-[7px]">
            {statusCounts.map(({ status, count }) => {
              const percentage = vehicles.length ? Math.round((count / vehicles.length) * 100) : 0;
              return <div className="border-b border-[#eeeae3] py-3.5 last:border-b-0" key={status}><p className="mb-[9px] mt-0 flex items-center justify-between"><StatusBadge type="vehicle" value={status} /><strong className="text-sm">{count}</strong></p><span className="block h-[5px] overflow-hidden rounded-full bg-[#efede8]"><i className="block h-full rounded-[inherit] bg-[#ffc400]" style={{ width: `${percentage}%` }} /></span></div>;
            })}
          </div>
          <button type="button" className="mx-5 mb-5 flex min-h-16 w-[calc(100%_-_40px)] cursor-pointer items-center gap-[11px] rounded-[11px] border border-[#e2ddd5] bg-[#f8f6f1] px-[13px] py-[11px] text-left max-[1180px]:mt-5 max-[1180px]:self-center [&>svg]:text-[#806300]" onClick={() => onNavigate("vehicles")}><Car size={20} weight="bold" /><span className="grid flex-1"><strong className="text-[10px]">Կառավարել առաջարկները</strong><small className="text-[8px] text-[#88837c]">Թարմացնել գները և հրապարակման վիճակը</small></span><span>→</span></button>
        </aside>
      </div>
    </>
  );
}

interface RequestsPageProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onExport: () => void;
}

function RequestsPage({ leads, onOpenLead, onExport }: RequestsPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus<LeadStatus>>("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return [...leads]
      .filter((lead) => status === "all" || lead.status === status)
      .filter((lead) => !needle || [lead.name, lead.phone, lead.vehicleLabel, lead.note, lead.method].some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, query, status]);

  return (
    <>
      <section className={pageHeadingClasses}><div className="min-w-0"><p className={eyebrowClasses}>Հաճախորդների հոսք</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.15] tracking-[-0.035em] max-[700px]:text-2xl max-[430px]:text-[21px]">Խորհրդատվության հարցումներ</h1><span className="text-[13px] text-[#77726b]">{leads.length} ընդհանուր · {leads.filter((lead) => lead.status === "new").length} նոր</span></div><AdminButton className={pageHeadingButtonClasses} icon={DownloadSimple} variant="secondary" onClick={onExport}>Ներբեռնել CSV</AdminButton></section>
      <LocalModeNotice />
      <section className={panelClasses}>
        <div className={toolbarClasses}>
          <label className={searchClasses}><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել հարցում</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Անուն, հեռախոս կամ մեքենա" /></label>
          <label className={filterClasses}><span>Կարգավիճակ</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus<LeadStatus>)}><option value="all">Բոլորը</option>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <span className="ml-auto text-[10px] text-[#817c74] max-[700px]:self-center">Ցուցադրվում է {filtered.length}</span>
        </div>
        <RequestTable leads={filtered} onSelect={onOpenLead} />
      </section>
    </>
  );
}

interface VehiclesPageProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onNew: () => void;
  onChangeStatus: (vehicle: Vehicle) => void;
  onToggleFeatured: (vehicle: Vehicle) => void;
  onReset: () => void;
}

function VehiclesPage({ vehicles, onEdit, onNew, onChangeStatus, onToggleFeatured, onReset }: VehiclesPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus<VehicleStatus>>("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return vehicles
      .filter((vehicle) => status === "all" || vehicle.status === status)
      .filter((vehicle) => !needle || [vehicle.make, vehicle.model, vehicle.year, vehicle.badge, vehicle.body].some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)));
  }, [vehicles, query, status]);

  return (
    <>
      <section className={pageHeadingClasses}><div className="min-w-0"><p className={eyebrowClasses}>Հանրային առաջարկներ</p><h1 className="mb-[7px] mt-1 text-[clamp(27px,2.4vw,36px)] leading-[1.15] tracking-[-0.035em] max-[700px]:text-2xl max-[430px]:text-[21px]">Մեքենաների կառավարում</h1><span className="text-[13px] text-[#77726b]">{vehicles.filter((vehicle) => vehicle.status === "published").length} հրապարակված · {vehicles.filter((vehicle) => vehicle.status === "draft").length} սևագիր</span></div><AdminButton className={pageHeadingButtonClasses} icon={Plus} onClick={onNew}>Ավելացնել մեքենա</AdminButton></section>
      <LocalModeNotice />
      <section className={panelClasses}>
        <div className={toolbarClasses}>
          <label className={searchClasses}><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել մեքենա</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Մակնիշ, մոդել կամ տարեթիվ" /></label>
          <label className={filterClasses}><span>Տեսանելիություն</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus<VehicleStatus>)}><option value="all">Բոլորը</option>{Object.entries(vehicleStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <button type="button" className="ml-auto inline-flex cursor-pointer items-center gap-[7px] border-0 bg-transparent text-[11px] font-extrabold text-[#756e65] max-[700px]:mt-0.5 max-[700px]:w-full max-[700px]:ml-0" onClick={onReset}><ArrowCounterClockwise size={17} weight="bold" /> Վերականգնել demo տվյալները</button>
        </div>
        {filtered.length ? (
          <div className="w-full overflow-x-auto">
            <table className={tableClasses}>
              <thead><tr><th className={tableHeadClasses}>Մեքենա</th><th className={tableHeadClasses}>Գնային միջակայք</th><th className={tableHeadClasses}>Կարգավիճակ</th><th className={tableHeadClasses}>Գլխավոր էջ</th><th className={tableHeadClasses}>Թարմացվել է</th><th className={tableHeadClasses}><span className="sr-only">Գործողություններ</span></th></tr></thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr className="transition-colors hover:bg-[#fffdf7] [&:last-child>td]:border-b-0" key={vehicle.id}>
                    <td className={tableCellClasses} data-label="Մեքենա"><div className="flex min-w-[245px] items-center gap-[11px] text-left max-[700px]:min-w-0"><img className="h-12 w-16 shrink-0 rounded-lg bg-[#eeeae3] object-cover" src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} /><span className="grid min-w-0"><small className="text-[8px] not-italic text-[#817c74]">{vehicle.year} · {vehicle.body}</small><strong className="my-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">{vehicle.make} {vehicle.model}</strong><em className="text-[8px] not-italic text-[#817c74]">{vehicle.badge}</em></span></div></td>
                    <td className={tableCellClasses} data-label="Գնային միջակայք"><strong>{formatMoney(vehicle.estimateMin)}–{formatMoney(vehicle.estimateMax).replace("$", "")}</strong><span>Max bid՝ {formatMoney(vehicle.maxBid)}</span></td>
                    <td className={tableCellClasses} data-label="Կարգավիճակ"><button type="button" className="flex cursor-pointer items-center gap-[7px] border-0 bg-transparent [&>svg]:text-[#9a958c]" onClick={() => onChangeStatus(vehicle)} aria-label={`${vehicle.make} ${vehicle.model} հրապարակման վիճակը փոխել`}><StatusBadge type="vehicle" value={vehicle.status} />{vehicle.status === "published" ? <EyeSlash size={17} /> : <Eye size={17} />}</button></td>
                    <td className={tableCellClasses} data-label="Գլխավոր էջ"><button type="button" className={classNames("flex min-h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] border border-[#e0dcd4] bg-transparent px-[9px] text-[9px] font-bold text-[#817c74]", vehicle.featured && "border-[#e2c35d] bg-[#fff8da] text-[#7e6200]")} onClick={() => onToggleFeatured(vehicle)} aria-pressed={vehicle.featured}><Star size={19} weight={vehicle.featured ? "fill" : "regular"} /><span>{vehicle.featured ? "Ընտրյալ" : "Սովորական"}</span></button></td>
                    <td className={tableCellClasses} data-label="Թարմացվել է"><span>{formatDate(vehicle.updatedAt)}</span></td>
                    <td className={classNames(tableCellClasses, "max-[700px]:min-h-0 max-[700px]:p-0")}><button type="button" className={rowActionClasses} onClick={() => onEdit(vehicle)} aria-label={`${vehicle.make} ${vehicle.model}-ը խմբագրել`}><PencilSimple size={19} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={Car} title="Մեքենա չգտնվեց" text="Փոխեք որոնման բառը կամ կարգավիճակի ֆիլտրը։" action={<AdminButton icon={Plus} onClick={onNew}>Ավելացնել մեքենա</AdminButton>} />}
      </section>
    </>
  );
}

interface VehicleEditorForm {
  id?: string;
  make: string;
  model: string;
  year: number | string;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: number | string;
  estimateMax: number | string;
  maxBid: number | string;
  image: string;
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  featured: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

type VehicleSavePayload = Omit<VehicleEditorForm, "year" | "estimateMin" | "estimateMax" | "maxBid"> & {
  year: number;
  estimateMin: number;
  estimateMax: number;
  maxBid: number;
};

const emptyVehicle: VehicleEditorForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  body: "Սեդան",
  mileage: "",
  fuel: "Բենզին",
  damage: "",
  auction: "ԱՄՆ աճուրդ • ցուցադրական",
  estimateMin: "",
  estimateMax: "",
  maxBid: "",
  image: "/assets/hovex/kia-forte-lxs.jpg",
  imagePosition: "50% 50%",
  badge: "Նոր առաջարկ",
  accent: "yellow",
  status: "draft",
  featured: false,
};

interface VehicleEditorProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: VehicleSavePayload) => void;
  onArchive: (vehicle: Vehicle) => void;
}

function VehicleEditor({ vehicle, onClose, onSave, onArchive }: VehicleEditorProps) {
  const isNew = !vehicle?.id;
  const [form, setForm] = useState<VehicleEditorForm>(() => ({ ...emptyVehicle, ...(vehicle ?? {}) }));
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleEditorForm, string>>>({});
  const update = (key: keyof VehicleEditorForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof VehicleEditorForm, string>> = {};
    if (!form.make.trim()) nextErrors.make = "Նշեք մակնիշը";
    if (!form.model.trim()) nextErrors.model = "Նշեք մոդելը";
    if (Number(form.year) < 1990 || Number(form.year) > new Date().getFullYear() + 2) nextErrors.year = "Ստուգեք տարեթիվը";
    if (!(Number(form.estimateMin) > 0)) nextErrors.estimateMin = "Նշեք նվազագույն արժեքը";
    if (!(Number(form.estimateMax) >= Number(form.estimateMin))) nextErrors.estimateMax = "Առավելագույնը պետք է մեծ կամ հավասար լինի";
    if (!(Number(form.maxBid) > 0)) nextErrors.maxBid = "Նշեք առավելագույն խաղադրույքը";
    if (!/^(https?:\/\/|\/)/i.test(form.image.trim())) nextErrors.image = "Օգտագործեք /assets/... կամ https:// հասցե";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({
      ...form,
      year: Number(form.year),
      estimateMin: Number(form.estimateMin),
      estimateMax: Number(form.estimateMax),
      maxBid: Number(form.maxBid),
    });
  };

  return (
    <AdminDrawer title={isNew ? "Ավելացնել մեքենա" : `${vehicle?.make} ${vehicle?.model}`} eyebrow={isNew ? "Նոր առաջարկ" : "Խմբագրել առաջարկը"} onClose={onClose} wide>
      <form className="flex min-h-full flex-col" onSubmit={submit} noValidate>
        <div className="m-5 grid grid-cols-[180px_1fr] gap-[17px] rounded-[14px] border border-[#ddd8ce] bg-white p-3.5 max-[700px]:grid-cols-[128px_1fr] max-[430px]:grid-cols-1">
          <div className="relative h-[126px] overflow-hidden rounded-[10px] bg-[#ece8e0] max-[700px]:h-[104px] max-[430px]:h-[150px]"><img className="size-full object-cover" src={form.image} alt="" style={{ objectPosition: form.imagePosition }} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} onLoad={(event) => { event.currentTarget.style.visibility = "visible"; }} /><span className="absolute bottom-2 left-2 max-w-[calc(100%_-_16px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[#ffc400] px-[7px] py-1 text-[7px] font-black">{form.badge || "Պիտակ"}</span></div>
          <div className="self-center"><p className="m-0 text-[9px] text-[#817c74]">{form.year || "Տարեթիվ"} · {form.body || "Թափք"}</p><h3 className="mb-3.5 mt-[5px] text-lg">{form.make || "Մակնիշ"} {form.model || "Մոդել"}</h3><strong className="text-base">{formatMoney(form.estimateMin)}–{formatMoney(form.estimateMax).replace("$", "")}</strong></div>
        </div>
        <fieldset className={formFieldsetClasses}><legend>Հիմնական տվյալներ</legend><div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
          <label className={formLabelClasses}><span>Մակնիշ *</span><input className={classNames(formControlClasses, errors.make && "border-[#c95540]")} autoFocus value={form.make} onChange={update("make")} placeholder="Kia" />{errors.make ? <small>{errors.make}</small> : null}</label>
          <label className={formLabelClasses}><span>Մոդել *</span><input className={classNames(formControlClasses, errors.model && "border-[#c95540]")} value={form.model} onChange={update("model")} placeholder="Forte LXS" />{errors.model ? <small>{errors.model}</small> : null}</label>
          <label className={formLabelClasses}><span>Տարեթիվ *</span><input className={classNames(formControlClasses, errors.year && "border-[#c95540]")} type="number" min="1990" max={new Date().getFullYear() + 2} value={form.year} onChange={update("year")} />{errors.year ? <small>{errors.year}</small> : null}</label>
          <label className={formLabelClasses}><span>Թափք</span><input className={formControlClasses} value={form.body} onChange={update("body")} placeholder="Սեդան" /></label>
          <label className={formLabelClasses}><span>Վազք</span><input className={formControlClasses} value={form.mileage} onChange={update("mileage")} placeholder="70 000 մղոն" /></label>
          <label className={formLabelClasses}><span>Վառելիք</span><select className={formControlClasses} value={form.fuel} onChange={update("fuel")}><option>Բենզին</option><option>Դիզել</option><option>Հիբրիդ</option><option>Էլեկտրական</option></select></label>
          <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}><span>Վնասվածք / վիճակ</span><input className={formControlClasses} value={form.damage} onChange={update("damage")} placeholder="Առջևի թեթև վնասվածք" /></label>
          <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}><span>Աղբյուր</span><input className={formControlClasses} value={form.auction} onChange={update("auction")} placeholder="Copart • ցուցադրական" /></label>
        </div></fieldset>
        <fieldset className={formFieldsetClasses}><legend>Գին և ներկայացում</legend><div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
          <label className={formLabelClasses}><span>Նվազագույն արժեք, $ *</span><input className={classNames(formControlClasses, errors.estimateMin && "border-[#c95540]")} type="number" min="0" step="100" value={form.estimateMin} onChange={update("estimateMin")} />{errors.estimateMin ? <small>{errors.estimateMin}</small> : null}</label>
          <label className={formLabelClasses}><span>Առավելագույն արժեք, $ *</span><input className={classNames(formControlClasses, errors.estimateMax && "border-[#c95540]")} type="number" min="0" step="100" value={form.estimateMax} onChange={update("estimateMax")} />{errors.estimateMax ? <small>{errors.estimateMax}</small> : null}</label>
          <label className={formLabelClasses}><span>Առավելագույն խաղադրույք, $ *</span><input className={classNames(formControlClasses, errors.maxBid && "border-[#c95540]")} type="number" min="0" step="100" value={form.maxBid} onChange={update("maxBid")} />{errors.maxBid ? <small>{errors.maxBid}</small> : null}</label>
          <label className={formLabelClasses}><span>Պիտակի տեքստ</span><input className={formControlClasses} value={form.badge} onChange={update("badge")} /></label>
          <label className={formLabelClasses}><span>Պիտակի գույն</span><select className={formControlClasses} value={form.accent} onChange={update("accent")}><option value="yellow">Դեղին</option><option value="green">Կանաչ</option><option value="blue">Կապույտ</option><option value="orange">Նարնջագույն</option><option value="black">Սև</option></select></label>
          <label className={formLabelClasses}><span>Հրապարակման վիճակ</span><select className={formControlClasses} value={form.status} onChange={update("status")}><option value="draft">Սևագիր</option><option value="published">Հրապարակված</option><option value="archived">Արխիվացված</option></select></label>
          <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}><span>Նկարի հասցե *</span><div className={classNames("flex h-[43px] items-center gap-2 rounded-[9px] border border-[#d8d4cc] pl-[11px] text-[#8b867e] focus-within:border-[#806600] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]", errors.image && "border-[#c95540]")}><ImageSquare size={19} /><input className="h-10 w-full border-0 bg-white px-[11px] pl-0 text-[10px] text-[#26241f] outline-none" value={form.image} onChange={update("image")} /></div>{errors.image ? <small>{errors.image}</small> : null}</label>
          <label className={classNames(formLabelClasses, "col-span-full max-[700px]:col-auto")}><span>Նկարի դիրք</span><input className={formControlClasses} value={form.imagePosition} onChange={update("imagePosition")} placeholder="50% 50%" /></label>
          <label className="col-span-full flex min-h-[58px] cursor-pointer items-center gap-[11px] rounded-[10px] border border-[#dedad2] px-3 py-2.5 max-[700px]:col-auto"><input className="peer pointer-events-none absolute opacity-0" type="checkbox" checked={Boolean(form.featured)} onChange={update("featured")} /><span className="grid size-[21px] shrink-0 place-items-center rounded-md border border-[#bcb7ae] text-transparent peer-checked:border-[#ffc400] peer-checked:bg-[#ffc400] peer-checked:text-[#11110f]"><Check size={14} weight="bold" /></span><p className="m-0 grid"><strong className="text-[10px]">Ցուցադրել գլխավոր էջում</strong><small className="text-[8px] text-[#88837c]">Հրապարակված առաջարկը կհայտնվի ընտրյալ մեքենաների շարքում։</small></p></label>
        </div></fieldset>
        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-[15px] border-t border-[#ddd8d0] bg-[rgba(255,255,255,0.96)] px-5 py-4 backdrop-blur-[10px] max-[700px]:flex-col-reverse max-[700px]:items-stretch">
          {!isNew && vehicle && vehicle.status !== "archived" ? <AdminButton className="max-[700px]:w-full" type="button" icon={Archive} variant="danger" onClick={() => onArchive(vehicle)}>Արխիվացնել</AdminButton> : <span />}
          <div className="flex gap-[9px] max-[700px]:grid max-[700px]:grid-cols-[1fr_1.25fr]"><AdminButton type="button" variant="ghost" onClick={onClose}>Չեղարկել</AdminButton><AdminButton type="submit" icon={FloppyDisk}>Պահպանել</AdminButton></div>
        </div>
      </form>
    </AdminDrawer>
  );
}

interface RequestDetailsProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
}

function RequestDetails({ lead, onClose, onStatusChange }: RequestDetailsProps) {
  const phone = safePhone(lead.phone);
  const whatsapp = phone.replace(/^\+/, "");
  return (
    <AdminDrawer title={lead.name} eyebrow="Հարցման մանրամասներ" onClose={onClose}>
      <div className="grid gap-[15px] p-5 [&_h3]:mb-[13px] [&_h3]:mt-0 [&_h3]:text-xs">
        <div className={classNames(detailSectionClasses, "flex items-center justify-between gap-4")}><span className="text-[10px] font-extrabold">Կարգավիճակ</span><select className={classNames(formControlClasses, "max-w-[185px]")} value={lead.status} onChange={(event) => onStatusChange(lead, event.target.value as LeadStatus)}>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-2.5 max-[430px]:grid-cols-1"><a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`tel:${phone}`}><Phone className="text-[#8a6a00]" size={20} weight="fill" /><span className="grid min-w-0"><strong className="text-[10px]">Զանգահարել</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">{lead.phone}</small></span></a><a className="flex min-h-[65px] items-center gap-2.5 rounded-xl border border-[#ddd8d0] bg-white p-[11px] text-[#2a2925]" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><WhatsappLogo className="text-[#238b43]" size={20} weight="fill" /><span className="grid min-w-0"><strong className="text-[10px]">WhatsApp</strong><small className="overflow-hidden text-ellipsis text-[8px] text-[#817c74]">Բացել զրույցը</small></span></a></div>
        <section className={detailSectionClasses}><h3>Հաճախորդ</h3><dl className={detailListClasses}><div><dt>Անուն</dt><dd>{lead.name}</dd></div><div><dt>Հեռախոս</dt><dd>{lead.phone}</dd></div><div><dt>Կապի եղանակ</dt><dd>{lead.method}</dd></div><div><dt>Աղբյուր</dt><dd>{lead.source === "ai-assistant" ? "Hovex AI օգնական" : "Կայք"}</dd></div><div><dt>Ստացվել է</dt><dd>{formatDate(lead.createdAt)} {lead.demo ? "· ԴԵՄՈ" : ""}</dd></div></dl></section>
        <section className={detailSectionClasses}><h3>Հետաքրքրություն</h3><div className="flex min-h-[58px] items-center gap-2.5 rounded-[10px] bg-[#f6f3ed] p-[11px] text-[#846600]"><Car size={22} weight="fill" /><span className="grid"><small className="text-[8px] text-[#817c74]">Ընտրված մեքենա</small><strong className="text-[10px] text-[#292722]">{lead.vehicleLabel || "Անհատական ընտրություն"}</strong></span></div></section>
        <section className={detailSectionClasses}><h3>Նախընտրելի ժամ</h3><dl className={detailListClasses}><div><dt>Օր</dt><dd>{lead.date || "Չի նշվել"}</dd></div><div><dt>Ժամ</dt><dd>{lead.time || "Ճկուն"}</dd></div></dl></section>
        <section className={detailSectionClasses}><h3>Մեկնաբանություն</h3><p className="m-0 whitespace-pre-wrap text-[10px] leading-[1.65] text-[#5e5a54]">{lead.note || "Մեկնաբանություն չկա։"}</p></section>
      </div>
    </AdminDrawer>
  );
}

interface AdminSidebarProps {
  view: NavView;
  onNavigate: (view: NavView) => void;
  newLeadCount: number;
}

function AdminSidebar({ view, onNavigate, newLeadCount }: AdminSidebarProps) {
  return (
    <aside className="sticky top-0 z-20 flex h-screen flex-col bg-[#11110f] px-[18px] pb-5 pt-6 text-white shadow-[10px_0_36px_rgba(17,17,15,0.1)] max-[900px]:grid max-[900px]:h-auto max-[900px]:grid-cols-[auto_minmax(0,1fr)] max-[900px]:items-center max-[900px]:gap-[18px] max-[900px]:px-4 max-[900px]:py-2.5 max-[700px]:grid-cols-[42px_minmax(0,1fr)] max-[700px]:gap-2.5">
      <a className="mx-1.5 mb-[30px] flex min-h-[62px] items-center gap-3 max-[900px]:m-0 max-[900px]:min-h-12" href="/" aria-label="Hovex Motors կայք"><img className="size-[52px] shrink-0 rounded-[11px] border border-[#302f2b] object-contain max-[900px]:size-[42px]" src="/assets/hovex/hovex-logo-instagram.jpg" alt="" /><span className="grid gap-px max-[900px]:hidden"><strong className="text-base leading-[1.1] tracking-[0.14em]">HOVEX</strong><small className="text-[9px] font-bold tracking-[0.19em] text-[#aaa69e]">ADMIN PANEL</small></span></a>
      <nav className="grid gap-[7px] max-[900px]:flex max-[900px]:justify-end max-[900px]:gap-[5px]" aria-label="Կառավարման ընտրացանկ">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={classNames("relative flex min-h-[50px] w-full cursor-pointer items-center gap-3 rounded-[11px] border border-transparent bg-transparent px-3.5 text-left font-bold text-[#c9c6c0] transition duration-150 hover:bg-[#201f1c] hover:text-white max-[900px]:min-h-[43px] max-[900px]:w-auto max-[900px]:px-[11px] max-[700px]:flex-1 max-[700px]:justify-center max-[700px]:[&>span]:hidden", view === id && "border-[rgba(255,196,0,0.26)] bg-[#2b281d] text-[#ffc400] shadow-[inset_3px_0_0_#ffc400] max-[900px]:shadow-[inset_0_-3px_0_#ffc400]")} aria-current={view === id ? "page" : undefined} onClick={() => onNavigate(id)}><Icon size={21} weight={view === id ? "fill" : "regular"} /><span>{label}</span>{id === "requests" && newLeadCount ? <em className="ml-auto grid h-[23px] min-w-[23px] place-items-center rounded-full bg-[#ffc400] px-1.5 text-[11px] font-black not-italic text-[#11110f] max-[900px]:absolute max-[900px]:translate-x-[18px] max-[900px]:-translate-y-3.5 max-[700px]:translate-x-[15px] max-[700px]:-translate-y-[13px]">{newLeadCount}</em> : null}</button>)}
      </nav>
      <div className="mt-auto grid gap-3.5 max-[900px]:hidden"><span className="flex items-center gap-2.5 rounded-[11px] border border-[#34322d] bg-[#191815] p-[13px] text-[#ffc400]"><SealCheck size={20} weight="fill" /><p className="m-0 grid"><strong className="text-xs text-white">Local demo</strong><small className="text-[10px] text-[#8e8a82]">Browser storage</small></p></span><a className="flex items-center justify-between px-1.5 py-[7px] text-xs font-bold text-[#9b978f] hover:text-white" href="/">Վերադառնալ կայք <ArrowSquareOut size={16} weight="bold" /></a></div>
    </aside>
  );
}

function createVehicleId(vehicle: Pick<VehicleSavePayload, "make" | "model" | "year">, vehicles: Vehicle[]): string {
  const base = `${vehicle.make}-${vehicle.model}-${vehicle.year}`.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `vehicle-${Date.now()}`;
  let id = base;
  let suffix = 2;
  while (vehicles.some((item) => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}

export function AdminApp() {
  const [view, setView] = useState<NavView>(routeFromPath);
  const [vehicles, setVehicles] = useState<Vehicle[]>(getVehicles);
  const [leads, setLeads] = useState<Lead[]>(getLeads);
  const [editorVehicle, setEditorVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.body.classList.add("bg-[#f5f2ec]", "text-[#11110f]");
    const onPopState = () => setView(routeFromPath());
    window.addEventListener("popstate", onPopState);
    return () => {
      document.body.classList.remove("bg-[#f5f2ec]", "text-[#11110f]");
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribeVehicles = subscribeVehicles(setVehicles);
    const unsubscribeLeads = subscribeLeads(setLeads);
    return () => {
      unsubscribeVehicles();
      unsubscribeLeads();
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const navigate = (nextView: NavView) => {
    const item = navItems.find((entry) => entry.id === nextView) || navItems[0];
    window.history.pushState({}, "", item.path);
    setView(item.id);
    setEditorVehicle(undefined);
    setSelectedLead(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const commitVehicles = (next: Vehicle[], message: string) => {
    saveVehicles(next);
    setVehicles(getVehicles());
    notify(message);
  };

  const saveVehicle = (vehicle: VehicleSavePayload) => {
    const now = new Date().toISOString();
    const nextVehicle: Vehicle = {
      ...vehicle,
      id: vehicle.id || createVehicleId(vehicle, vehicles),
      sortOrder: vehicle.sortOrder ?? vehicles.length,
      updatedAt: now,
      createdAt: vehicle.createdAt || now,
    };
    const exists = vehicles.some((item) => item.id === nextVehicle.id);
    const next = exists ? vehicles.map((item) => item.id === nextVehicle.id ? nextVehicle : item) : [nextVehicle, ...vehicles];
    commitVehicles(next, exists ? "Մեքենայի տվյալները թարմացվեցին" : "Նոր մեքենան ավելացվեց");
    setEditorVehicle(undefined);
  };

  const changeVehicleStatus = (vehicle: Vehicle) => {
    const status: VehicleStatus = vehicle.status === "published" ? "draft" : "published";
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, status === "published" ? "Մեքենան հրապարակվեց" : "Մեքենան տեղափոխվեց սևագիր");
  };

  const toggleFeatured = (vehicle: Vehicle) => {
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, featured: !item.featured, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, vehicle.featured ? "Հեռացվեց գլխավոր էջից" : "Ավելացվեց գլխավոր էջում");
  };

  const archiveVehicle = (vehicle: Vehicle) => {
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, status: "archived" as VehicleStatus, featured: false, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, "Մեքենան արխիվացվեց");
    setEditorVehicle(undefined);
  };

  const restoreDemoVehicles = () => {
    if (!window.confirm("Վերականգնե՞լ մեքենաների սկզբնական ցուցադրական ցանկը։ Ձեր տեղային փոփոխությունները կփոխարինվեն։")) return;
    resetVehicles();
    setVehicles(getVehicles());
    notify("Ցուցադրական մեքենաները վերականգնվեցին");
  };

  const updateLeadStatus = (lead: Lead, status: LeadStatus) => {
    const next = leads.map((item) => item.id === lead.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
    saveLeads(next);
    setLeads(next);
    setSelectedLead((current) => current?.id === lead.id ? { ...current, status } : current);
    notify("Հարցման կարգավիճակը թարմացվեց");
  };

  const exportLeads = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [["Անուն", "Հեռախոս", "Մեքենա", "Կապի եղանակ", "Օր", "Ժամ", "Կարգավիճակ", "Մեկնաբանություն", "Ստացվել է"], ...leads.map((lead) => [lead.name, lead.phone, lead.vehicleLabel, lead.method, lead.date, lead.time, leadStatus[lead.status]?.label, lead.note, lead.createdAt])];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hovex-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("CSV ֆայլը պատրաստ է");
  };

  const newLeadCount = leads.filter((lead) => lead.status === "new").length;
  return (
    <div className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)] bg-[radial-gradient(circle_at_92%_0%,rgba(255,196,0,0.08),transparent_28%),#f5f2ec] text-[#11110f] max-[900px]:block">
      <AdminSidebar view={view} onNavigate={navigate} newLeadCount={newLeadCount} />
      <div className="min-w-0">
        <header className="sticky top-0 z-[15] flex h-[70px] items-center justify-between border-b border-[#e2ddd5] bg-[rgba(255,255,255,0.92)] px-[clamp(24px,3.2vw,50px)] backdrop-blur-[14px] max-[900px]:top-[68px] max-[700px]:top-[62px] max-[700px]:h-[58px] max-[700px]:px-4 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&>div]:text-xs [&>div]:font-bold [&>div]:text-[#6b6760] max-[700px]:[&>div:first-child]:hidden max-[700px]:[&>div:last-child]:w-full max-[700px]:[&>div:last-child]:justify-between"><div><span className="size-2 rounded-full bg-[#36ad55] shadow-[0_0_0_4px_rgba(54,173,85,0.12)]" />Համակարգը հասանելի է</div><div><a className="inline-flex items-center gap-1.5 text-[#11110f]" href="/" target="_blank" rel="noreferrer">Բացել կայքը <ArrowSquareOut size={16} weight="bold" /></a><span className="grid size-[38px] place-items-center rounded-[10px] bg-[#ffc400] text-xs font-black text-[#11110f]">HM</span></div></header>
        <main className="mx-auto w-[min(1480px,100%)] px-[clamp(24px,3.2vw,50px)] pb-[60px] pt-[38px] max-[900px]:pt-7 max-[700px]:px-3.5 max-[700px]:pb-11 max-[700px]:pt-[23px]">
          {view === "dashboard" ? <Dashboard vehicles={vehicles} leads={leads} onNavigate={navigate} onOpenLead={setSelectedLead} onNewVehicle={() => setEditorVehicle(null)} /> : null}
          {view === "requests" ? <RequestsPage leads={leads} onOpenLead={setSelectedLead} onExport={exportLeads} /> : null}
          {view === "vehicles" ? <VehiclesPage vehicles={vehicles} onEdit={setEditorVehicle} onNew={() => setEditorVehicle(null)} onChangeStatus={changeVehicleStatus} onToggleFeatured={toggleFeatured} onReset={restoreDemoVehicles} /> : null}
        </main>
      </div>
      {editorVehicle !== undefined ? <VehicleEditor vehicle={editorVehicle} onClose={() => setEditorVehicle(undefined)} onSave={saveVehicle} onArchive={archiveVehicle} /> : null}
      {selectedLead ? <RequestDetails lead={selectedLead} onClose={() => setSelectedLead(null)} onStatusChange={updateLeadStatus} /> : null}
      {toast ? <div className="fixed bottom-6 right-6 z-[140] flex min-h-12 items-center gap-[9px] rounded-[11px] bg-[#171714] px-[17px] text-[10px] font-extrabold text-white shadow-[0_14px_36px_rgba(17,17,15,0.24)] [animation:admin-toast-in_180ms_ease_both] max-[430px]:bottom-3 max-[430px]:left-3 max-[430px]:right-3 [&>svg]:text-[#ffc400]" role="status"><CheckCircle size={20} weight="fill" />{toast}</div> : null}
    </div>
  );
}
