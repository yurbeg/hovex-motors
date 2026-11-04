import { useEffect, useMemo, useRef, useState } from "react";
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
} from "./adminStore.js";
import "./admin.css";

const vehicleStatus = {
  published: { label: "Հրապարակված", tone: "green" },
  draft: { label: "Սևագիր", tone: "gray" },
  archived: { label: "Արխիվացված", tone: "orange" },
};

const leadStatus = {
  new: { label: "Նոր", tone: "blue" },
  contacted: { label: "Կապ հաստատված", tone: "yellow" },
  booked: { label: "Ամրագրված", tone: "green" },
  closed: { label: "Փակված", tone: "gray" },
};

const navItems = [
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

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${armenianMonthsShort[date.getMonth()]} · ${hours}:${minutes}`;
}

function formatLongDate(date) {
  return `${armenianWeekdays[date.getDay()]}, ${armenianMonths[date.getMonth()]} ${date.getDate()}`;
}

function routeFromPath() {
  const segment = window.location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return navItems.some((item) => item.id === segment) ? segment : "dashboard";
}

function safePhone(value = "") {
  return value.replace(/[^+\d]/g, "");
}

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function AdminButton({ children, icon: Icon, variant = "primary", className = "", ...props }) {
  return (
    <button className={classNames("admin-button", `admin-button--${variant}`, className)} {...props}>
      {Icon ? <Icon size={19} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

function StatusBadge({ type, value }) {
  const config = type === "lead" ? leadStatus[value] : vehicleStatus[value];
  const fallback = { label: value || "—", tone: "gray" };
  return <span className={`admin-status admin-status--${(config || fallback).tone}`}><i />{(config || fallback).label}</span>;
}

function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="admin-empty">
      <span><Icon size={28} weight="bold" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function AdminDrawer({ title, eyebrow, onClose, children, wide = false }) {
  const drawerRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    document.body.classList.add("admin-drawer-open");
    const drawer = drawerRef.current;
    window.requestAnimationFrame(() => drawer?.querySelector("button, input, select, textarea")?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("admin-drawer-open");
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={drawerRef} className={classNames("admin-drawer", wide && "admin-drawer--wide")} role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title">
        <header className="admin-drawer__header">
          <div>{eyebrow ? <p>{eyebrow}</p> : null}<h2 id="admin-drawer-title">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Փակել"><X size={22} weight="bold" /></button>
        </header>
        <div className="admin-drawer__body">{children}</div>
      </aside>
    </div>
  );
}

function LocalModeNotice() {
  return (
    <div className="admin-local-notice">
      <Database size={20} weight="fill" aria-hidden="true" />
      <p><strong>Ցուցադրական կառավարման վահանակ</strong><span>Փոփոխությունները պահվում են միայն այս դիտարկիչում և տեսանելի են նույն սարքի հանրային կայքում։</span></p>
    </div>
  );
}

function StatCard({ label, value, note, icon: Icon, tone = "ink" }) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-card__icon admin-stat-card__icon--${tone}`}><Icon size={23} weight="bold" /></div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function RequestTable({ leads, onSelect, compact = false }) {
  if (!leads.length) {
    return <EmptyState icon={ChatCircleText} title="Հարցումներ չկան" text="Նոր հարցումները կհայտնվեն այստեղ։" />;
  }

  return (
    <div className={classNames("admin-table-wrap", compact && "admin-table-wrap--compact")}>
      <table className="admin-table admin-request-table">
        <thead><tr><th>Հաճախորդ</th><th>Հետաքրքրություն</th><th>Նախընտրելի կապ</th><th>Ստացվել է</th><th>Կարգավիճակ</th><th><span className="sr-only">Բացել</span></th></tr></thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} onClick={() => onSelect(lead)}>
              <td data-label="Հաճախորդ"><strong>{lead.name}</strong><span>{lead.phone}</span></td>
              <td data-label="Հետաքրքրություն"><strong>{lead.vehicleLabel || "Անհատական ընտրություն"}</strong><span>{lead.note || "Մեկնաբանություն չկա"}</span></td>
              <td data-label="Նախընտրելի կապ"><strong>{lead.method}</strong><span>{lead.date ? `${lead.date} · ${lead.time || ""}` : lead.time || "Ճկուն ժամ"}</span></td>
              <td data-label="Ստացվել է"><span>{formatDate(lead.createdAt)}</span>{lead.source === "ai-assistant" ? <small className="admin-demo-tag admin-ai-tag">AI</small> : null}{lead.demo ? <small className="admin-demo-tag">ԴԵՄՈ</small> : null}</td>
              <td data-label="Կարգավիճակ"><StatusBadge type="lead" value={lead.status} /></td>
              <td><button type="button" className="admin-row-action" onClick={(event) => { event.stopPropagation(); onSelect(lead); }} aria-label={`${lead.name} հարցումը բացել`}><Eye size={19} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ vehicles, leads, onNavigate, onOpenLead, onNewVehicle }) {
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const waitingLeads = leads.filter((lead) => ["new", "contacted"].includes(lead.status)).length;
  const published = vehicles.filter((vehicle) => vehicle.status === "published").length;
  const featured = vehicles.filter((vehicle) => vehicle.featured && vehicle.status === "published").length;
  const recent = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const statusCounts = Object.keys(vehicleStatus).map((status) => ({
    status,
    count: vehicles.filter((vehicle) => vehicle.status === status).length,
  }));

  return (
    <>
      <section className="admin-page-heading">
        <div><p className="admin-eyebrow">Այսօրվա պատկերը</p><h1>Բարի գալուստ Hovex Admin</h1><span>{formatLongDate(new Date())}</span></div>
        <AdminButton icon={Plus} onClick={onNewVehicle}>Ավելացնել մեքենա</AdminButton>
      </section>
      <LocalModeNotice />
      <section className="admin-stats" aria-label="Հիմնական ցուցանիշներ">
        <StatCard label="Նոր հարցումներ" value={newLeads} note="Սպասում են առաջին կապին" icon={ChatCircleText} tone="blue" />
        <StatCard label="Ակտիվ առաջարկներ" value={published} note={`${vehicles.length} ընդհանուր մեքենայից`} icon={Car} tone="yellow" />
        <StatCard label="Ընտրյալ առաջարկներ" value={featured} note="Ցուցադրվում են գլխավոր էջում" icon={Star} tone="ink" />
        <StatCard label="Կապի հերթում" value={waitingLeads} note="Նոր կամ ընթացքի մեջ" icon={Clock} tone="orange" />
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--requests">
          <header className="admin-panel__header"><div><p className="admin-eyebrow">Վերջին ակտիվությունը</p><h2>Վերջին հարցումները</h2></div><button type="button" className="admin-text-link" onClick={() => onNavigate("requests")}>Դիտել բոլորը <span>→</span></button></header>
          <RequestTable leads={recent} onSelect={onOpenLead} compact />
        </section>
        <aside className="admin-panel admin-inventory-health">
          <header className="admin-panel__header"><div><p className="admin-eyebrow">Կայքի բովանդակություն</p><h2>Մեքենաների վիճակ</h2></div></header>
          <div className="admin-health-list">
            {statusCounts.map(({ status, count }) => {
              const percentage = vehicles.length ? Math.round((count / vehicles.length) * 100) : 0;
              return <div key={status}><p><StatusBadge type="vehicle" value={status} /><strong>{count}</strong></p><span><i style={{ width: `${percentage}%` }} /></span></div>;
            })}
          </div>
          <button type="button" className="admin-health-action" onClick={() => onNavigate("vehicles")}><Car size={20} weight="bold" /><span><strong>Կառավարել առաջարկները</strong><small>Թարմացնել գները և հրապարակման վիճակը</small></span><span>→</span></button>
        </aside>
      </div>
    </>
  );
}

