import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  Dispatch,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  SetStateAction,
} from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  ArrowsLeftRight,
  Boat,
  CalendarBlank,
  Car,
  CaretDown,
  CaretUp,
  ChatCircleText,
  Check,
  CheckCircle,
  Clock,
  Coins,
  CurrencyDollar,
  GasPump,
  Gavel,
  Gauge,
  GearSix,
  Handshake,
  InstagramLogo,
  ListMagnifyingGlass,
  MagnifyingGlass,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkle,
  SpinnerGap,
  SteeringWheel,
  Truck,
  WarningCircle,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { addLead, getVehicles, subscribeVehicles } from "./adminStore";
import type { Vehicle } from "./adminStore";
import { AiAssistant } from "./AiAssistant";
import type { AssistantCriteria } from "./assistantService";
import { faqs, priceSteps } from "./data";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light";
type SearchState = "idle" | "loading" | "searched";
type ConsultationSource = "website" | "ai-assistant";
type ConsultationStatus = "idle" | "submitting" | "success";
type ModalSize = "medium" | "large";
type ConsultationHandler = (vehicleId: string | null, source?: ConsultationSource) => void;

interface SearchCriteria extends AssistantCriteria {
  budget: string;
  yearFrom: string;
  yearTo: string;
  make: string;
}

interface ProcessStep {
  title: string;
  text: string;
  icon: Icon;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: Icon;
}

interface ConsultationActionProps {
  onConsultation: ConsultationHandler;
}

interface FinderProps {
  criteria: SearchCriteria;
  setCriteria: Dispatch<SetStateAction<SearchCriteria>>;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  makes: string[];
}

interface VehicleCardProps {
  vehicle: Vehicle;
  isCompared: boolean;
  onCompare: (vehicleId: string) => void;
  onDetails: (vehicle: Vehicle) => void;
  onConsultation: ConsultationHandler;
}

interface ResultsProps {
  results: Vehicle[];
  state: SearchState;
  criteria: SearchCriteria;
  compared: string[];
  onCompare: (vehicleId: string) => void;
  onDetails: (vehicle: Vehicle) => void;
  onConsultation: ConsultationHandler;
  onReset: () => void;
}

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
}

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onConsultation: ConsultationHandler;
  isCompared: boolean;
  onCompare: (vehicleId: string) => void;
}

interface CompareModalProps {
  items: Vehicle[];
  onClose: () => void;
  onRemove: (vehicleId: string) => void;
  onConsultation: ConsultationHandler;
}

interface ConsultationModalProps {
  selectedVehicle: Vehicle | null;
  onClose: () => void;
  source?: ConsultationSource;
}

interface CompareBarProps {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}

interface ConsultationFormState {
  name: string;
  phone: string;
  method: string;
  date: string;
  time: string;
  note: string;
  consent: boolean;
}

type ConsultationErrors = Partial<Record<keyof ConsultationFormState, string>>;

const pageShellClasses = "mx-auto w-[min(1440px,calc(100%_-_80px))] max-[1240px]:w-[min(calc(100%_-_44px),1180px)] max-[800px]:w-[calc(100%_-_28px)]";
const eyebrowClasses = "m-0 mb-3 flex items-center gap-[9px] text-[13px] leading-[1.4] font-bold text-[#635d54] uppercase max-[800px]:text-[10px] [&>span]:h-1 [&>span]:w-[26px] [&>span]:shrink-0 [&>span]:rounded [&>span]:bg-[var(--yellow)]";
const sectionTitleClasses = "m-0 text-[clamp(30px,3vw,42px)] leading-[1.22] font-black max-[800px]:text-[29px]";
const formFieldClasses = "flex flex-col gap-[7px] text-[13px] font-bold [&>span:first-child]:leading-[1.35] [&_input]:min-h-[49px] [&_input]:w-full [&_input]:rounded-[11px] [&_input]:border [&_input]:border-[var(--border)] [&_input]:bg-[var(--surface)] [&_input]:px-3.5 [&_input]:text-[15px] [&_input]:font-normal [&_input]:text-[var(--ink)] [&_input]:transition-[border-color,box-shadow] [&_input]:duration-150 [&_input:hover]:border-[#aaa49b] [&_input:focus]:border-[var(--yellow-hover)] [&_input:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_input:focus]:outline-none [&_select]:min-h-[49px] [&_select]:w-full [&_select]:rounded-[11px] [&_select]:border [&_select]:border-[var(--border)] [&_select]:bg-[var(--surface)] [&_select]:px-3.5 [&_select]:text-[15px] [&_select]:font-normal [&_select]:text-[var(--ink)] [&_select]:transition-[border-color,box-shadow] [&_select]:duration-150 [&_select:hover]:border-[#aaa49b] [&_select:focus]:border-[var(--yellow-hover)] [&_select:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_select:focus]:outline-none [&_textarea]:min-h-[92px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[11px] [&_textarea]:border [&_textarea]:border-[var(--border)] [&_textarea]:bg-[var(--surface)] [&_textarea]:px-3.5 [&_textarea]:pt-3 [&_textarea]:text-[15px] [&_textarea]:font-normal [&_textarea]:text-[var(--ink)] [&_textarea]:transition-[border-color,box-shadow] [&_textarea]:duration-150 [&_textarea:hover]:border-[#aaa49b] [&_textarea:focus]:border-[var(--yellow-hover)] [&_textarea:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_textarea:focus]:outline-none [&_small]:min-h-4 [&_small]:text-[11px] [&_small]:leading-[1.45] [&_small]:font-normal [&_small]:text-[var(--muted)]";
const navButtonClasses = "relative cursor-pointer border-0 bg-transparent px-0 py-2 text-sm font-bold after:absolute after:right-full after:bottom-px after:left-0 after:h-[3px] after:bg-[var(--yellow)] after:transition-[right] after:duration-150 hover:after:right-0 max-[1240px]:text-xs max-[1080px]:min-h-[46px] max-[1080px]:border-b max-[1080px]:border-[var(--border)] max-[1080px]:text-left max-[1080px]:last:border-b-0";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--yellow)] text-[var(--ink)] hover:bg-[var(--yellow-hover)]",
  secondary: "bg-[var(--ink)] text-white hover:bg-[#2a2926]",
  ghost: "border-[var(--border)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface)]",
  light: "bg-white text-[var(--ink)] hover:bg-[var(--yellow-pale)]",
};

const vehicleBadgeToneClasses: Record<string, string> = {
  green: "bg-[#23853c] text-white",
  yellow: "bg-[var(--yellow)] text-[var(--ink)]",
  blue: "bg-[#155b86] text-white",
  orange: "bg-[#8e4300] text-white",
  black: "bg-[var(--ink)] text-white",
};

const modalSizeClasses: Record<ModalSize, string> = {
  medium: "w-[min(680px,100%)]",
  large: "w-[min(1120px,100%)]",
};

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const phoneDisplay = "033 344 366";
const phoneHref = "+37433344366";

const processSteps: ProcessStep[] = [
  { title: "Նշեք պահանջները", text: "Բյուջե, տարեթիվ և ցանկալի մակնիշ", icon: ListMagnifyingGlass },
  { title: "Ընտրեք տարբերակը", text: "Համեմատեք մեքենաներն ու նախնական արժեքները", icon: Car },
  { title: "Ստուգեք մասնագետի հետ", text: "Ճշտեք պատմությունը, վնասվածքն ու անվտանգ խաղադրույքը", icon: ShieldCheck },
  { title: "Ստացեք Հայաստանում", text: "Hovex-ը ուղեկցում է գնումից մինչև հանձնում", icon: Handshake },
];

