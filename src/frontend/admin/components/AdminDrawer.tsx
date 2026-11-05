import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { classNames } from "../shared/classNames";

interface AdminDrawerProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  locked?: boolean;
}

export function AdminDrawer({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
  locked = false,
}: AdminDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const lockedRef = useRef(locked);
  const generatedTitleId = useId();
  const titleId = `admin-drawer-${generatedTitleId.replace(/:/g, "")}`;
  closeRef.current = onClose;
  lockedRef.current = locked;

  useEffect(() => {
    const previousFocus = document.activeElement;
    document.body.classList.add("overflow-hidden");
    const overlay = overlayRef.current;
    const drawer = drawerRef.current;
    const backgroundElements = overlay?.parentElement
      ? Array.from(overlay.parentElement.children).filter((element) => element !== overlay)
      : [];
    const backgroundState = backgroundElements.map((element) => ({
      element: element as HTMLElement,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: (element as HTMLElement).inert,
    }));
    backgroundState.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const focusableElements = (): HTMLElement[] => (
      drawer
        ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
          .filter((element) => !element.matches(":disabled") && element.offsetParent !== null)
        : []
    );
    const animationFrame = window.requestAnimationFrame(() => {
      if (drawer?.contains(document.activeElement)) return;
      (focusableElements()[0] || drawer)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !lockedRef.current) {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !drawer.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overflow-hidden");
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      } else {
        document.querySelector<HTMLElement>("[data-admin-focus-fallback]")?.focus();
      }
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex justify-end bg-[rgba(16,15,13,0.56)] backdrop-blur-[3px] [animation:admin-fade-in_160ms_ease_both]"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        className={classNames(
          "flex h-full flex-col bg-white shadow-[-24px_0_70px_rgba(17,17,15,0.22)] [animation:admin-slide-in_220ms_ease_both] max-[700px]:w-full",
          wide ? "w-[min(720px,100%)]" : "w-[min(470px,100%)]",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="flex min-h-[82px] items-center justify-between gap-4 border-b border-[#e5e1da] bg-white px-[22px] py-[17px]">
          <div>
            {eyebrow ? <p className="mb-[3px] mt-0 text-[9px] font-black uppercase tracking-[0.1em] text-[#8b6b00]">{eyebrow}</p> : null}
            <h2 className="m-0 text-[21px] leading-[1.2]" id={titleId}>{title}</h2>
          </div>
          <button
            className="grid size-10 cursor-pointer place-items-center rounded-[10px] border border-[#dedad2] bg-white disabled:cursor-wait disabled:opacity-50"
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            disabled={locked}
          >
            <X size={22} weight="bold" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f6f1]">{children}</div>
      </aside>
    </div>
  );
}
