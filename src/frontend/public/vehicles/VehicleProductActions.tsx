import {
  Calculator,
  ChatCircleText,
  Phone,
  WhatsappLogo,
} from "@phosphor-icons/react";
import type { LeadRequestKind } from "../../../domain/lead";
import type { Vehicle } from "../../../domain/vehicle";
import { phoneDisplay, phoneHref } from "../shared/utils";

interface VehicleProductActionsProps {
  vehicle: Vehicle;
  onRequest: (kind: LeadRequestKind) => void;
  variant?: "panel" | "mobile";
}

function vehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

export function vehicleWhatsappUrl(vehicle: Vehicle): string {
  const message = [
    "Բարև, Hovex Motors։ Ցանկանում եմ ստանալ այս մեքենայի ամբողջական հաշվարկը։",
    `Մեքենա՝ ${vehicleLabel(vehicle)}`,
    `Hovex ID՝ ${vehicle.id}`,
  ].join("\n");
  return `https://wa.me/37433344366?text=${encodeURIComponent(message)}`;
}

export function VehicleProductActions({
  vehicle,
  onRequest,
  variant = "panel",
}: VehicleProductActionsProps) {
  const whatsappUrl = vehicleWhatsappUrl(vehicle);

  if (variant === "mobile") {
    return (
      <nav
        className="fixed right-0 bottom-0 left-0 z-50 hidden min-h-[calc(72px_+_env(safe-area-inset-bottom))] grid-cols-4 gap-1.5 border-t border-[var(--border)] bg-[var(--surface-translucent)] px-2 pt-1.5 pb-[calc(6px_+_env(safe-area-inset-bottom))] shadow-[0_-10px_32px_rgba(17,17,15,0.12)] backdrop-blur-md max-[800px]:grid [&_a]:min-w-0 [&_button]:min-w-0"
        aria-label="Մեքենայի արագ գործողություններ"
      >
        <button
          className="flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--yellow-hover)] bg-[var(--yellow)] px-1 text-center text-[9px] leading-tight font-black text-[var(--on-yellow)]"
          type="button"
          onClick={() => onRequest("full_calculation")}
          aria-label="Ստանալ ամբողջական հաշվարկ"
        >
          <Calculator size={20} weight="bold" aria-hidden="true" />
          <span>Հաշվարկ</span>
        </button>
        <button
          className="flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--ink)] bg-[var(--ink)] px-1 text-center text-[9px] leading-tight font-black text-[var(--paper)]"
          type="button"
          onClick={() => onRequest("consultation")}
          aria-label="Խորհրդակցել այս մեքենայի շուրջ"
        >
          <ChatCircleText size={20} weight="bold" aria-hidden="true" />
          <span>Խորհուրդ</span>
        </button>
        <a
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--green-border)] bg-[var(--green-pale)] px-1 text-center text-[9px] leading-tight font-black text-[var(--green-ink)]"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Գրել WhatsApp-ով այս մեքենայի մասին"
        >
          <WhatsappLogo size={20} weight="fill" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
        <a
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-1 text-center text-[9px] leading-tight font-black text-[var(--ink)]"
          href={`tel:${phoneHref}`}
          aria-label={`Զանգահարել ${phoneDisplay}`}
        >
          <Phone size={20} weight="fill" aria-hidden="true" />
          <span>Զանգ</span>
        </a>
      </nav>
    );
  }

  return (
    <div className="grid gap-2.5 border-t border-[var(--border)] p-6 max-[800px]:p-5" aria-label="Մեքենայի գործողություններ">
      <button
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--yellow-hover)] bg-[var(--yellow)] px-4 text-sm font-black text-[var(--on-yellow)] transition-colors hover:bg-[var(--yellow-hover)] motion-reduce:transition-none"
        type="button"
        onClick={() => onRequest("full_calculation")}
      >
        <Calculator size={20} weight="bold" aria-hidden="true" />
        Ստանալ ամբողջական հաշվարկ
      </button>
      <button
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-bold text-[var(--paper)] transition-colors hover:bg-[var(--ink-hover)] motion-reduce:transition-none"
        type="button"
        onClick={() => onRequest("consultation")}
      >
        <ChatCircleText size={20} weight="bold" aria-hidden="true" />
        Խորհրդակցել այս մեքենայի շուրջ
      </button>
      <div className="grid grid-cols-2 gap-2.5">
        <a
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--green-border)] bg-[var(--green-pale)] px-3 text-xs font-bold text-[var(--green-ink)]"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsappLogo size={19} weight="fill" aria-hidden="true" />
          WhatsApp
        </a>
        <a
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold hover:border-[var(--ink)]"
          href={`tel:${phoneHref}`}
        >
          <Phone size={18} weight="fill" aria-hidden="true" />
          Զանգ
        </a>
      </div>
    </div>
  );
}