const costIcons: Icon[] = [CurrencyDollar, Gavel, Truck, Boat, ShieldCheck, GearSix];

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Button({ children, variant = "primary", className = "", icon: Icon, ...props }: ButtonProps) {
  return (
    <button className={classNames("inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-xl border border-transparent px-[21px] leading-[1.15] font-bold transition-[background,border-color,color,transform] duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-wait disabled:opacity-72 disabled:[&_svg]:animate-spin motion-reduce:transition-none disabled:motion-reduce:[&_svg]:animate-none", buttonVariantClasses[variant], className)} {...props}>
      {Icon ? <Icon size={20} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

function Header({ onConsultation }: ConsultationActionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navTo = (id: string): void => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <header className="sticky top-0 z-40 h-20 border-b border-[rgba(222,218,210,0.9)] bg-[rgba(255,255,255,0.96)] backdrop-blur-[14px] max-[1080px]:h-[72px] max-[800px]:h-16">
      <div className={classNames(pageShellClasses, "grid h-full grid-cols-[82px_1fr_auto] items-center gap-7 max-[1240px]:grid-cols-[72px_1fr_auto] max-[1240px]:gap-[18px] max-[1080px]:grid-cols-[64px_auto_1fr] max-[800px]:grid-cols-[54px_auto_1fr] max-[800px]:gap-2.5")}>
        <a className="h-[62px] w-[62px] overflow-hidden rounded-[11px] bg-[#050505] shadow-[0_6px_18px_rgba(17,17,15,0.14)] max-[1080px]:h-[54px] max-[1080px]:w-[54px] max-[800px]:h-12 max-[800px]:w-12 max-[800px]:rounded-lg" href="#top" aria-label="Hovex Motors — գլխավոր էջ">
          <img className="h-full w-full object-contain" src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" />
        </a>
        <button
          className="hidden h-11 w-11 cursor-pointer place-items-center rounded-[11px] border border-[var(--border)] bg-white max-[1080px]:grid max-[800px]:h-[42px] max-[800px]:w-[42px]"
          type="button"
          aria-label={menuOpen ? "Փակել ընտրացանկը" : "Բացել ընտրացանկը"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={24} weight="bold" /> : <ListMagnifyingGlass size={25} weight="bold" />}
        </button>
        <nav className={classNames("flex items-center justify-center gap-[clamp(18px,2.3vw,38px)] max-[1240px]:gap-4 max-[1080px]:absolute max-[1080px]:top-[72px] max-[1080px]:right-[22px] max-[1080px]:left-[22px] max-[1080px]:hidden max-[1080px]:flex-col max-[1080px]:items-stretch max-[1080px]:gap-0 max-[1080px]:rounded-[15px] max-[1080px]:border max-[1080px]:border-[var(--border)] max-[1080px]:bg-white max-[1080px]:p-4 max-[1080px]:shadow-[var(--shadow-lg)] max-[800px]:top-16 max-[800px]:right-3.5 max-[800px]:left-3.5", menuOpen && "max-[1080px]:flex")} aria-label="Հիմնական ընտրացանկ">
          <button className={navButtonClasses} type="button" onClick={() => navTo("finder")}>Մեքենա գտնել</button>
          <button className={navButtonClasses} type="button" onClick={() => navTo("how-it-works")}>Ինչպես է աշխատում</button>
          <button className={navButtonClasses} type="button" onClick={() => navTo("vehicles")}>Տարբերակներ</button>
          <button className={navButtonClasses} type="button" onClick={() => navTo("faq")}>Հաճախ տրվող հարցեր</button>
        </nav>
        <div className="flex items-center gap-3 max-[1080px]:justify-self-end">
          <a className="flex min-h-11 items-center gap-2 px-2.5 text-sm font-bold whitespace-nowrap max-[800px]:h-[42px] max-[800px]:w-[42px] max-[800px]:justify-center max-[800px]:rounded-full max-[800px]:border max-[800px]:border-[var(--border)] max-[800px]:p-0" href={`tel:${phoneHref}`}>
            <Phone size={19} weight="fill" aria-hidden="true" />
            <span className="max-[1240px]:hidden">{phoneDisplay}</span>
          </a>
          <Button className="min-h-[45px] px-4 text-[13px] max-[800px]:hidden" icon={CalendarBlank} onClick={() => onConsultation(null)}>
            Անվճար խորհրդատվություն
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onConsultation }: ConsultationActionProps) {
  return (
    <section className="border-b border-[var(--border)] bg-[#f0ece4]" id="top">
      <div className={classNames(pageShellClasses, "grid min-h-[420px] grid-cols-[minmax(0,0.94fr)_minmax(520px,1.06fr)] items-stretch gap-[38px] max-[1240px]:grid-cols-[0.92fr_1.08fr] max-[1240px]:gap-[25px] max-[1080px]:min-h-[430px] max-[1080px]:grid-cols-[1fr_0.92fr] max-[800px]:flex max-[800px]:min-h-0 max-[800px]:w-full max-[800px]:flex-col max-[800px]:gap-0")}>
        <div className="self-center py-[42px] pb-[60px] max-[1080px]:py-10 max-[1080px]:pb-[54px] max-[800px]:mx-auto max-[800px]:w-[calc(100%_-_28px)] max-[800px]:py-[34px] max-[800px]:pb-[31px]">
          <p className={eyebrowClasses}><span />ԱՄՆ և Չինաստան • ամբողջական ուղեկցում</p>
          <h1 className="m-0 max-w-[720px] text-[clamp(42px,4.1vw,62px)] leading-[1.08] font-black max-[1240px]:text-5xl max-[1080px]:text-[42px] max-[800px]:text-[clamp(34px,10.6vw,42px)] max-[800px]:leading-[1.14] [&_mark]:box-decoration-clone [&_mark]:bg-[var(--yellow)] [&_mark]:px-[7px] [&_mark]:pb-[3px] [&_mark]:text-inherit">Գտեք մեքենա՝ <mark>ձեր իրական բյուջեի սահմաններում</mark></h1>
          <p className="mt-[22px] mb-0 max-w-[650px] text-[17px] leading-[1.65] text-[var(--ink-soft)] max-[1080px]:text-sm max-[800px]:mt-[18px] max-[800px]:text-[13px]">
            Նշեք բյուջեն, տարեթիվը և ցանկալի մակնիշը․ մենք կցուցադրենք համապատասխան տարբերակներ և Հայաստան հասցնելու նախնական արժեքը։
          </p>
          <div className="mt-[25px] flex flex-wrap gap-[11px] max-[800px]:[&>button]:w-full">
            <Button icon={MagnifyingGlass} onClick={() => scrollToId("finder")}>Սկսել որոնումը</Button>
            <Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Խոսել մասնագետի հետ</Button>
          </div>
          <div className="mt-[23px] flex flex-wrap gap-[21px] text-[13px] font-bold max-[800px]:gap-[11px] max-[800px]:text-[10px] [&_span]:inline-flex [&_span]:items-center [&_span]:gap-[7px] [&_svg]:text-[var(--green)]" aria-label="Ծառայության առավելություններ">
            <span><CheckCircle size={18} weight="fill" /> Թափանցիկ հաշվարկ</span>
            <span><CheckCircle size={18} weight="fill" /> Առանց պարտադիր գրանցման</span>
          </div>
        </div>
        <div className="relative grid min-h-[420px] grid-cols-[1.5fr_0.72fr] gap-[7px] overflow-hidden border-l-[7px] border-[var(--yellow)] bg-[var(--ink)] max-[1080px]:min-h-[430px] max-[1080px]:grid-cols-1 max-[800px]:min-h-[330px] max-[800px]:grid-cols-[1.42fr_0.72fr] max-[800px]:border-t-[5px] max-[800px]:border-l-0 max-[420px]:grid-cols-1 [&_img]:h-full [&_img]:min-h-[420px] [&_img]:w-full [&_img]:object-cover max-[1080px]:[&_img]:min-h-[430px] max-[800px]:[&_img]:min-h-[330px]" aria-label="Hovex Motors-ի իրական հրապարակումներից">
          <img className="object-[50%_37%]" src="/assets/hovex/presenter-import-made-easy.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների կողքին" />
          <img className="object-[48%_68%] max-[1080px]:hidden max-[800px]:block max-[420px]:hidden" src="/assets/hovex/hongqi-ehs9.jpg" alt="Hovex Motors-ի ներկայացրած Hongqi մեքենան" />
          <div className="absolute right-[18px] bottom-[18px] flex w-[min(280px,calc(100%_-_36px))] items-center gap-2.5 rounded-[13px] border border-[rgba(255,255,255,0.55)] bg-[rgba(17,17,15,0.9)] px-[15px] py-[13px] text-[13px] leading-[1.45] text-white max-[800px]:right-3 max-[800px]:bottom-3 max-[800px]:w-[min(250px,calc(100%_-_24px))] max-[800px]:text-[10px] [&_svg]:shrink-0 [&_svg]:text-[var(--yellow)] [&_span]:block [&_strong]:block">
            <ShieldCheck size={22} weight="fill" aria-hidden="true" />
            <span><strong>Անհատական ընտրություն</strong> ըստ ձեր բյուջեի</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Finder({ criteria, setCriteria, onSearch, isLoading, makes }: FinderProps) {
  const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
  const update = (key: keyof SearchCriteria) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setCriteria((current) => ({ ...current, [key]: event.target.value }));
  };

  return (
    <section className={classNames(pageShellClasses, "relative z-[5] -mt-[34px] max-[800px]:mt-3.5")} id="finder" aria-labelledby="finder-title">
      <form className="grid min-h-[142px] grid-cols-[205px_1.05fr_1fr_1.05fr_205px] items-end gap-[18px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-[22px] shadow-[var(--shadow-lg)] max-[1240px]:grid-cols-[180px_1fr_1fr_1fr_180px] max-[1240px]:gap-[13px] max-[1240px]:p-[18px] max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1 max-[800px]:gap-3.5 max-[800px]:rounded-2xl max-[800px]:p-[17px] max-[800px]:shadow-[var(--shadow-sm)]" onSubmit={onSearch}>
        <div className="flex self-center items-center gap-3 max-[1080px]:col-span-full max-[800px]:col-auto [&_p]:m-0 [&_p]:text-xs [&_p]:font-bold [&_p]:text-[var(--ink-soft)] [&_h2]:mt-[3px] [&_h2]:mb-0 [&_h2]:text-[17px] [&_h2]:leading-[1.35] max-[1240px]:[&_h2]:text-[15px] max-[800px]:[&_h2]:text-[17px]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] bg-[var(--yellow)]"><SteeringWheel size={24} weight="bold" /></span>
          <div><p>Անվճար որոնում</p><h2 id="finder-title">Սկսենք ձեր բյուջեից</h2></div>
        </div>
        <label className={formFieldClasses}>
          <span>Ընդհանուր բյուջե Հայաստանում</span>
          <span className="relative block">
            <span className="absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-[17px]">$</span>
            <input className="!pl-[39px]" type="number" min="6000" step="500" inputMode="numeric" value={criteria.budget} onChange={update("budget")} aria-describedby="budget-help" disabled={isLoading} required />
          </span>
          <small id="budget-help">Ներառյալ գնումը, առաքումն ու ծառայությունը</small>
        </label>
        <div className={formFieldClasses}>
          <span>Տարեթիվ</span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 [&_select]:!px-[11px]">
            <label><span className="sr-only">Տարեթիվ՝ սկսած</span><select value={criteria.yearFrom} onChange={update("yearFrom")} disabled={isLoading}>{years.slice().reverse().map((year) => <option key={year}>{year}</option>)}</select></label>
            <span>—</span>
            <label><span className="sr-only">Տարեթիվ՝ մինչև</span><select value={criteria.yearTo} onChange={update("yearTo")} disabled={isLoading}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
          </div>
          <small>Ընտրեք ցանկալի միջակայքը</small>
        </div>
        <label className={classNames(formFieldClasses, "max-[1080px]:col-start-1 max-[1080px]:col-end-2 max-[800px]:col-auto")}>
          <span>Մակնիշ կամ մոդել</span>
          <select value={criteria.make} onChange={update("make")} disabled={isLoading}>
            <option value="all">Բոլոր մակնիշները</option>
            {makes.map((make) => <option key={make} value={make}>{make}</option>)}
          </select>
          <small>Դաշտը պարտադիր չէ</small>
        </label>
        <Button className="mb-[22px] min-h-[52px] max-[800px]:m-0 max-[800px]:w-full" icon={isLoading ? SpinnerGap : MagnifyingGlass} disabled={isLoading}>
          {isLoading ? "Փնտրում ենք…" : "Գտնել մեքենաներ"}
        </Button>
      </form>
    </section>
  );
}

function CostStrip() {
  return (
    <section className={classNames(pageShellClasses, "mt-[21px] grid min-h-[70px] grid-cols-[235px_1fr] items-center overflow-hidden rounded-[17px] border border-[#eadca8] bg-[var(--yellow-pale)] max-[1240px]:grid-cols-[205px_1fr] max-[1080px]:block max-[800px]:mt-3.5")} aria-label="Նախնական արժեքի բաղադրիչները">
      <div className="flex h-full items-center gap-3 bg-[var(--yellow)] px-[21px] py-[13px] max-[1080px]:min-h-[60px] max-[1080px]:justify-center [&_span]:block [&_strong]:block [&_strong]:text-sm [&_small]:mt-0.5 [&_small]:block [&_small]:text-[10px]"><Coins size={25} weight="bold" /><span><strong>Թափանցիկ հաշվարկ</strong><small>Մեկ ընդհանուր բյուջե</small></span></div>
      <div className="grid grid-cols-6 gap-[5px] px-5 max-[1240px]:px-2.5 max-[1080px]:min-h-[70px] max-[800px]:grid-cols-2 max-[800px]:gap-[7px] max-[800px]:p-3">
        {priceSteps.map((step, index) => {
          const Icon = costIcons[index];
          return <span className="flex min-h-[42px] items-center justify-center gap-[7px] border-r border-[rgba(99,86,41,0.17)] text-center text-[11px] font-bold last:border-r-0 max-[1240px]:text-[10px] max-[1080px]:border-r-0 max-[800px]:min-h-10 max-[800px]:justify-start max-[800px]:text-left" key={step}><Icon size={21} weight="bold" />{step}</span>;
        })}
      </div>
    </section>
  );
}

function VehicleCard({ vehicle, isCompared, onCompare, onDetails, onConsultation }: VehicleCardProps) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-[17px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_24px_rgba(17,17,15,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-[var(--shadow-sm)]">
      <div className="relative h-[250px] overflow-hidden bg-[#d7d2c8] max-[1240px]:h-[225px] max-[800px]:h-[245px]">
        <img className="h-full w-full bg-[#171715] object-contain transition-transform duration-300 group-hover:scale-[1.025]" src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} />
        <span className={classNames("absolute top-[13px] left-[13px] z-[2] rounded-full px-2.5 py-2 text-[11px] leading-none font-bold", vehicleBadgeToneClasses[vehicle.accent] ?? vehicleBadgeToneClasses.black)}>{vehicle.badge}</span>
        <span className="absolute top-3.5 right-[13px] z-[2] rounded-full bg-[rgba(255,255,255,0.92)] px-[9px] py-[7px] text-[11px] leading-none font-bold tracking-[0.08em] text-[var(--ink)]">ԴԵՄՈ</span>
        <button type="button" className={classNames("absolute right-[13px] bottom-[13px] z-[2] flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.7)] bg-[rgba(17,17,15,0.86)] px-[11px] text-[11px] leading-none font-bold text-white", isCompared && "border-[var(--yellow)] bg-[var(--yellow)] text-[var(--ink)]")} aria-pressed={isCompared} onClick={() => onCompare(vehicle.id)}>
          {isCompared ? <Check size={17} weight="bold" /> : <ArrowsLeftRight size={17} weight="bold" />}
          {isCompared ? "Ընտրված է" : "Համեմատել"}
        </button>
      </div>
      <div className="p-[19px]">
        <div className="flex items-start justify-between gap-3 max-[420px]:flex-col [&_p]:m-0 [&_p]:mb-[3px] [&_p]:text-xs [&_p]:font-bold [&_p]:text-[var(--ink-soft)] [&_h3]:m-0 [&_h3]:text-xl [&_h3]:leading-[1.3]">
          <div><p>{vehicle.year} • {vehicle.body}</p><h3>{vehicle.make} {vehicle.model}</h3></div>
          <span className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-[var(--surface-soft)] px-[9px] py-[7px] text-[10px] font-bold text-[var(--ink-soft)] max-[420px]:self-start"><GasPump size={16} weight="fill" />{vehicle.fuel}</span>
        </div>
        <div className="mt-[15px] grid min-h-[57px] grid-cols-[0.8fr_1.2fr] gap-[9px] max-[800px]:min-h-0 max-[420px]:grid-cols-1 [&_span]:flex [&_span]:min-w-0 [&_span]:items-start [&_span]:gap-1.5 [&_span]:text-xs [&_span]:leading-[1.45] [&_span]:text-[var(--ink-soft)] [&_svg]:shrink-0 [&_svg]:text-[#8a7b57]">
          <span><Gauge size={18} />{vehicle.mileage}</span>
          <span><WarningCircle size={18} />{vehicle.damage}</span>
        </div>
        <div className="mt-[13px] rounded-xl border border-[#eadca8] bg-[var(--yellow-pale)] px-3.5 py-[13px] [&>*]:m-0 [&>*]:block">
          <p className="text-[11px] font-bold">Հայաստան հասցնելու նախնական արժեք</p>
          <strong className="mt-1 text-[21px] leading-[1.3]">{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong>
          <small className="mt-1 text-[10px] leading-[1.4] text-[#76653a]">Վերջնական հաշվարկը հաստատում է մասնագետը</small>
        </div>
        <div className="mt-[15px] flex items-center justify-between gap-2.5">
          <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 py-2 text-xs font-bold" onClick={() => onDetails(vehicle)}>Մանրամասներ <ArrowRight size={17} weight="bold" /></button>
          <Button className="min-h-10 rounded-[10px] px-3.5 text-xs" variant="secondary" onClick={() => onConsultation(vehicle.id)}>Խորհրդակցել</Button>
        </div>
      </div>
    </article>
  );
}

function Results({ results, state, criteria, compared, onCompare, onDetails, onConsultation, onReset }: ResultsProps) {
  if (state === "loading") {
    return (
      <section className={classNames(pageShellClasses, "pt-[70px] pb-[90px] max-[800px]:pt-[53px] max-[800px]:pb-[68px]")} id="vehicles" aria-live="polite">
        <div className="mb-7"><div><p className={eyebrowClasses}><span />Անհատական որոնում</p><h2 className={sectionTitleClasses}>Փնտրում ենք համապատասխան տարբերակները…</h2></div></div>
        <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">{[0, 1, 2].map((item) => <div className="h-[540px] animate-pulse rounded-[17px] border border-[var(--border)] bg-white p-4 motion-reduce:animate-none [&_span]:block [&_span]:h-[245px] [&_span]:rounded-[10px] [&_span]:bg-[#e9e6e0] [&_i]:mt-[18px] [&_i]:block [&_i]:h-5 [&_i]:rounded-[10px] [&_i]:bg-[#e9e6e0] [&_i:nth-child(3)]:w-[70%] [&_i:nth-child(4)]:h-[78px]" key={item}><span /><i /><i /><i /></div>)}</div>
      </section>
    );
  }

  return (
    <section className={classNames(pageShellClasses, "pt-[70px] pb-[90px] max-[800px]:pt-[53px] max-[800px]:pb-[68px]")} id="vehicles" aria-live="polite">
      <div className="mb-7 flex items-end justify-between gap-[30px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-3.5">
        <div>
          <p className={eyebrowClasses}><span />Ընտրված Hovex-ի մոտեցմամբ</p>
          <h2 className={sectionTitleClasses}>{state === "searched" ? "Ձեզ համապատասխան տարբերակներ" : "Սկսելու հնարավոր տարբերակներ"}</h2>
          <p className="mt-2.5 mb-0 text-[15px] leading-[1.55] text-[var(--ink-soft)]">{state === "searched" ? `${results.length} ցուցադրական տարբերակ • մինչև ${formatUsd(Number(criteria.budget || 0))}` : "Մեքենաները և արժեքները ցուցադրական են՝ որոնման փորձը ներկայացնելու համար։"}</p>
        </div>
        <span className="inline-flex items-center gap-[7px] rounded-full border border-[#efcda9] bg-[#fff3e6] px-[13px] py-2.5 text-[11px] font-bold whitespace-nowrap text-[#9e5200] max-[800px]:whitespace-normal"><WarningCircle size={18} weight="fill" /> Ոչ հրապարակային առաջարկ</span>
      </div>
      {results.length ? (
        <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">
          {results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} isCompared={compared.includes(vehicle.id)} onCompare={onCompare} onDetails={onDetails} onConsultation={onConsultation} />)}
        </div>
      ) : (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#c9c3ba] bg-[var(--surface)] p-[38px] text-center max-[800px]:px-[18px] max-[800px]:py-[30px]">
          <span className="grid h-[66px] w-[66px] place-items-center rounded-full bg-[var(--yellow-pale)]"><MagnifyingGlass size={33} weight="bold" /></span>
          <h3 className="mt-[19px] mb-[7px] text-[23px]">Այս չափանիշներով տարբերակ չգտանք</h3>
          <p className="m-0 max-w-[580px] leading-[1.6] text-[var(--ink-soft)]">Փորձեք մեծացնել բյուջեն, փոխել տարեթիվը կամ ուղարկել անհատական հարցում։</p>
          <div className="mt-[21px] flex gap-2.5 max-[800px]:w-full max-[800px]:flex-col"><Button icon={ArrowCounterClockwise} onClick={onReset}>Վերականգնել ֆիլտրերը</Button><Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Անհատական հարցում</Button></div>
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-[var(--border)] bg-[#efeae1] py-[86px] pb-24 max-[800px]:py-16" id="how-it-works">
      <div className={pageShellClasses}>
        <div className="mx-auto mb-7 max-w-[760px] text-center"><p className={classNames(eyebrowClasses, "justify-center")}><span />Պարզ ընթացք</p><h2 className={sectionTitleClasses}>Ինչպես է աշխատում ներմուծումը</h2><p className="mt-2.5 mb-0 text-[15px] leading-[1.55] text-[var(--ink-soft)]">Մեկ մասնագետ, մեկ թափանցիկ հաշվարկ և հստակ հաջորդ քայլ յուրաքանչյուր փուլում։</p></div>
        <div className="mt-[39px] grid grid-cols-4 gap-[17px] max-[1080px]:grid-cols-2 max-[800px]:gap-[11px] max-[420px]:grid-cols-1">
          {processSteps.map(({ title, text, icon: Icon }, index) => (
            <article className="min-h-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[23px] max-[800px]:min-h-[210px] max-[800px]:p-[17px] max-[420px]:min-h-[175px]" key={title}><div className="flex items-center justify-between [&>span]:grid [&>span]:h-[34px] [&>span]:w-[34px] [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[var(--yellow)] [&>span]:font-black [&>svg]:text-[#9c7b23]"><span>{index + 1}</span><Icon size={29} weight="bold" /></div><h3 className="mt-8 mb-[7px] text-lg leading-[1.4] max-[800px]:mt-[23px] max-[800px]:text-[15px]">{title}</h3><p className="m-0 text-[13px] leading-[1.6] text-[var(--ink-soft)] max-[800px]:text-[11px]">{text}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsultationBanner({ onConsultation }: ConsultationActionProps) {
  return (
    <section className={classNames(pageShellClasses, "my-[88px] grid min-h-[225px] grid-cols-[0.82fr_1.55fr_0.78fr] items-stretch overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] max-[1240px]:grid-cols-[0.75fr_1.45fr_0.85fr] max-[1080px]:grid-cols-[0.8fr_1.2fr] max-[800px]:my-16 max-[800px]:grid-cols-1")} aria-labelledby="consultation-title">
      <div className="min-h-[225px] overflow-hidden max-[800px]:min-h-[260px] [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[50%_36%]"><img src="/assets/hovex/presenter-vehicle-choice.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների ցուցասրահում" /></div>
      <div className="self-center px-[38px] py-[30px] max-[1240px]:px-7 max-[800px]:px-[21px] max-[800px]:py-[25px]">
        <p className={eyebrowClasses}><span />Իրական մարդ, հստակ պատասխաններ</p>
        <h2 className="m-0 text-[clamp(26px,2.4vw,35px)] leading-[1.22] font-black max-[800px]:text-[29px]" id="consultation-title">Որոշումը կայացրեք Hovex-ի մասնագետի հետ</h2>
        <p className="my-[11px] mb-[15px] text-sm leading-[1.65] text-[var(--ink-soft)]">Քննարկեք ձեր բյուջեն, մեքենայի պատմությունը և ներմուծման ամբողջական հաշվարկը՝ մինչև որևէ պարտավորություն ստանձնելը։</p>
        <span className="flex items-center gap-2 text-[11px] font-bold"><i className="h-[9px] w-[9px] rounded-full bg-[var(--green)]" /> Հայտերը մշակվում են աշխատանքային ժամերին</span>
      </div>
      <div className="flex flex-col items-stretch justify-center gap-3 border-l border-[var(--border)] p-6 max-[1080px]:col-span-full max-[1080px]:flex-row max-[1080px]:border-t max-[1080px]:border-l-0 max-[1080px]:[&>*]:flex-1 max-[800px]:col-auto max-[800px]:flex-col max-[800px]:p-5">
        <Button className="min-h-14" icon={CalendarBlank} onClick={() => onConsultation(null)}>Ամրագրել խորհրդատվություն</Button>
        <a className="flex min-h-[42px] items-center justify-center gap-2 text-[13px] font-bold" href={`tel:${phoneHref}`}><Phone size={19} weight="fill" />{phoneDisplay}</a>
      </div>
    </section>
  );
}

function TransparencySection({ onConsultation }: ConsultationActionProps) {
  const breakdown: Array<[string, string]> = [
    ["Գնման սցենար", "ըստ անվտանգ առավելագույն խաղադրույքի"],
    ["Աճուրդային և բանկային վճարներ", "առանձին տեսանելի տողով"],
    ["Փոխադրում և մաքսազերծում", "երթուղուն համապատասխան հաշվարկով"],
  ];
  return (
    <section className="bg-[#121210] py-[92px] text-white max-[800px]:py-[67px]">
      <div className={classNames(pageShellClasses, "grid grid-cols-[0.95fr_1.05fr] items-center gap-[clamp(45px,7vw,110px)] max-[1080px]:grid-cols-2 max-[1080px]:gap-[35px] max-[800px]:grid-cols-1 max-[800px]:gap-8")}>
        <div><p className={classNames(eyebrowClasses, "text-[#d7d2c8]")}><span />Թափանցիկ արժեք</p><h2 className={sectionTitleClasses}>Իմացեք՝ որտեղից է ձևավորվում վերջնական բյուջեն</h2><p className="mt-[18px] mb-[25px] max-w-[640px] text-[15px] leading-[1.7] text-[#c9c4bb]">Մենք ցույց ենք տալիս ոչ միայն մեքենայի գնման գինը, այլ նաև աճուրդի, տեղափոխման, մաքսազերծման և ծառայության նախնական ծախսերը։</p><Button variant="light" icon={ChatCircleText} onClick={() => onConsultation(null)}>Ստանալ անհատական հաշվարկ</Button></div>
        <div className="overflow-hidden rounded-[18px] border border-[#393830] bg-[#1c1c19]">
          {breakdown.map(([title, text], index) => <div className="grid min-h-[81px] grid-cols-[45px_1fr_auto] items-center gap-[15px] border-b border-[#393830] px-5 py-4" key={title}><span className="text-[13px] font-black text-[var(--yellow)]">{String(index + 1).padStart(2, "0")}</span><p className="m-0 [&>*]:block"><strong className="text-sm">{title}</strong><small className="mt-1 text-[11px] text-[#aaa69e]">{text}</small></p><CheckCircle className="text-[var(--yellow)]" size={23} weight="fill" /></div>)}
          <p className="m-0 flex items-center gap-2 px-5 py-3.5 text-[10px] leading-[1.5] text-[#aaa69e]"><WarningCircle size={18} weight="fill" /> Վերանորոգումը ներառվում է միայն առանձին գնահատման դեպքում։</p>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const images = [
    ["/assets/hovex/deepal-sl03-sport.jpg", "Deepal SL03 Sport"],
    ["/assets/hovex/deepal-s05-lineup.jpg", "Deepal S05 մեքենաների շարք"],
    ["/assets/hovex/hongqi-ehs9.jpg", "Hongqi E-HS9"],
    ["/assets/hovex/cadillac-escalade-iq.jpg", "Cadillac Escalade IQ"],
  ];
  return (
    <section className={classNames(pageShellClasses, "py-[90px] max-[800px]:py-[68px]")}>
      <div className="mb-7 flex items-end justify-between gap-[30px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-3.5"><div><p className={eyebrowClasses}><span />@hovex_motors</p><h2 className={sectionTitleClasses}>Ծանոթացեք մեքենաներին Hovex-ի իրական նյութերով</h2></div><a className="inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[var(--border)] px-[15px] text-xs font-bold hover:border-[var(--ink)] hover:bg-white max-[800px]:w-full max-[800px]:justify-center" href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={21} weight="bold" /> Դիտել Instagram-ում</a></div>
      <div className="grid grid-cols-4 gap-[13px] max-[800px]:grid-cols-2 max-[420px]:gap-2">{images.map(([src, alt]) => <img className="aspect-[1/1.18] w-full rounded-[14px] bg-[#dedad2] object-cover object-[50%_38%]" key={src} src={src} alt={alt} />)}</div>
    </section>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className={classNames(pageShellClasses, "grid grid-cols-[0.65fr_1.35fr] items-start gap-[clamp(45px,7vw,110px)] pt-5 pb-[100px] max-[1080px]:grid-cols-[0.8fr_1.2fr] max-[1080px]:gap-[45px] max-[800px]:grid-cols-1 max-[800px]:gap-9 max-[800px]:pb-[72px]")} id="faq">
      <div className="sticky top-[116px] max-[800px]:static"><p className={eyebrowClasses}><span />Պարզ պատասխաններ</p><h2 className={sectionTitleClasses}>Հաճախ տրվող հարցեր</h2><p className="mt-4 mb-[19px] text-sm leading-[1.65] text-[var(--ink-soft)]">Չգտա՞ք ձեր հարցի պատասխանը։ Զանգահարեք մեզ կամ ամրագրեք անվճար խորհրդատվություն։</p><a className="inline-flex items-center gap-2 text-[15px] font-bold" href={`tel:${phoneHref}`}><Phone size={19} weight="fill" />{phoneDisplay}</a></div>
      <div className="border-t border-[var(--border)]">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return <article className="border-b border-[var(--border)]" key={item.question}><button className="flex min-h-[75px] w-full cursor-pointer items-center justify-between gap-5 border-0 bg-transparent px-1 py-[17px] text-left text-base leading-[1.45] font-bold max-[800px]:min-h-[68px] max-[800px]:text-sm [&_svg]:shrink-0 [&_svg]:text-[#98761f]" type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? -1 : index)}><span>{item.question}</span>{isOpen ? <CaretUp size={21} weight="bold" /> : <CaretDown size={21} weight="bold" />}</button>{isOpen ? <p className="mt-[-4px] mr-0 mb-5 ml-0 pr-[50px] text-[13px] leading-[1.7] text-[var(--ink-soft)] max-[800px]:pr-5">{item.answer}</p> : null}</article>;
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#10100f] text-white">
      <div className={classNames(pageShellClasses, "grid grid-cols-[1.35fr_0.7fr_1fr_0.65fr] gap-[50px] pt-[62px] pb-[52px] max-[1080px]:grid-cols-[1.4fr_0.8fr_1fr] max-[1080px]:[&>div:last-child]:hidden max-[800px]:grid-cols-2 max-[800px]:gap-x-5 max-[800px]:gap-y-[35px]")}>
        <div className="max-[800px]:col-span-full"><img className="h-[78px] w-[90px] rounded-[11px] object-cover" src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" /><p className="mt-[17px] mb-0 max-w-[390px] text-xs leading-[1.7] text-[#aaa69e]">Մեքենաների ընտրություն և ներմուծում ԱՄՆ-ից ու Չինաստանից՝ թափանցիկ հաշվարկով և մասնագետի աջակցությամբ։</p></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_a]:mb-[11px] [&_a]:flex [&_a]:items-start [&_a]:gap-2 [&_a]:text-[11px] [&_a]:leading-[1.6] [&_a]:text-[#c4c0b9] [&_svg]:mt-px [&_svg]:shrink-0"><h3>Կապ</h3><a href={`tel:${phoneHref}`}><Phone size={18} />{phoneDisplay}</a><a href="https://wa.me/37433344366" target="_blank" rel="noreferrer"><WhatsappLogo size={18} />WhatsApp</a><a href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={18} />Instagram</a></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_p]:mb-[11px] [&_p]:flex [&_p]:items-start [&_p]:gap-2 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-[#c4c0b9] [&_svg]:mt-px [&_svg]:shrink-0"><h3>Այցելեք մեզ</h3><p><MapPin size={18} />Երևան, Էրեբունի<br />Ազատամարտիկների 68/1</p><p><Clock size={18} />Աշխատանքային ժամերը ճշտեք զանգով</p></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_button]:mb-[11px] [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[11px] [&_button]:leading-[1.6] [&_button]:font-bold [&_button]:text-[#c4c0b9]"><h3>Արագ հղումներ</h3><button type="button" onClick={() => scrollToId("finder")}>Մեքենա գտնել</button><button type="button" onClick={() => scrollToId("how-it-works")}>Ինչպես է աշխատում</button><button type="button" onClick={() => scrollToId("faq")}>Հաճախ տրվող հարցեր</button></div>
      </div>
      <div className={classNames(pageShellClasses, "flex min-h-[70px] items-center justify-between gap-[25px] border-t border-[#33322e] text-[10px] text-[#8f8a82] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-2 max-[800px]:py-[18px] [&_p]:m-0 [&_p]:text-right max-[800px]:[&_p]:text-left")}><span>© {new Date().getFullYear()} Hovex Motors</span><p>Կայքի բոլոր մեքենաներն ու գները ցուցադրական են և չեն հանդիսանում հրապարակային առաջարկ։</p></div>
    </footer>
  );
}

function Modal({ title, children, onClose, size = "medium" }: ModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    (dialog?.querySelector<HTMLElement>("[autofocus]") || focusable[0] || dialog)?.focus();

    const trapFocus = (event: KeyboardEvent): void => {
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener("keydown", trapFocus);
    return () => {
      dialog?.removeEventListener("keydown", trapFocus);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(11,11,10,0.7)] p-8 max-[800px]:place-items-end max-[800px]:p-3" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} className={classNames("flex max-h-[calc(100vh_-_64px)] flex-col overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[0_28px_90px_rgba(0,0,0,0.38)] max-[800px]:max-h-[calc(100dvh_-_24px)] max-[800px]:w-full max-[800px]:rounded-[18px_18px_12px_12px]", modalSizeClasses[size])} role="dialog" aria-modal="true" aria-labelledby="active-modal-title">
        <div className="flex min-h-[73px] items-center justify-between gap-5 border-b border-[var(--border)] py-4 pr-5 pl-[25px] max-[800px]:min-h-[65px] max-[800px]:p-[13px] max-[800px]:pl-[18px] [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:leading-[1.35] max-[800px]:[&_h2]:text-[17px] [&_button]:grid [&_button]:h-[42px] [&_button]:w-[42px] [&_button]:shrink-0 [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-full [&_button]:border [&_button]:border-[var(--border)] [&_button]:bg-[var(--surface)]"><h2 id="active-modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Փակել"><X size={23} weight="bold" /></button></div>
        <div className="overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

function VehicleDetails({ vehicle, onClose, onConsultation, isCompared, onCompare }: VehicleDetailsProps) {
  const base = vehicle.estimateMin;
  const breakdown: Array<[string, number]> = [
    ["Մեքենայի գնման սցենար", base * 0.46],
    ["Աճուրդի վճարներ", base * 0.08],
    ["ԱՄՆ տեղափոխում", base * 0.05],
    ["Ծովային առաքում", base * 0.13],
    ["Մաքսային գնահատում", base * 0.21],
    ["Hovex ծառայություն", base * 0.07],
  ];
  return (
    <Modal title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose} size="large">
      <div className="grid min-h-[450px] grid-cols-[0.88fr_1.12fr] max-[800px]:grid-cols-1">
        <div className="relative min-h-[450px] overflow-hidden bg-[#dedad2] max-[800px]:min-h-[290px] max-[800px]:max-h-[340px] [&_img]:h-full [&_img]:w-full [&_img]:bg-[#171715] [&_img]:object-contain"><img src={vehicle.image} alt={`${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} /><span className="absolute top-[17px] left-[17px] rounded-full bg-[var(--yellow)] px-2.5 py-2 text-[10px] font-black tracking-[0.05em]">ԴԵՄՈ ՏԱՐԲԵՐԱԿ</span></div>
        <div className="p-7 max-[800px]:p-5">
          <p className="m-0 text-[11px] font-bold text-[var(--ink-soft)]">{vehicle.auction}</p><h3 className="mt-[5px] mb-5 text-[25px]">{vehicle.badge}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[#8f762d] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><Gauge size={19} /><small>Վազք</small><strong>{vehicle.mileage}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[#8f762d] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><GasPump size={19} /><small>Վառելիք</small><strong>{vehicle.fuel}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[#8f762d] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><Car size={19} /><small>Թափք</small><strong>{vehicle.body}</strong></span>
            <span className="grid min-h-[73px] grid-cols-[24px_1fr] items-center gap-x-1.5 rounded-[11px] border border-[var(--border)] px-3 py-[11px] [&_svg]:row-span-2 [&_svg]:text-[#8f762d] [&_small]:block [&_small]:text-[11px] [&_small]:text-[var(--muted)] [&_strong]:block [&_strong]:text-xs [&_strong]:leading-[1.35]"><WarningCircle size={19} /><small>Վիճակ</small><strong>{vehicle.damage}</strong></span>
          </div>
          <div className="mt-4 rounded-[13px] border border-[#eadca8] bg-[var(--yellow-pale)] p-[17px] [&_p]:m-0 [&_p]:text-[11px] [&_p]:font-bold [&>strong]:mt-1 [&>strong]:block [&>strong]:text-[25px] [&>span]:mt-[7px] [&>span]:block [&>span]:text-[11px] [&>span]:text-[#665a3d]"><p>Հայաստան հասցնելու նախնական արժեք</p><strong>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong><span>Առաջարկվող առավելագույն խաղադրույք՝ <b>{formatUsd(vehicle.maxBid)}</b></span></div>
          <div className="mt-4 flex flex-col gap-[9px]"><Button onClick={() => onConsultation(vehicle.id)} icon={ChatCircleText}>Խորհրդակցել այս մեքենայի շուրջ</Button><Button variant="ghost" onClick={() => onCompare(vehicle.id)} icon={isCompared ? Check : ArrowsLeftRight}>{isCompared ? "Համեմատման մեջ է" : "Ավելացնել համեմատման"}</Button></div>
        </div>
      </div>
      <div className="grid grid-cols-[0.8fr_1.2fr] gap-[30px] border-t border-[var(--border)] p-[29px] max-[800px]:grid-cols-1 max-[800px]:gap-[17px] max-[800px]:p-5">
        <div><h3 className="m-0 text-xl">Ինչպես է ձևավորվում արժեքը</h3><p className="mt-2 mb-0 text-[11px] leading-[1.6] text-[var(--ink-soft)]">Ցուցադրական հաշվարկ՝ կառուցվածքը ներկայացնելու համար։</p></div>
        <div>{breakdown.map(([label, amount]) => <p className="m-0 flex min-h-[38px] items-center justify-between gap-5 border-b border-[var(--border)] text-[11px] text-[var(--ink)]" key={label}><span>{label}</span><strong className="whitespace-nowrap">մոտ {formatUsd(Math.round(amount / 50) * 50)}</strong></p>)}</div>
        <p className="col-span-full m-0 flex items-start gap-[7px] rounded-[10px] bg-[#fff2e5] px-3.5 py-3 text-[11px] leading-[1.55] text-[#8a4a09] max-[800px]:col-auto [&_svg]:shrink-0"><WarningCircle size={18} weight="fill" /> Վերանորոգման և հաշվառման ծախսերը ներառված չեն։ Վերջնական արժեքը հաստատվում է միայն կոնկրետ լոտի ստուգումից հետո։</p>
      </div>
    </Modal>
  );
}

function CompareModal({ items, onClose, onRemove, onConsultation }: CompareModalProps) {
  return (
    <Modal title="Համեմատել ընտրված մեքենաները" onClose={onClose} size="large">
      <div className="grid grid-cols-3 gap-3.5 p-[21px] max-[800px]:grid-cols-1">
        {items.map((vehicle) => (
          <article className="relative rounded-[14px] border border-[var(--border)] p-[13px] max-[800px]:grid max-[800px]:grid-cols-[100px_1fr] max-[800px]:gap-x-[13px]" key={vehicle.id}>
            <button className="absolute top-5 right-5 z-[2] grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-[rgba(255,255,255,0.92)] max-[800px]:top-2 max-[800px]:right-2" type="button" onClick={() => onRemove(vehicle.id)} aria-label={`${vehicle.make} ${vehicle.model}-ը հեռացնել`}><X size={17} weight="bold" /></button>
            <img className="h-[150px] w-full rounded-[10px] bg-[#171715] object-contain max-[800px]:row-span-4 max-[800px]:h-[130px] max-[800px]:w-[100px]" src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} />
            <p className="mt-[13px] mb-0 text-[10px] font-bold text-[var(--muted)] max-[800px]:mt-0">{vehicle.year}</p><h3 className="m-0 min-h-[52px] text-[17px] leading-[1.45] max-[800px]:min-h-0 max-[800px]:pr-[30px]">{vehicle.make} {vehicle.model}</h3>
            <dl className="my-[13px] max-[800px]:col-span-full [&>div]:min-h-[43px] [&>div]:border-t [&>div]:border-[var(--border)] [&>div]:py-2 [&_dt]:text-[10px] [&_dt]:text-[var(--muted)] [&_dd]:mt-[3px] [&_dd]:mb-0 [&_dd]:text-[11px] [&_dd]:leading-[1.4] [&_dd]:font-bold"><div><dt>Նախնական արժեք</dt><dd>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</dd></div><div><dt>Վազք</dt><dd>{vehicle.mileage}</dd></div><div><dt>Վառելիք</dt><dd>{vehicle.fuel}</dd></div><div><dt>Վնասվածք</dt><dd>{vehicle.damage}</dd></div><div><dt>Առավելագույն խաղադրույք</dt><dd>{formatUsd(vehicle.maxBid)}</dd></div></dl>
            <Button className="w-full max-[800px]:col-span-full" variant="secondary" onClick={() => onConsultation(vehicle.id)}>Ընտրել</Button>
          </article>
        ))}
      </div>
      <p className="mt-0 mr-[21px] mb-[21px] ml-[21px] flex gap-[7px] rounded-[10px] bg-[#fff2e5] p-3 text-[11px] leading-[1.5] text-[#8a4a09]"><WarningCircle size={18} weight="fill" /> Համեմատությունը ցուցադրական է։ Մասնագետը կստուգի լոտի փաստացի տվյալները մինչև վերջնական որոշումը։</p>
    </Modal>
  );
}

function ConsultationModal({ selectedVehicle, onClose, source = "website" }: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationFormState>({ name: "", phone: "", method: "Հեռախոսազանգ", date: "", time: "10:00–13:00", note: "", consent: false });
  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [status, setStatus] = useState<ConsultationStatus>("idle");
  const timerRef = useRef<number | undefined>(undefined);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const consentRef = useRef<HTMLInputElement | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const selectedVehicleText = selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : "Անհատական ընտրություն";
  const whatsappMessage = encodeURIComponent([
    "Բարև, Hovex Motors։ Ցանկանում եմ խորհրդատվություն ամրագրել։",
    `Անուն՝ ${form.name}`,
    `Հեռախոս՝ ${form.phone}`,
    `Հետաքրքրող մեքենա՝ ${selectedVehicleText}`,
    `Կապի եղանակ՝ ${form.method}`,
    form.date ? `Նախընտրելի օր՝ ${form.date}` : null,
    `Ժամային միջակայք՝ ${form.time}`,
    form.note ? `Մեկնաբանություն՝ ${form.note}` : null,
  ].filter(Boolean).join("\n"));
  const whatsappUrl = `https://wa.me/37433344366?text=${whatsappMessage}`;
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const update = (key: keyof ConsultationFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const value = event.target instanceof HTMLInputElement && event.target.type === "checkbox"
      ? event.target.checked
      : event.target.value;
    setForm((current) => ({ ...current, [key]: value } as ConsultationFormState));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextErrors: ConsultationErrors = {};
    if (!form.name.trim()) nextErrors.name = "Լրացրեք անունը";
    if (form.phone.replace(/\D/g, "").length < 8) nextErrors.phone = "Մուտքագրեք վավեր հեռախոսահամար";
    if (!form.consent) nextErrors.consent = "Շարունակելու համար անհրաժեշտ է տալ համաձայնություն";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => {
        if (nextErrors.name) nameRef.current?.focus();
        else if (nextErrors.phone) phoneRef.current?.focus();
        else if (nextErrors.consent) consentRef.current?.focus();
      });
      return;
    }
    addLead({
      name: form.name,
      phone: form.phone,
      method: form.method,
      vehicleId: selectedVehicle?.id ?? null,
      vehicleLabel: selectedVehicleText,
      date: form.date,
      time: form.time,
      note: form.note,
      source,
    });
    setStatus("submitting");
    timerRef.current = window.setTimeout(() => setStatus("success"), 700);
  };

  if (status === "success") {
    return (
      <Modal title="Հարցումը պահպանվել է" onClose={onClose}>
        <div className="px-[30px] py-[42px] text-center">
          <span className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-[#e7f7e9] text-[var(--green)]"><CheckCircle size={44} weight="fill" /></span>
          <h3 className="mt-[18px] mb-2 text-2xl">Շնորհակալություն, {form.name}</h3>
          <p className="mx-auto mt-0 mb-5 max-w-[500px] text-xs leading-[1.65] text-[var(--ink-soft)]">Հարցումն ավելացվել է ադմին վահանակի տեղային ցուցակին։ Կապն արագացնելու համար այն կարող եք նաև ուղարկել WhatsApp-ով կամ զանգահարել Hovex Motors-ին։ WhatsApp հաղորդագրությունը չի ուղարկվի առանց ձեր հաստատման։</p>
          <div className="mx-auto flex min-h-11 max-w-[470px] items-center justify-between gap-5 border-t border-[var(--border)] text-left text-[10px] [&_span]:text-right"><strong>Կապի եղանակ</strong><span>{form.method}</span></div>
          {selectedVehicle ? <div className="mx-auto flex min-h-11 max-w-[470px] items-center justify-between gap-5 border-t border-[var(--border)] text-left text-[10px] [&_span]:text-right"><strong>Ընտրված մեքենա</strong><span>{selectedVehicleText}</span></div> : null}
          <a className={classNames("mt-[23px] inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-xl border border-transparent bg-[var(--yellow)] px-[21px] leading-[1.15] font-bold text-[var(--ink)] transition-[background,transform] duration-150 hover:-translate-y-px hover:bg-[var(--yellow-hover)]")} href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="bold" /><span>Ուղարկել WhatsApp-ով</span></a>
          <a className="mt-[13px] flex items-center justify-center gap-2 text-xs font-bold" href={`tel:${phoneHref}`}><Phone size={18} weight="fill" /> Զանգահարել {phoneDisplay}</a>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Ամրագրել անվճար խորհրդատվություն" onClose={onClose}>
      <form className="p-6" onSubmit={submit} noValidate>
        <p className="mt-0 mb-[17px] text-[13px] leading-[1.65] text-[var(--ink-soft)]">Թողեք ձեր տվյալները, և Hovex Motors-ի մասնագետը կօգնի ճշտել մեքենան ու ամբողջական հաշվարկը։</p>
        {selectedVehicle ? <div className="mb-[17px] flex items-center gap-[11px] rounded-[11px] bg-[var(--yellow-pale)] px-3.5 py-3"><Car size={21} weight="fill" /><span><small className="block text-[10px] text-[#76653a]">Ընտրված տարբերակ</small><strong className="mt-0.5 block text-xs">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong></span></div> : null}
        <div className="mb-[13px] grid grid-cols-2 gap-[13px] max-[800px]:grid-cols-1 max-[800px]:gap-0">
          <label className={classNames(formFieldClasses, errors.name && "[&_input]:!border-[#be3128] [&_small]:!text-[#a51f18]")}><span>Անուն *</span><input ref={nameRef} autoFocus value={form.name} onChange={update("name")} placeholder="Ինչպե՞ս դիմենք ձեզ" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "consult-name-error" : undefined} />{errors.name ? <small id="consult-name-error" role="alert">{errors.name}</small> : null}</label>
          <label className={classNames(formFieldClasses, errors.phone && "[&_input]:!border-[#be3128] [&_small]:!text-[#a51f18]")}><span>Հեռախոսահամար *</span><input ref={phoneRef} value={form.phone} onChange={update("phone")} placeholder="+374 __ ___ ___" inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "consult-phone-error" : undefined} />{errors.phone ? <small id="consult-phone-error" role="alert">{errors.phone}</small> : null}</label>
        </div>
        <label className={classNames(formFieldClasses, "mb-[13px]")}><span>Կապի նախընտրելի եղանակ</span><select value={form.method} onChange={update("method")}><option>Հեռախոսազանգ</option><option>WhatsApp</option><option>Տեսազանգ</option><option>Այցելություն սրահ</option></select></label>
        <div className="mb-[13px] grid grid-cols-2 gap-[13px] max-[800px]:grid-cols-1 max-[800px]:gap-0">
          <label className={formFieldClasses}><span>Նախընտրելի օր</span><input type="date" min={today} value={form.date} onChange={update("date")} /></label>
          <label className={formFieldClasses}><span>Նախընտրելի ժամ</span><select value={form.time} onChange={update("time")}><option>10:00–13:00</option><option>13:00–16:00</option><option>16:00–19:00</option></select></label>
        </div>
        <label className={classNames(formFieldClasses, "mb-[13px]")}><span>Մեկնաբանություն</span><textarea value={form.note} onChange={update("note")} rows={3} placeholder="Նշեք ցանկալի մոդելը կամ ձեզ հետաքրքրող հարցը" /></label>
        <label className={classNames("relative mt-1 grid cursor-pointer grid-cols-[23px_1fr] items-start gap-2 [&>input]:absolute [&>input]:top-0 [&>input]:left-0 [&>input]:m-0 [&>input]:h-[22px] [&>input]:w-[22px] [&>input]:opacity-0 [&>span]:grid [&>span]:h-[22px] [&>span]:w-[22px] [&>span]:place-items-center [&>span]:rounded-md [&>span]:border [&>span]:border-[var(--border)] [&>span]:text-transparent [&>input:checked+span]:border-[var(--yellow-hover)] [&>input:checked+span]:bg-[var(--yellow)] [&>input:checked+span]:text-[var(--ink)] [&>input:focus-visible+span]:outline-3 [&>input:focus-visible+span]:outline-offset-3 [&>input:focus-visible+span]:outline-[#7a5b00] [&>p]:mt-px [&>p]:mb-0 [&>p]:text-[11px] [&>p]:leading-[1.55] [&>p]:text-[var(--ink-soft)]", errors.consent && "[&>span]:!border-[#be3128]")}><input ref={consentRef} type="checkbox" checked={form.consent} onChange={update("consent")} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consult-consent-error" : undefined} /><span><Check size={14} weight="bold" /></span><p>Համաձայն եմ, որ Hovex Motors-ը կապվի ինձ հետ այս հարցման վերաբերյալ։</p></label>
        {errors.consent ? <p id="consult-consent-error" className="mt-1 mr-0 mb-0 ml-[31px] text-[11px] text-[#a51f18]" role="alert">{errors.consent}</p> : null}
        <Button className="mt-[17px] w-full" icon={status === "submitting" ? SpinnerGap : CalendarBlank} disabled={status === "submitting"}>{status === "submitting" ? "Պատրաստվում է…" : "Պատրաստել հարցումը"}</Button>
        <small className="mt-2.5 block text-center text-[10px] leading-[1.5] text-[var(--muted)]">Ընտրված ժամը վերջնական կհաստատվի մասնագետի հետ կապվելուց հետո։</small>
      </form>
    </Modal>
  );
}

function CompareBar({ count, onOpen, onClear }: CompareBarProps) {
  return <div data-compare-bar className="fixed bottom-[22px] left-1/2 z-[55] flex min-h-[63px] min-w-[440px] -translate-x-1/2 items-center gap-[15px] rounded-[15px] border border-[#3b3933] bg-[rgba(17,17,15,0.96)] py-2 pr-[9px] pl-[17px] text-white shadow-[0_18px_45px_rgba(0,0,0,0.26)] max-[800px]:bottom-[calc(77px_+_env(safe-area-inset-bottom))] max-[800px]:min-h-[57px] max-[800px]:w-[calc(100%_-_20px)] max-[800px]:min-w-0 max-[800px]:gap-[7px] max-[800px]:pl-3" role="group" aria-label="Մեքենաների համեմատում"><span className="flex flex-1 items-center gap-[7px] text-xs max-[800px]:text-[10px] [&_svg]:text-[var(--yellow)] max-[800px]:[&_svg]:hidden [&_strong]:text-[var(--yellow)]" aria-live="polite"><ArrowsLeftRight size={22} weight="bold" /><strong>{count}</strong> մեքենա ընտրված է</span><button className="cursor-pointer border-0 bg-transparent p-[9px] text-[11px] text-[#c6c2bb] max-[800px]:text-[10px]" type="button" onClick={onClear}>Մաքրել</button><Button className="min-h-[45px] px-4 text-[11px] max-[800px]:min-h-[41px] max-[800px]:px-3" onClick={onOpen}>Համեմատել</Button></div>;
}

export function App() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>(() => getVehicles());
  const [criteria, setCriteria] = useState<SearchCriteria>({ budget: "15000", yearFrom: "2020", yearTo: "2026", make: "all" });
  const [appliedCriteria, setAppliedCriteria] = useState<SearchCriteria>(criteria);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [compared, setCompared] = useState<string[]>([]);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [consultVehicleId, setConsultVehicleId] = useState<string | null | undefined>(undefined);
  const [compareOpen, setCompareOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [consultSource, setConsultSource] = useState<ConsultationSource>("website");
  const [notice, setNotice] = useState("");
  const searchTimerRef = useRef<number | undefined>(undefined);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const modalOpen = Boolean(detailVehicle) || consultVehicleId !== undefined || compareOpen;
  const vehicles = useMemo(() => allVehicles.filter((vehicle) => vehicle.status === "published"), [allVehicles]);
  const makes = useMemo(() => (
    [...new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "hy"))
  ), [vehicles]);

  useEffect(() => subscribeVehicles(setAllVehicles), []);

  useEffect(() => {
    document.body.classList.toggle("modal-open", modalOpen);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setDetailVehicle(null);
        setConsultVehicleId(undefined);
        setCompareOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => () => {
    window.clearTimeout(searchTimerRef.current);
    window.clearTimeout(noticeTimerRef.current);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("has-compare", compared.length > 0);
    return () => document.body.classList.remove("has-compare");
  }, [compared.length]);

  const results = useMemo(() => {
    const budget = Number(appliedCriteria.budget) || Number.POSITIVE_INFINITY;
    const yearFrom = Number(appliedCriteria.yearFrom);
    const yearTo = Number(appliedCriteria.yearTo);
    return vehicles.filter((vehicle) => {
      const inBudget = vehicle.estimateMax <= budget;
      const inYear = vehicle.year >= yearFrom && vehicle.year <= yearTo;
      const inMake = appliedCriteria.make === "all" || vehicle.make === appliedCriteria.make;
      return inBudget && inYear && inMake;
    });
  }, [appliedCriteria, vehicles]);

  const featuredVehicles = vehicles.filter((vehicle) => vehicle.featured);
  const displayedResults = searchState === "idle" ? (featuredVehicles.length ? featuredVehicles : vehicles.slice(0, 3)) : results;
  const comparedVehicles = vehicles.filter((vehicle) => compared.includes(vehicle.id));
  const selectedConsultVehicle = vehicles.find((vehicle) => vehicle.id === consultVehicleId) || null;

  const showNotice = (message: string): void => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const from = Number(criteria.yearFrom);
    const to = Number(criteria.yearTo);
    if (from > to) {
      showNotice("Սկզբնական տարեթիվը չի կարող մեծ լինել վերջնականից։");
      return;
    }
    setSearchState("loading");
    scrollToId("vehicles");
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setAppliedCriteria(criteria);
      setSearchState("searched");
    }, 650);
  };

  const resetFilters = () => {
    const defaults: SearchCriteria = { budget: "15000", yearFrom: "2020", yearTo: "2026", make: "all" };
    setCriteria(defaults);
    setAppliedCriteria(defaults);
    setSearchState("idle");
    window.setTimeout(() => scrollToId("finder"), 0);
  };

  const toggleCompare = (id: string): void => {
    setCompared((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        showNotice("Կարող եք համեմատել առավելագույնը 3 մեքենա։");
        return current;
      }
      return [...current, id];
    });
  };

  const removeCompareItem = (id: string): void => {
    setCompared((current) => {
      const next = current.filter((item) => item !== id);
      if (next.length === 0) setCompareOpen(false);
      return next;
    });
  };

  const openCompare = () => {
    if (compared.length < 2) {
      showNotice("Համեմատելու համար ընտրեք առնվազն 2 մեքենա։");
      return;
    }
    setCompareOpen(true);
  };

  const openConsultation: ConsultationHandler = (id, source = "website") => {
    setDetailVehicle(null);
    setCompareOpen(false);
    setAssistantOpen(false);
    setConsultSource(source);
    setConsultVehicleId(id ?? null);
  };

  const closeConsultation = () => {
    setConsultVehicleId(undefined);
    setConsultSource("website");
  };

  const openFinder = () => {
    setAssistantOpen(false);
    scrollToId("finder");
  };

  return (
    <>
      <Header onConsultation={openConsultation} />
      <main>
        <Hero onConsultation={openConsultation} />
        <Finder criteria={criteria} setCriteria={setCriteria} onSearch={handleSearch} isLoading={searchState === "loading"} makes={makes} />
        <CostStrip />
        <Results results={displayedResults} state={searchState} criteria={appliedCriteria} compared={compared} onCompare={toggleCompare} onDetails={setDetailVehicle} onConsultation={openConsultation} onReset={resetFilters} />
        <HowItWorks />
        <ConsultationBanner onConsultation={openConsultation} />
        <TransparencySection onConsultation={openConsultation} />
        <SocialProof />
        <Faq />
      </main>
      <Footer />
      <AiAssistant open={assistantOpen} onOpenChange={setAssistantOpen} vehicles={vehicles} criteria={criteria} compared={compared} onVehicleDetails={setDetailVehicle} onCompare={toggleCompare} onConsultation={(id) => openConsultation(id, "ai-assistant")} onOpenFinder={openFinder} />
      <div className="fixed right-0 bottom-0 left-0 z-50 hidden min-h-[calc(67px_+_env(safe-area-inset-bottom))] grid-cols-3 gap-2 border-t border-[var(--border)] bg-[rgba(255,255,255,0.97)] px-2.5 pt-2 pb-[calc(8px_+_env(safe-area-inset-bottom))] max-[800px]:grid [&_button]:flex [&_button]:min-w-0 [&_button]:items-center [&_button]:justify-center [&_button]:gap-[5px] [&_button]:rounded-[10px] [&_button]:border [&_button]:border-[var(--border)] [&_button]:bg-white [&_button]:text-[9px] [&_button]:font-bold [&_button]:whitespace-nowrap [&_button:first-child]:border-[var(--yellow)] [&_button:first-child]:bg-[var(--yellow)] [&_button:nth-child(2)]:border-[var(--ink)] [&_button:nth-child(2)]:bg-[var(--ink)] [&_button:nth-child(2)]:text-white"><button type="button" onClick={openFinder}><MagnifyingGlass size={19} weight="bold" />Գտնել մեքենա</button><button type="button" onClick={() => setAssistantOpen(true)} aria-expanded={assistantOpen} aria-controls="hovex-ai-panel"><Sparkle size={19} weight="fill" />AI օգնական</button><button type="button" onClick={() => openConsultation(null)}><ChatCircleText size={19} weight="bold" />Խորհրդատվություն</button></div>
      {compared.length ? <CompareBar count={compared.length} onOpen={openCompare} onClear={() => setCompared([])} /> : null}
      {notice ? <div className="fixed top-[98px] left-1/2 z-[130] flex w-[min(480px,calc(100%_-_32px))] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border border-[#efd1ad] bg-[#fff7ee] px-4 py-[13px] text-xs font-bold text-[#884800] shadow-[var(--shadow-sm)]" role="alert"><WarningCircle size={20} weight="fill" />{notice}</div> : null}
      {detailVehicle ? <VehicleDetails vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} onConsultation={openConsultation} isCompared={compared.includes(detailVehicle.id)} onCompare={toggleCompare} /> : null}
      {compareOpen ? <CompareModal items={comparedVehicles} onClose={() => setCompareOpen(false)} onRemove={removeCompareItem} onConsultation={openConsultation} /> : null}
      {consultVehicleId !== undefined ? <ConsultationModal selectedVehicle={selectedConsultVehicle} onClose={closeConsultation} source={consultSource} /> : null}
    </>
  );
}
