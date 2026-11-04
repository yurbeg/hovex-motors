import { useEffect, useMemo, useRef, useState } from "react";
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
  SpinnerGap,
  SteeringWheel,
  Truck,
  WarningCircle,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { faqs, makeOptions, priceSteps, vehicles } from "./data.js";

const phoneDisplay = "033 344 366";
const phoneHref = "+37433344366";

const processSteps = [
  { title: "Նշեք պահանջները", text: "Բյուջե, տարեթիվ և ցանկալի մակնիշ", icon: ListMagnifyingGlass },
  { title: "Ընտրեք տարբերակը", text: "Համեմատեք մեքենաներն ու նախնական արժեքները", icon: Car },
  { title: "Ստուգեք մասնագետի հետ", text: "Ճշտեք պատմությունը, վնասվածքն ու անվտանգ խաղադրույքը", icon: ShieldCheck },
  { title: "Ստացեք Հայաստանում", text: "Hovex-ը ուղեկցում է գնումից մինչև հանձնում", icon: Handshake },
];

const costIcons = [CurrencyDollar, Gavel, Truck, Boat, ShieldCheck, GearSix];

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Button({ children, variant = "primary", className = "", icon: Icon, ...props }) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} {...props}>
      {Icon ? <Icon size={20} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

function Header({ onConsultation }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navTo = (id) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner page-shell">
        <a className="brand" href="#top" aria-label="Hovex Motors — գլխավոր էջ">
          <img src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" />
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Փակել ընտրացանկը" : "Բացել ընտրացանկը"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={24} weight="bold" /> : <ListMagnifyingGlass size={25} weight="bold" />}
        </button>
        <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="Հիմնական ընտրացանկ">
          <button type="button" onClick={() => navTo("finder")}>Մեքենա գտնել</button>
          <button type="button" onClick={() => navTo("how-it-works")}>Ինչպես է աշխատում</button>
          <button type="button" onClick={() => navTo("vehicles")}>Տարբերակներ</button>
          <button type="button" onClick={() => navTo("faq")}>Հաճախ տրվող հարցեր</button>
        </nav>
        <div className="header-actions">
          <a className="header-phone" href={`tel:${phoneHref}`}>
            <Phone size={19} weight="fill" aria-hidden="true" />
            <span>{phoneDisplay}</span>
          </a>
          <Button className="header-cta" icon={CalendarBlank} onClick={() => onConsultation(null)}>
            Անվճար խորհրդատվություն
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onConsultation }) {
  return (
    <section className="hero" id="top">
      <div className="hero__inner page-shell">
        <div className="hero__copy">
          <p className="eyebrow"><span />ԱՄՆ և Չինաստան • ամբողջական ուղեկցում</p>
          <h1>Գտեք մեքենա՝ <mark>ձեր իրական բյուջեի սահմաններում</mark></h1>
          <p className="hero__description">
            Նշեք բյուջեն, տարեթիվը և ցանկալի մակնիշը․ մենք կցուցադրենք համապատասխան տարբերակներ և Հայաստան հասցնելու նախնական արժեքը։
          </p>
          <div className="hero__actions">
            <Button icon={MagnifyingGlass} onClick={() => scrollToId("finder")}>Սկսել որոնումը</Button>
            <Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Խոսել մասնագետի հետ</Button>
          </div>
          <div className="hero__trust" aria-label="Ծառայության առավելություններ">
            <span><CheckCircle size={18} weight="fill" /> Թափանցիկ հաշվարկ</span>
            <span><CheckCircle size={18} weight="fill" /> Առանց պարտադիր գրանցման</span>
          </div>
        </div>
        <div className="hero__media" aria-label="Hovex Motors-ի իրական հրապարակումներից">
          <img className="hero__media-main" src="/assets/hovex/presenter-import-made-easy.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների կողքին" />
          <img className="hero__media-side" src="/assets/hovex/hongqi-ehs9.jpg" alt="Hovex Motors-ի ներկայացրած Hongqi մեքենան" />
          <div className="hero__media-note">
            <ShieldCheck size={22} weight="fill" aria-hidden="true" />
            <span><strong>Անհատական ընտրություն</strong> ըստ ձեր բյուջեի</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Finder({ criteria, setCriteria, onSearch, isLoading }) {
  const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
  const update = (key) => (event) => setCriteria((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="finder-section page-shell" id="finder" aria-labelledby="finder-title">
      <form className="finder-card" onSubmit={onSearch}>
        <div className="finder-card__heading">
          <span className="finder-card__icon"><SteeringWheel size={24} weight="bold" /></span>
          <div><p>Անվճար որոնում</p><h2 id="finder-title">Սկսենք ձեր բյուջեից</h2></div>
        </div>
        <label className="form-field finder-budget">
          <span>Ընդհանուր բյուջե Հայաստանում</span>
          <span className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input type="number" min="6000" step="500" inputMode="numeric" value={criteria.budget} onChange={update("budget")} aria-describedby="budget-help" disabled={isLoading} required />
          </span>
          <small id="budget-help">Ներառյալ գնումը, առաքումն ու ծառայությունը</small>
        </label>
        <div className="form-field finder-years">
          <span>Տարեթիվ</span>
          <div className="year-range">
            <label><span className="sr-only">Տարեթիվ՝ սկսած</span><select value={criteria.yearFrom} onChange={update("yearFrom")} disabled={isLoading}>{years.slice().reverse().map((year) => <option key={year}>{year}</option>)}</select></label>
            <span>—</span>
            <label><span className="sr-only">Տարեթիվ՝ մինչև</span><select value={criteria.yearTo} onChange={update("yearTo")} disabled={isLoading}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
          </div>
          <small>Ընտրեք ցանկալի միջակայքը</small>
        </div>
        <label className="form-field finder-make">
          <span>Մակնիշ կամ մոդել</span>
          <select value={criteria.make} onChange={update("make")} disabled={isLoading}>
            <option value="all">Բոլոր մակնիշները</option>
            {makeOptions.slice(1).map((make) => <option key={make} value={make}>{make}</option>)}
          </select>
          <small>Դաշտը պարտադիր չէ</small>
        </label>
        <Button className="finder-submit" icon={isLoading ? SpinnerGap : MagnifyingGlass} disabled={isLoading}>
          {isLoading ? "Փնտրում ենք…" : "Գտնել մեքենաներ"}
        </Button>
      </form>
    </section>
  );
}

function CostStrip() {
  return (
    <section className="cost-strip page-shell" aria-label="Նախնական արժեքի բաղադրիչները">
      <div className="cost-strip__intro"><Coins size={25} weight="bold" /><span><strong>Թափանցիկ հաշվարկ</strong><small>Մեկ ընդհանուր բյուջե</small></span></div>
      <div className="cost-strip__items">
        {priceSteps.map((step, index) => {
          const Icon = costIcons[index];
          return <span key={step}><Icon size={21} weight="bold" />{step}</span>;
        })}
      </div>
    </section>
  );
}

function VehicleCard({ vehicle, isCompared, onCompare, onDetails, onConsultation }) {
  return (
    <article className="vehicle-card">
      <div className="vehicle-card__media">
        <img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} />
        <span className={`vehicle-badge vehicle-badge--${vehicle.accent}`}>{vehicle.badge}</span>
        <span className="demo-label">ԴԵՄՈ</span>
        <button type="button" className={`compare-toggle ${isCompared ? "compare-toggle--active" : ""}`} aria-pressed={isCompared} onClick={() => onCompare(vehicle.id)}>
          {isCompared ? <Check size={17} weight="bold" /> : <ArrowsLeftRight size={17} weight="bold" />}
          {isCompared ? "Ընտրված է" : "Համեմատել"}
        </button>
      </div>
      <div className="vehicle-card__body">
        <div className="vehicle-card__title-row">
          <div><p>{vehicle.year} • {vehicle.body}</p><h3>{vehicle.make} {vehicle.model}</h3></div>
          <span className="fuel-pill"><GasPump size={16} weight="fill" />{vehicle.fuel}</span>
        </div>
        <div className="vehicle-specs">
          <span><Gauge size={18} />{vehicle.mileage}</span>
          <span><WarningCircle size={18} />{vehicle.damage}</span>
        </div>
        <div className="vehicle-price">
          <p>Հայաստան հասցնելու նախնական արժեք</p>
          <strong>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong>
          <small>Վերջնական հաշվարկը հաստատում է մասնագետը</small>
        </div>
        <div className="vehicle-card__footer">
          <button type="button" className="text-button" onClick={() => onDetails(vehicle)}>Մանրամասներ <ArrowRight size={17} weight="bold" /></button>
          <Button variant="secondary" onClick={() => onConsultation(vehicle.id)}>Խորհրդակցել</Button>
        </div>
      </div>
    </article>
  );
}

function Results({ results, state, criteria, compared, onCompare, onDetails, onConsultation, onReset }) {
  if (state === "loading") {
    return (
      <section className="vehicles-section page-shell" id="vehicles" aria-live="polite">
        <div className="section-heading"><div><p className="eyebrow"><span />Անհատական որոնում</p><h2>Փնտրում ենք համապատասխան տարբերակները…</h2></div></div>
        <div className="vehicle-grid">{[0, 1, 2].map((item) => <div className="vehicle-skeleton" key={item}><span /><i /><i /><i /></div>)}</div>
      </section>
    );
  }

  return (
    <section className="vehicles-section page-shell" id="vehicles" aria-live="polite">
      <div className="section-heading section-heading--results">
        <div>
          <p className="eyebrow"><span />Ընտրված Hovex-ի մոտեցմամբ</p>
          <h2>{state === "searched" ? "Ձեզ համապատասխան տարբերակներ" : "Սկսելու հնարավոր տարբերակներ"}</h2>
          <p>{state === "searched" ? `${results.length} ցուցադրական տարբերակ • մինչև ${formatUsd(Number(criteria.budget || 0))}` : "Մեքենաները և արժեքները ցուցադրական են՝ որոնման փորձը ներկայացնելու համար։"}</p>
        </div>
        <span className="estimate-note"><WarningCircle size={18} weight="fill" /> Ոչ հրապարակային առաջարկ</span>
      </div>
      {results.length ? (
        <div className="vehicle-grid">
          {results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} isCompared={compared.includes(vehicle.id)} onCompare={onCompare} onDetails={onDetails} onConsultation={onConsultation} />)}
        </div>
      ) : (
        <div className="empty-state">
          <span><MagnifyingGlass size={33} weight="bold" /></span>
          <h3>Այս չափանիշներով տարբերակ չգտանք</h3>
          <p>Փորձեք մեծացնել բյուջեն, փոխել տարեթիվը կամ ուղարկել անհատական հարցում։</p>
          <div><Button icon={ArrowCounterClockwise} onClick={onReset}>Վերականգնել ֆիլտրերը</Button><Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Անհատական հարցում</Button></div>
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="process-section" id="how-it-works">
      <div className="page-shell">
        <div className="section-heading section-heading--center"><p className="eyebrow"><span />Պարզ ընթացք</p><h2>Ինչպես է աշխատում ներմուծումը</h2><p>Մեկ մասնագետ, մեկ թափանցիկ հաշվարկ և հստակ հաջորդ քայլ յուրաքանչյուր փուլում։</p></div>
        <div className="process-grid">
          {processSteps.map(({ title, text, icon: Icon }, index) => (
            <article className="process-card" key={title}><div className="process-card__top"><span>{index + 1}</span><Icon size={29} weight="bold" /></div><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsultationBanner({ onConsultation }) {
  return (
    <section className="consultation-banner page-shell" aria-labelledby="consultation-title">
      <div className="consultation-banner__media"><img src="/assets/hovex/presenter-vehicle-choice.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների ցուցասրահում" /></div>
      <div className="consultation-banner__copy">
        <p className="eyebrow"><span />Իրական մարդ, հստակ պատասխաններ</p>
        <h2 id="consultation-title">Որոշումը կայացրեք Hovex-ի մասնագետի հետ</h2>
        <p>Քննարկեք ձեր բյուջեն, մեքենայի պատմությունը և ներմուծման ամբողջական հաշվարկը՝ մինչև որևէ պարտավորություն ստանձնելը։</p>
        <span className="availability"><i /> Հայտերը մշակվում են աշխատանքային ժամերին</span>
      </div>
      <div className="consultation-banner__action">
        <Button icon={CalendarBlank} onClick={() => onConsultation(null)}>Ամրագրել խորհրդատվություն</Button>
        <a href={`tel:${phoneHref}`}><Phone size={19} weight="fill" />{phoneDisplay}</a>
      </div>
    </section>
  );
}

function TransparencySection({ onConsultation }) {
  const breakdown = [
    ["Գնման սցենար", "ըստ անվտանգ առավելագույն խաղադրույքի"],
    ["Աճուրդային և բանկային վճարներ", "առանձին տեսանելի տողով"],
    ["Փոխադրում և մաքսազերծում", "երթուղուն համապատասխան հաշվարկով"],
  ];
  return (
    <section className="transparency-section">
      <div className="transparency-section__inner page-shell">
        <div className="transparency-section__copy"><p className="eyebrow eyebrow--light"><span />Թափանցիկ արժեք</p><h2>Իմացեք՝ որտեղից է ձևավորվում վերջնական բյուջեն</h2><p>Մենք ցույց ենք տալիս ոչ միայն մեքենայի գնման գինը, այլ նաև աճուրդի, տեղափոխման, մաքսազերծման և ծառայության նախնական ծախսերը։</p><Button variant="light" icon={ChatCircleText} onClick={() => onConsultation(null)}>Ստանալ անհատական հաշվարկ</Button></div>
        <div className="breakdown-list">
          {breakdown.map(([title, text], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><p><strong>{title}</strong><small>{text}</small></p><CheckCircle size={23} weight="fill" /></div>)}
          <p className="breakdown-disclaimer"><WarningCircle size={18} weight="fill" /> Վերանորոգումը ներառվում է միայն առանձին գնահատման դեպքում։</p>
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
    <section className="social-section page-shell">
      <div className="section-heading section-heading--social"><div><p className="eyebrow"><span />@hovex_motors</p><h2>Ծանոթացեք մեքենաներին Hovex-ի իրական նյութերով</h2></div><a href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={21} weight="bold" /> Դիտել Instagram-ում</a></div>
      <div className="social-grid">{images.map(([src, alt]) => <img key={src} src={src} alt={alt} />)}</div>
    </section>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="faq-section page-shell" id="faq">
      <div className="faq-section__heading"><p className="eyebrow"><span />Պարզ պատասխաններ</p><h2>Հաճախ տրվող հարցեր</h2><p>Չգտա՞ք ձեր հարցի պատասխանը։ Զանգահարեք մեզ կամ ամրագրեք անվճար խորհրդատվություն։</p><a href={`tel:${phoneHref}`}><Phone size={19} weight="fill" />{phoneDisplay}</a></div>
      <div className="faq-list">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return <article className={`faq-item ${isOpen ? "faq-item--open" : ""}`} key={item.question}><button type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? -1 : index)}><span>{item.question}</span>{isOpen ? <CaretUp size={21} weight="bold" /> : <CaretDown size={21} weight="bold" />}</button>{isOpen ? <p>{item.answer}</p> : null}</article>;
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top page-shell">
        <div className="footer-brand"><img src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" /><p>Մեքենաների ընտրություն և ներմուծում ԱՄՆ-ից ու Չինաստանից՝ թափանցիկ հաշվարկով և մասնագետի աջակցությամբ։</p></div>
        <div><h3>Կապ</h3><a href={`tel:${phoneHref}`}><Phone size={18} />{phoneDisplay}</a><a href="https://wa.me/37433344366" target="_blank" rel="noreferrer"><WhatsappLogo size={18} />WhatsApp</a><a href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={18} />Instagram</a></div>
        <div><h3>Այցելեք մեզ</h3><p><MapPin size={18} />Երևան, Էրեբունի<br />Ազատամարտիկների 68/1</p><p><Clock size={18} />Աշխատանքային ժամերը ճշտեք զանգով</p></div>
        <div><h3>Արագ հղումներ</h3><button type="button" onClick={() => scrollToId("finder")}>Մեքենա գտնել</button><button type="button" onClick={() => scrollToId("how-it-works")}>Ինչպես է աշխատում</button><button type="button" onClick={() => scrollToId("faq")}>Հաճախ տրվող հարցեր</button></div>
      </div>
      <div className="site-footer__bottom page-shell"><span>© {new Date().getFullYear()} Hovex Motors</span><p>Կայքի բոլոր մեքենաներն ու գները ցուցադրական են և չեն հանդիսանում հրապարակային առաջարկ։</p></div>
    </footer>
  );
}

function Modal({ title, children, onClose, size = "medium" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = dialog ? Array.from(dialog.querySelectorAll(focusableSelector)) : [];
    (dialog?.querySelector("[autofocus]") || focusable[0] || dialog)?.focus();

    const trapFocus = (event) => {
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll(focusableSelector));
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
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex="-1" className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="active-modal-title">
        <div className="modal__header"><h2 id="active-modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Փակել"><X size={23} weight="bold" /></button></div>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}

function VehicleDetails({ vehicle, onClose, onConsultation, isCompared, onCompare }) {
  const base = vehicle.estimateMin;
  const breakdown = [
    ["Մեքենայի գնման սցենար", base * 0.46],
    ["Աճուրդի վճարներ", base * 0.08],
    ["ԱՄՆ տեղափոխում", base * 0.05],
    ["Ծովային առաքում", base * 0.13],
    ["Մաքսային գնահատում", base * 0.21],
    ["Hovex ծառայություն", base * 0.07],
  ];
  return (
    <Modal title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose} size="large">
      <div className="detail-layout">
        <div className="detail-image"><img src={vehicle.image} alt={`${vehicle.make} ${vehicle.model}`} style={{ objectPosition: vehicle.imagePosition }} /><span>ԴԵՄՈ ՏԱՐԲԵՐԱԿ</span></div>
        <div className="detail-summary">
          <p className="detail-kicker">{vehicle.auction}</p><h3>{vehicle.badge}</h3>
          <div className="detail-facts">
            <span><Gauge size={19} /><small>Վազք</small><strong>{vehicle.mileage}</strong></span>
            <span><GasPump size={19} /><small>Վառելիք</small><strong>{vehicle.fuel}</strong></span>
            <span><Car size={19} /><small>Թափք</small><strong>{vehicle.body}</strong></span>
            <span><WarningCircle size={19} /><small>Վիճակ</small><strong>{vehicle.damage}</strong></span>
          </div>
          <div className="detail-price"><p>Հայաստան հասցնելու նախնական արժեք</p><strong>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong><span>Առաջարկվող առավելագույն խաղադրույք՝ <b>{formatUsd(vehicle.maxBid)}</b></span></div>
          <div className="detail-actions"><Button onClick={() => onConsultation(vehicle.id)} icon={ChatCircleText}>Խորհրդակցել այս մեքենայի շուրջ</Button><Button variant="ghost" onClick={() => onCompare(vehicle.id)} icon={isCompared ? Check : ArrowsLeftRight}>{isCompared ? "Համեմատման մեջ է" : "Ավելացնել համեմատման"}</Button></div>
        </div>
      </div>
      <div className="detail-breakdown">
        <div><h3>Ինչպես է ձևավորվում արժեքը</h3><p>Ցուցադրական հաշվարկ՝ կառուցվածքը ներկայացնելու համար։</p></div>
        <div className="detail-breakdown__rows">{breakdown.map(([label, amount]) => <p key={label}><span>{label}</span><strong>մոտ {formatUsd(Math.round(amount / 50) * 50)}</strong></p>)}</div>
        <p className="detail-disclaimer"><WarningCircle size={18} weight="fill" /> Վերանորոգման և հաշվառման ծախսերը ներառված չեն։ Վերջնական արժեքը հաստատվում է միայն կոնկրետ լոտի ստուգումից հետո։</p>
      </div>
    </Modal>
  );
}

function CompareModal({ items, onClose, onRemove, onConsultation }) {
  return (
    <Modal title="Համեմատել ընտրված մեքենաները" onClose={onClose} size="large">
      <div className="compare-grid">
        {items.map((vehicle) => (
          <article className="compare-card" key={vehicle.id}>
            <button type="button" onClick={() => onRemove(vehicle.id)} aria-label={`${vehicle.make} ${vehicle.model}-ը հեռացնել`}><X size={17} weight="bold" /></button>
            <img src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} />
            <p>{vehicle.year}</p><h3>{vehicle.make} {vehicle.model}</h3>
            <dl><div><dt>Նախնական արժեք</dt><dd>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</dd></div><div><dt>Վազք</dt><dd>{vehicle.mileage}</dd></div><div><dt>Վառելիք</dt><dd>{vehicle.fuel}</dd></div><div><dt>Վնասվածք</dt><dd>{vehicle.damage}</dd></div><div><dt>Առավելագույն խաղադրույք</dt><dd>{formatUsd(vehicle.maxBid)}</dd></div></dl>
            <Button variant="secondary" onClick={() => onConsultation(vehicle.id)}>Ընտրել</Button>
          </article>
        ))}
      </div>
      <p className="compare-disclaimer"><WarningCircle size={18} weight="fill" /> Համեմատությունը ցուցադրական է։ Մասնագետը կստուգի լոտի փաստացի տվյալները մինչև վերջնական որոշումը։</p>
    </Modal>
  );
}

function ConsultationModal({ selectedVehicle, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", method: "Հեռախոսազանգ", date: "", time: "10:00–13:00", note: "", consent: false });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const timerRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const consentRef = useRef(null);
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

  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
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
    setStatus("submitting");
    timerRef.current = window.setTimeout(() => setStatus("success"), 700);
  };

  if (status === "success") {
    return (
      <Modal title="Հարցումը պատրաստ է" onClose={onClose}>
        <div className="success-state">
          <span><CheckCircle size={44} weight="fill" /></span>
          <h3>Շնորհակալություն, {form.name}</h3>
          <p>Ուղարկեք պատրաստված հարցումը WhatsApp-ով կամ զանգահարեք Hovex Motors-ին։ Հաղորդագրությունը չի ուղարկվի առանց ձեր հաստատման։</p>
          <div><strong>Կապի եղանակ</strong><span>{form.method}</span></div>
          {selectedVehicle ? <div><strong>Ընտրված մեքենա</strong><span>{selectedVehicleText}</span></div> : null}
          <a className="button button--primary" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="bold" /><span>Ուղարկել WhatsApp-ով</span></a>
          <a className="success-call" href={`tel:${phoneHref}`}><Phone size={18} weight="fill" /> Զանգահարել {phoneDisplay}</a>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Ամրագրել անվճար խորհրդատվություն" onClose={onClose}>
      <form className="consultation-form" onSubmit={submit} noValidate>
        <p className="consultation-form__intro">Թողեք ձեր տվյալները, և Hovex Motors-ի մասնագետը կօգնի ճշտել մեքենան ու ամբողջական հաշվարկը։</p>
        {selectedVehicle ? <div className="selected-vehicle-chip"><Car size={21} weight="fill" /><span><small>Ընտրված տարբերակ</small><strong>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong></span></div> : null}
        <div className="form-row">
          <label className={`form-field ${errors.name ? "form-field--error" : ""}`}><span>Անուն *</span><input ref={nameRef} autoFocus value={form.name} onChange={update("name")} placeholder="Ինչպե՞ս դիմենք ձեզ" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "consult-name-error" : undefined} />{errors.name ? <small id="consult-name-error" role="alert">{errors.name}</small> : null}</label>
          <label className={`form-field ${errors.phone ? "form-field--error" : ""}`}><span>Հեռախոսահամար *</span><input ref={phoneRef} value={form.phone} onChange={update("phone")} placeholder="+374 __ ___ ___" inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "consult-phone-error" : undefined} />{errors.phone ? <small id="consult-phone-error" role="alert">{errors.phone}</small> : null}</label>
        </div>
        <label className="form-field"><span>Կապի նախընտրելի եղանակ</span><select value={form.method} onChange={update("method")}><option>Հեռախոսազանգ</option><option>WhatsApp</option><option>Տեսազանգ</option><option>Այցելություն սրահ</option></select></label>
        <div className="form-row">
          <label className="form-field"><span>Նախընտրելի օր</span><input type="date" min={today} value={form.date} onChange={update("date")} /></label>
          <label className="form-field"><span>Նախընտրելի ժամ</span><select value={form.time} onChange={update("time")}><option>10:00–13:00</option><option>13:00–16:00</option><option>16:00–19:00</option></select></label>
        </div>
        <label className="form-field"><span>Մեկնաբանություն</span><textarea value={form.note} onChange={update("note")} rows="3" placeholder="Նշեք ցանկալի մոդելը կամ ձեզ հետաքրքրող հարցը" /></label>
        <label className={`consent ${errors.consent ? "consent--error" : ""}`}><input ref={consentRef} type="checkbox" checked={form.consent} onChange={update("consent")} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consult-consent-error" : undefined} /><span><Check size={14} weight="bold" /></span><p>Համաձայն եմ, որ Hovex Motors-ը կապվի ինձ հետ այս հարցման վերաբերյալ։</p></label>
        {errors.consent ? <p id="consult-consent-error" className="consent-error" role="alert">{errors.consent}</p> : null}
        <Button className="consultation-submit" icon={status === "submitting" ? SpinnerGap : CalendarBlank} disabled={status === "submitting"}>{status === "submitting" ? "Պատրաստվում է…" : "Պատրաստել հարցումը"}</Button>
        <small className="form-footnote">Ընտրված ժամը վերջնական կհաստատվի մասնագետի հետ կապվելուց հետո։</small>
      </form>
    </Modal>
  );
}

function CompareBar({ count, onOpen, onClear }) {
  return <div className="compare-bar" role="group" aria-label="Մեքենաների համեմատում"><span aria-live="polite"><ArrowsLeftRight size={22} weight="bold" /><strong>{count}</strong> մեքենա ընտրված է</span><button type="button" onClick={onClear}>Մաքրել</button><Button onClick={onOpen}>Համեմատել</Button></div>;
}

export function App() {
  const [criteria, setCriteria] = useState({ budget: "15000", yearFrom: "2020", yearTo: "2026", make: "all" });
  const [appliedCriteria, setAppliedCriteria] = useState(criteria);
  const [searchState, setSearchState] = useState("idle");
  const [compared, setCompared] = useState([]);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [consultVehicleId, setConsultVehicleId] = useState(undefined);
  const [compareOpen, setCompareOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const searchTimerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const modalOpen = Boolean(detailVehicle) || consultVehicleId !== undefined || compareOpen;

  useEffect(() => {
    document.body.classList.toggle("modal-open", modalOpen);
    const onKeyDown = (event) => {
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
  }, [appliedCriteria]);

  const featuredIds = ["hyundai-elantra-2023", "deepal-sl03-2025", "deepal-s05-2026"];
  const displayedResults = searchState === "idle" ? vehicles.filter((vehicle) => featuredIds.includes(vehicle.id)) : results;
  const comparedVehicles = vehicles.filter((vehicle) => compared.includes(vehicle.id));
  const selectedConsultVehicle = vehicles.find((vehicle) => vehicle.id === consultVehicleId) || null;

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const handleSearch = (event) => {
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
    const defaults = { budget: "15000", yearFrom: "2020", yearTo: "2026", make: "all" };
    setCriteria(defaults);
    setAppliedCriteria(defaults);
    setSearchState("idle");
    window.setTimeout(() => scrollToId("finder"), 0);
  };

  const toggleCompare = (id) => {
    setCompared((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        showNotice("Կարող եք համեմատել առավելագույնը 3 մեքենա։");
        return current;
      }
      return [...current, id];
    });
  };

  const removeCompareItem = (id) => {
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

  const openConsultation = (id) => {
    setDetailVehicle(null);
    setCompareOpen(false);
    setConsultVehicleId(id ?? null);
  };

  return (
    <>
      <Header onConsultation={openConsultation} />
      <main>
        <Hero onConsultation={openConsultation} />
        <Finder criteria={criteria} setCriteria={setCriteria} onSearch={handleSearch} isLoading={searchState === "loading"} />
        <CostStrip />
        <Results results={displayedResults} state={searchState} criteria={appliedCriteria} compared={compared} onCompare={toggleCompare} onDetails={setDetailVehicle} onConsultation={openConsultation} onReset={resetFilters} />
        <HowItWorks />
        <ConsultationBanner onConsultation={openConsultation} />
        <TransparencySection onConsultation={openConsultation} />
        <SocialProof />
        <Faq />
      </main>
      <Footer />
      <div className="mobile-actions"><button type="button" onClick={() => scrollToId("finder")}><MagnifyingGlass size={19} weight="bold" />Գտնել մեքենա</button><button type="button" onClick={() => openConsultation(null)}><ChatCircleText size={19} weight="bold" />Խորհրդատվություն</button></div>
      {compared.length ? <CompareBar count={compared.length} onOpen={openCompare} onClear={() => setCompared([])} /> : null}
      {notice ? <div className="toast" role="alert"><WarningCircle size={20} weight="fill" />{notice}</div> : null}
      {detailVehicle ? <VehicleDetails vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} onConsultation={openConsultation} isCompared={compared.includes(detailVehicle.id)} onCompare={toggleCompare} /> : null}
      {compareOpen ? <CompareModal items={comparedVehicles} onClose={() => setCompareOpen(false)} onRemove={removeCompareItem} onConsultation={openConsultation} /> : null}
      {consultVehicleId !== undefined ? <ConsultationModal selectedVehicle={selectedConsultVehicle} onClose={() => setConsultVehicleId(undefined)} /> : null}
    </>
  );
}
