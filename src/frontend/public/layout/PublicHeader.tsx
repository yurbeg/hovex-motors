import { useEffect, useState } from "react";
import { CalendarBlank, ListMagnifyingGlass, Phone, X } from "@phosphor-icons/react";
import { ThemeToggle } from "../../theme/ThemeToggle";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { navButtonClasses, pageShellClasses } from "../shared/styles";
import { classNames, phoneDisplay, phoneHref, scrollToId } from "../shared/utils";

interface PublicHeaderProps {
  onConsultation: ConsultationHandler;
  page?: "home" | "vehicle" | "catalog";
}

export function PublicHeader({ onConsultation, page = "home" }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navTo = (id: string): void => {
    setMenuOpen(false);
    scrollToId(id);
  };

  useEffect(() => {
    const updateScrolledState = (): void => setScrolled(window.scrollY > 12);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={classNames("sticky top-0 z-40 h-20 border-b bg-[var(--surface-translucent)] backdrop-blur-[14px] transition-[border-color,box-shadow,background-color] duration-300 ease-out motion-reduce:transition-none max-[1080px]:h-[72px] max-[800px]:h-16", scrolled ? "border-[var(--border-strong)] shadow-[0_10px_32px_rgba(17,17,15,0.1)]" : "border-[var(--border)] shadow-none")} data-header-scrolled={scrolled || undefined}>
      <div className={classNames(pageShellClasses, "grid h-full grid-cols-[82px_1fr_auto] items-center gap-7 max-[1240px]:grid-cols-[72px_1fr_auto] max-[1240px]:gap-[18px] max-[1080px]:grid-cols-[64px_auto_1fr] max-[800px]:grid-cols-[54px_auto_1fr] max-[800px]:gap-2.5")}>
        <a className="h-[62px] w-[62px] overflow-hidden rounded-[11px] bg-[#050505] shadow-[0_6px_18px_rgba(17,17,15,0.14)] transition-transform duration-300 ease-out hover:scale-[1.035] motion-reduce:transition-none max-[1080px]:h-[54px] max-[1080px]:w-[54px] max-[800px]:h-12 max-[800px]:w-12 max-[800px]:rounded-lg" href="/" aria-label="Hovex Motors — գլխավոր էջ">
          <img className="h-full w-full object-contain" src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" />
        </a>
        <button
          className="hidden h-11 w-11 cursor-pointer place-items-center rounded-[11px] border border-[var(--border)] bg-[var(--surface)] max-[1080px]:grid max-[800px]:h-[42px] max-[800px]:w-[42px]"
          type="button"
          aria-label={menuOpen ? "Փակել ընտրացանկը" : "Բացել ընտրացանկը"}
          aria-expanded={menuOpen}
          aria-controls="public-main-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={24} weight="bold" /> : <ListMagnifyingGlass size={25} weight="bold" />}
        </button>
        <nav className={classNames("flex items-center justify-center gap-[clamp(18px,2.3vw,38px)] max-[1240px]:gap-4 max-[1080px]:absolute max-[1080px]:top-[72px] max-[1080px]:right-[22px] max-[1080px]:left-[22px] max-[1080px]:flex-col max-[1080px]:items-stretch max-[1080px]:gap-0 max-[1080px]:rounded-[15px] max-[1080px]:border max-[1080px]:border-[var(--border)] max-[1080px]:bg-[var(--surface)] max-[1080px]:p-4 max-[1080px]:shadow-[var(--shadow-lg)] max-[800px]:top-16 max-[800px]:right-3.5 max-[800px]:left-3.5", menuOpen ? "max-[1080px]:flex" : "max-[1080px]:hidden")} id="public-main-navigation" aria-label="Հիմնական ընտրացանկ">
          {page !== "home" ? <a className={navButtonClasses} href="/" onClick={() => setMenuOpen(false)}>Գլխավոր</a> : null}
          {page === "home" ? <button className={navButtonClasses} type="button" onClick={() => navTo("finder")}>Մեքենա գտնել</button> : <a className={navButtonClasses} href="/#finder" onClick={() => setMenuOpen(false)}>Մեքենա գտնել</a>}
          {page === "home" ? <button className={navButtonClasses} type="button" onClick={() => navTo("how-it-works")}>Ինչպես է աշխատում</button> : null}
          <a className={navButtonClasses} href="/catalog" aria-current={page === "catalog" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Կատալոգ</a>
          {page === "home" ? <button className={navButtonClasses} type="button" onClick={() => navTo("faq")}>Հաճախ տրվող հարցեր</button> : <a className={navButtonClasses} href="/#faq" onClick={() => setMenuOpen(false)}>Հաճախ տրվող հարցեր</a>}
        </nav>
        <div className="flex items-center gap-3 max-[1080px]:justify-self-end">
          <ThemeToggle className="shrink-0" />
          <a className="flex min-h-11 items-center gap-2 px-2.5 text-sm font-bold whitespace-nowrap max-[800px]:h-[42px] max-[800px]:w-[42px] max-[800px]:justify-center max-[800px]:rounded-full max-[800px]:border max-[800px]:border-[var(--border)] max-[800px]:p-0" href={`tel:${phoneHref}`} aria-label={`Զանգահարել Hovex Motors՝ ${phoneDisplay}`}>
            <Phone size={19} weight="fill" aria-hidden="true" />
            <span className="max-[1240px]:hidden">{phoneDisplay}</span>
          </a>
          <Button className="min-h-[45px] px-4 text-[13px] max-[800px]:hidden" icon={page === "catalog" ? Phone : CalendarBlank} onClick={() => onConsultation(null)}>
            {page === "catalog" ? "Զանգահարել մասնագետին" : "Անվճար խորհրդատվություն"}
          </Button>
        </div>
      </div>
    </header>
  );
}
