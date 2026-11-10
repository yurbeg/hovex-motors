import { useEffect, useId, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { classNames } from "./utils";

type ModalSize = "medium" | "large";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  locked?: boolean;
}

const modalSizeClasses: Record<ModalSize, string> = {
  medium: "w-[min(680px,100%)]",
  large: "w-[min(1120px,100%)]",
};

export function Modal({ title, children, onClose, size = "medium", locked = false }: ModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(11,11,10,0.7)] p-8 max-[800px]:place-items-end max-[800px]:p-3" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => event.target === event.currentTarget && !locked && onClose()}>
      <section ref={dialogRef} tabIndex={-1} className={classNames("flex max-h-[calc(100vh_-_64px)] flex-col overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[0_28px_90px_rgba(0,0,0,0.38)] max-[800px]:max-h-[calc(100dvh_-_24px)] max-[800px]:w-full max-[800px]:rounded-[18px_18px_12px_12px]", modalSizeClasses[size])} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex min-h-[73px] items-center justify-between gap-5 border-b border-[var(--border)] py-4 pr-5 pl-[25px] max-[800px]:min-h-[65px] max-[800px]:p-[13px] max-[800px]:pl-[18px] [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:leading-[1.35] max-[800px]:[&_h2]:text-[17px] [&_button]:grid [&_button]:h-[42px] [&_button]:w-[42px] [&_button]:shrink-0 [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-full [&_button]:border [&_button]:border-[var(--border)] [&_button]:bg-[var(--surface)]"><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label="Փակել" disabled={locked}><X size={23} weight="bold" /></button></div>
        <div className="overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