function RequestsPage({ leads, onOpenLead, onExport }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return [...leads]
      .filter((lead) => status === "all" || lead.status === status)
      .filter((lead) => !needle || [lead.name, lead.phone, lead.vehicleLabel, lead.note, lead.method].some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leads, query, status]);

  return (
    <>
      <section className="admin-page-heading"><div><p className="admin-eyebrow">Հաճախորդների հոսք</p><h1>Խորհրդատվության հարցումներ</h1><span>{leads.length} ընդհանուր · {leads.filter((lead) => lead.status === "new").length} նոր</span></div><AdminButton icon={DownloadSimple} variant="secondary" onClick={onExport}>Ներբեռնել CSV</AdminButton></section>
      <LocalModeNotice />
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="admin-search"><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել հարցում</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Անուն, հեռախոս կամ մեքենա" /></label>
          <label className="admin-filter"><span>Կարգավիճակ</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Բոլորը</option>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <span className="admin-result-count">Ցուցադրվում է {filtered.length}</span>
        </div>
        <RequestTable leads={filtered} onSelect={onOpenLead} />
      </section>
    </>
  );
}

function VehiclesPage({ vehicles, onEdit, onNew, onChangeStatus, onToggleFeatured, onReset }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hy");
    return vehicles
      .filter((vehicle) => status === "all" || vehicle.status === status)
      .filter((vehicle) => !needle || [vehicle.make, vehicle.model, vehicle.year, vehicle.badge, vehicle.body].some((value) => String(value || "").toLocaleLowerCase("hy").includes(needle)));
  }, [vehicles, query, status]);

  return (
    <>
      <section className="admin-page-heading"><div><p className="admin-eyebrow">Հանրային առաջարկներ</p><h1>Մեքենաների կառավարում</h1><span>{vehicles.filter((vehicle) => vehicle.status === "published").length} հրապարակված · {vehicles.filter((vehicle) => vehicle.status === "draft").length} սևագիր</span></div><AdminButton icon={Plus} onClick={onNew}>Ավելացնել մեքենա</AdminButton></section>
      <LocalModeNotice />
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="admin-search"><MagnifyingGlass size={19} /><span className="sr-only">Փնտրել մեքենա</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Մակնիշ, մոդել կամ տարեթիվ" /></label>
          <label className="admin-filter"><span>Տեսանելիություն</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Բոլորը</option>{Object.entries(vehicleStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          <button type="button" className="admin-reset-link" onClick={onReset}><ArrowCounterClockwise size={17} weight="bold" /> Վերականգնել demo տվյալները</button>
        </div>
        {filtered.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-vehicle-table">
              <thead><tr><th>Մեքենա</th><th>Գնային միջակայք</th><th>Կարգավիճակ</th><th>Գլխավոր էջ</th><th>Թարմացվել է</th><th><span className="sr-only">Գործողություններ</span></th></tr></thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td data-label="Մեքենա"><div className="admin-vehicle-cell"><img src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} /><span><small>{vehicle.year} · {vehicle.body}</small><strong>{vehicle.make} {vehicle.model}</strong><em>{vehicle.badge}</em></span></div></td>
                    <td data-label="Գնային միջակայք"><strong>{formatMoney(vehicle.estimateMin)}–{formatMoney(vehicle.estimateMax).replace("$", "")}</strong><span>Max bid՝ {formatMoney(vehicle.maxBid)}</span></td>
                    <td data-label="Կարգավիճակ"><button type="button" className="admin-status-toggle" onClick={() => onChangeStatus(vehicle)} aria-label={`${vehicle.make} ${vehicle.model} հրապարակման վիճակը փոխել`}><StatusBadge type="vehicle" value={vehicle.status} />{vehicle.status === "published" ? <EyeSlash size={17} /> : <Eye size={17} />}</button></td>
                    <td data-label="Գլխավոր էջ"><button type="button" className={classNames("admin-feature-toggle", vehicle.featured && "admin-feature-toggle--active")} onClick={() => onToggleFeatured(vehicle)} aria-pressed={vehicle.featured}><Star size={19} weight={vehicle.featured ? "fill" : "regular"} /><span>{vehicle.featured ? "Ընտրյալ" : "Սովորական"}</span></button></td>
                    <td data-label="Թարմացվել է"><span>{formatDate(vehicle.updatedAt)}</span></td>
                    <td><button type="button" className="admin-row-action" onClick={() => onEdit(vehicle)} aria-label={`${vehicle.make} ${vehicle.model}-ը խմբագրել`}><PencilSimple size={19} /></button></td>
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

const emptyVehicle = {
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

function VehicleEditor({ vehicle, onClose, onSave, onArchive }) {
  const isNew = !vehicle?.id;
  const [form, setForm] = useState(() => ({ ...emptyVehicle, ...vehicle }));
  const [errors, setErrors] = useState({});
  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
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
    <AdminDrawer title={isNew ? "Ավելացնել մեքենա" : `${vehicle.make} ${vehicle.model}`} eyebrow={isNew ? "Նոր առաջարկ" : "Խմբագրել առաջարկը"} onClose={onClose} wide>
      <form className="admin-editor" onSubmit={submit} noValidate>
        <div className="admin-editor-preview">
          <div className="admin-editor-preview__image"><img src={form.image} alt="" style={{ objectPosition: form.imagePosition }} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} onLoad={(event) => { event.currentTarget.style.visibility = "visible"; }} /><span>{form.badge || "Պիտակ"}</span></div>
          <div><p>{form.year || "Տարեթիվ"} · {form.body || "Թափք"}</p><h3>{form.make || "Մակնիշ"} {form.model || "Մոդել"}</h3><strong>{formatMoney(form.estimateMin)}–{formatMoney(form.estimateMax).replace("$", "")}</strong></div>
        </div>
        <fieldset><legend>Հիմնական տվյալներ</legend><div className="admin-form-grid">
          <label className={errors.make ? "admin-field--error" : ""}><span>Մակնիշ *</span><input autoFocus value={form.make} onChange={update("make")} placeholder="Kia" />{errors.make ? <small>{errors.make}</small> : null}</label>
          <label className={errors.model ? "admin-field--error" : ""}><span>Մոդել *</span><input value={form.model} onChange={update("model")} placeholder="Forte LXS" />{errors.model ? <small>{errors.model}</small> : null}</label>
          <label className={errors.year ? "admin-field--error" : ""}><span>Տարեթիվ *</span><input type="number" min="1990" max={new Date().getFullYear() + 2} value={form.year} onChange={update("year")} />{errors.year ? <small>{errors.year}</small> : null}</label>
          <label><span>Թափք</span><input value={form.body} onChange={update("body")} placeholder="Սեդան" /></label>
          <label><span>Վազք</span><input value={form.mileage} onChange={update("mileage")} placeholder="70 000 մղոն" /></label>
          <label><span>Վառելիք</span><select value={form.fuel} onChange={update("fuel")}><option>Բենզին</option><option>Դիզել</option><option>Հիբրիդ</option><option>Էլեկտրական</option></select></label>
          <label className="admin-field--full"><span>Վնասվածք / վիճակ</span><input value={form.damage} onChange={update("damage")} placeholder="Առջևի թեթև վնասվածք" /></label>
          <label className="admin-field--full"><span>Աղբյուր</span><input value={form.auction} onChange={update("auction")} placeholder="Copart • ցուցադրական" /></label>
        </div></fieldset>
        <fieldset><legend>Գին և ներկայացում</legend><div className="admin-form-grid">
          <label className={errors.estimateMin ? "admin-field--error" : ""}><span>Նվազագույն արժեք, $ *</span><input type="number" min="0" step="100" value={form.estimateMin} onChange={update("estimateMin")} />{errors.estimateMin ? <small>{errors.estimateMin}</small> : null}</label>
          <label className={errors.estimateMax ? "admin-field--error" : ""}><span>Առավելագույն արժեք, $ *</span><input type="number" min="0" step="100" value={form.estimateMax} onChange={update("estimateMax")} />{errors.estimateMax ? <small>{errors.estimateMax}</small> : null}</label>
          <label className={errors.maxBid ? "admin-field--error" : ""}><span>Առավելագույն խաղադրույք, $ *</span><input type="number" min="0" step="100" value={form.maxBid} onChange={update("maxBid")} />{errors.maxBid ? <small>{errors.maxBid}</small> : null}</label>
          <label><span>Պիտակի տեքստ</span><input value={form.badge} onChange={update("badge")} /></label>
          <label><span>Պիտակի գույն</span><select value={form.accent} onChange={update("accent")}><option value="yellow">Դեղին</option><option value="green">Կանաչ</option><option value="blue">Կապույտ</option><option value="orange">Նարնջագույն</option><option value="black">Սև</option></select></label>
          <label><span>Հրապարակման վիճակ</span><select value={form.status} onChange={update("status")}><option value="draft">Սևագիր</option><option value="published">Հրապարակված</option><option value="archived">Արխիվացված</option></select></label>
          <label className={classNames("admin-field--full", errors.image && "admin-field--error")}><span>Նկարի հասցե *</span><div className="admin-input-icon"><ImageSquare size={19} /><input value={form.image} onChange={update("image")} /></div>{errors.image ? <small>{errors.image}</small> : null}</label>
          <label className="admin-field--full"><span>Նկարի դիրք</span><input value={form.imagePosition} onChange={update("imagePosition")} placeholder="50% 50%" /></label>
          <label className="admin-check-field admin-field--full"><input type="checkbox" checked={Boolean(form.featured)} onChange={update("featured")} /><span><Check size={14} weight="bold" /></span><p><strong>Ցուցադրել գլխավոր էջում</strong><small>Հրապարակված առաջարկը կհայտնվի ընտրյալ մեքենաների շարքում։</small></p></label>
        </div></fieldset>
        <div className="admin-editor__footer">
          {!isNew && vehicle.status !== "archived" ? <AdminButton type="button" icon={Archive} variant="danger" onClick={() => onArchive(vehicle)}>Արխիվացնել</AdminButton> : <span />}
          <div><AdminButton type="button" variant="ghost" onClick={onClose}>Չեղարկել</AdminButton><AdminButton type="submit" icon={FloppyDisk}>Պահպանել</AdminButton></div>
        </div>
      </form>
    </AdminDrawer>
  );
}

function RequestDetails({ lead, onClose, onStatusChange }) {
  const phone = safePhone(lead.phone);
  const whatsapp = phone.replace(/^\+/, "");
  return (
    <AdminDrawer title={lead.name} eyebrow="Հարցման մանրամասներ" onClose={onClose}>
      <div className="admin-lead-detail">
        <div className="admin-lead-detail__status"><span>Կարգավիճակ</span><select value={lead.status} onChange={(event) => onStatusChange(lead, event.target.value)}>{Object.entries(leadStatus).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
        <div className="admin-contact-actions"><a href={`tel:${phone}`}><Phone size={20} weight="fill" /><span><strong>Զանգահարել</strong><small>{lead.phone}</small></span></a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="fill" /><span><strong>WhatsApp</strong><small>Բացել զրույցը</small></span></a></div>
        <section><h3>Հաճախորդ</h3><dl><div><dt>Անուն</dt><dd>{lead.name}</dd></div><div><dt>Հեռախոս</dt><dd>{lead.phone}</dd></div><div><dt>Կապի եղանակ</dt><dd>{lead.method}</dd></div><div><dt>Աղբյուր</dt><dd>{lead.source === "ai-assistant" ? "Hovex AI օգնական" : "Կայք"}</dd></div><div><dt>Ստացվել է</dt><dd>{formatDate(lead.createdAt)} {lead.demo ? "· ԴԵՄՈ" : ""}</dd></div></dl></section>
        <section><h3>Հետաքրքրություն</h3><div className="admin-interest-card"><Car size={22} weight="fill" /><span><small>Ընտրված մեքենա</small><strong>{lead.vehicleLabel || "Անհատական ընտրություն"}</strong></span></div></section>
        <section><h3>Նախընտրելի ժամ</h3><dl><div><dt>Օր</dt><dd>{lead.date || "Չի նշվել"}</dd></div><div><dt>Ժամ</dt><dd>{lead.time || "Ճկուն"}</dd></div></dl></section>
        <section><h3>Մեկնաբանություն</h3><p className="admin-lead-note">{lead.note || "Մեկնաբանություն չկա։"}</p></section>
      </div>
    </AdminDrawer>
  );
}

function AdminSidebar({ view, onNavigate, newLeadCount }) {
  return (
    <aside className="admin-sidebar">
      <a className="admin-brand" href="/" aria-label="Hovex Motors կայք"><img src="/assets/hovex/hovex-logo-instagram.jpg" alt="" /><span><strong>HOVEX</strong><small>ADMIN PANEL</small></span></a>
      <nav aria-label="Կառավարման ընտրացանկ">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={view === id ? "admin-nav-active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => onNavigate(id)}><Icon size={21} weight={view === id ? "fill" : "regular"} /><span>{label}</span>{id === "requests" && newLeadCount ? <em>{newLeadCount}</em> : null}</button>)}
      </nav>
      <div className="admin-sidebar__foot"><span><SealCheck size={20} weight="fill" /><p><strong>Local demo</strong><small>Browser storage</small></p></span><a href="/">Վերադառնալ կայք <ArrowSquareOut size={16} weight="bold" /></a></div>
    </aside>
  );
}

function createVehicleId(vehicle, vehicles) {
  const base = `${vehicle.make}-${vehicle.model}-${vehicle.year}`.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `vehicle-${Date.now()}`;
  let id = base;
  let suffix = 2;
  while (vehicles.some((item) => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}

export function AdminApp() {
  const [view, setView] = useState(routeFromPath);
  const [vehicles, setVehicles] = useState(getVehicles);
  const [leads, setLeads] = useState(getLeads);
  const [editorVehicle, setEditorVehicle] = useState(undefined);
  const [selectedLead, setSelectedLead] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    document.body.classList.add("admin-mode");
    const onPopState = () => setView(routeFromPath());
    window.addEventListener("popstate", onPopState);
    return () => {
      document.body.classList.remove("admin-mode");
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

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const navigate = (nextView) => {
    const item = navItems.find((entry) => entry.id === nextView) || navItems[0];
    window.history.pushState({}, "", item.path);
    setView(item.id);
    setEditorVehicle(undefined);
    setSelectedLead(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const commitVehicles = (next, message) => {
    saveVehicles(next);
    setVehicles(getVehicles());
    notify(message);
  };

  const saveVehicle = (vehicle) => {
    const now = new Date().toISOString();
    const nextVehicle = { ...vehicle, id: vehicle.id || createVehicleId(vehicle, vehicles), updatedAt: now, createdAt: vehicle.createdAt || now };
    const exists = vehicles.some((item) => item.id === nextVehicle.id);
    const next = exists ? vehicles.map((item) => item.id === nextVehicle.id ? nextVehicle : item) : [nextVehicle, ...vehicles];
    commitVehicles(next, exists ? "Մեքենայի տվյալները թարմացվեցին" : "Նոր մեքենան ավելացվեց");
    setEditorVehicle(undefined);
  };

  const changeVehicleStatus = (vehicle) => {
    const status = vehicle.status === "published" ? "draft" : "published";
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, status === "published" ? "Մեքենան հրապարակվեց" : "Մեքենան տեղափոխվեց սևագիր");
  };

  const toggleFeatured = (vehicle) => {
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, featured: !item.featured, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, vehicle.featured ? "Հեռացվեց գլխավոր էջից" : "Ավելացվեց գլխավոր էջում");
  };

  const archiveVehicle = (vehicle) => {
    const next = vehicles.map((item) => item.id === vehicle.id ? { ...item, status: "archived", featured: false, updatedAt: new Date().toISOString() } : item);
    commitVehicles(next, "Մեքենան արխիվացվեց");
    setEditorVehicle(undefined);
  };

  const restoreDemoVehicles = () => {
    if (!window.confirm("Վերականգնե՞լ մեքենաների սկզբնական ցուցադրական ցանկը։ Ձեր տեղային փոփոխությունները կփոխարինվեն։")) return;
    resetVehicles();
    setVehicles(getVehicles());
    notify("Ցուցադրական մեքենաները վերականգնվեցին");
  };

  const updateLeadStatus = (lead, status) => {
    const next = leads.map((item) => item.id === lead.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
    saveLeads(next);
    setLeads(next);
    setSelectedLead((current) => current?.id === lead.id ? { ...current, status } : current);
    notify("Հարցման կարգավիճակը թարմացվեց");
  };

  const exportLeads = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
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
    <div className="admin-shell">
      <AdminSidebar view={view} onNavigate={navigate} newLeadCount={newLeadCount} />
      <div className="admin-main">
        <header className="admin-topbar"><div><span className="admin-topbar__dot" />Համակարգը հասանելի է</div><div><a href="/" target="_blank" rel="noreferrer">Բացել կայքը <ArrowSquareOut size={16} weight="bold" /></a><span className="admin-avatar">HM</span></div></header>
        <main className="admin-content">
          {view === "dashboard" ? <Dashboard vehicles={vehicles} leads={leads} onNavigate={navigate} onOpenLead={setSelectedLead} onNewVehicle={() => setEditorVehicle({})} /> : null}
          {view === "requests" ? <RequestsPage leads={leads} onOpenLead={setSelectedLead} onExport={exportLeads} /> : null}
          {view === "vehicles" ? <VehiclesPage vehicles={vehicles} onEdit={setEditorVehicle} onNew={() => setEditorVehicle({})} onChangeStatus={changeVehicleStatus} onToggleFeatured={toggleFeatured} onReset={restoreDemoVehicles} /> : null}
        </main>
      </div>
      {editorVehicle !== undefined ? <VehicleEditor vehicle={editorVehicle} onClose={() => setEditorVehicle(undefined)} onSave={saveVehicle} onArchive={archiveVehicle} /> : null}
      {selectedLead ? <RequestDetails lead={selectedLead} onClose={() => setSelectedLead(null)} onStatusChange={updateLeadStatus} /> : null}
      {toast ? <div className="admin-toast" role="status"><CheckCircle size={20} weight="fill" />{toast}</div> : null}
    </div>
  );
}
