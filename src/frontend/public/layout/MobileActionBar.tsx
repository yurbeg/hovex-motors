import { ChatCircleText, House, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";

interface MobileActionBarProps {
  page: "home" | "catalog";
  assistantOpen: boolean;
  onOpenAssistant: () => void;
  onConsultation: () => void;
  onPrimaryAction: () => void;
}

export function MobileActionBar({ page, assistantOpen, onOpenAssistant, onConsultation, onPrimaryAction }: MobileActionBarProps) {
  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 hidden min-h-[calc(67px_+_env(safe-area-inset-bottom))] grid-cols-3 gap-2 border-t border-[var(--border)] bg-[var(--surface-translucent)] px-2.5 pt-2 pb-[calc(8px_+_env(safe-area-inset-bottom))] max-[800px]:grid [&_button]:flex [&_button]:min-w-0 [&_button]:items-center [&_button]:justify-center [&_button]:gap-[5px] [&_button]:rounded-[10px] [&_button]:border [&_button]:border-[var(--border)] [&_button]:bg-[var(--surface)] [&_button]:text-[9px] [&_button]:font-bold [&_button]:whitespace-nowrap [&_button:first-child]:border-[var(--yellow)] [&_button:first-child]:bg-[var(--yellow)] [&_button:first-child]:text-[var(--on-yellow)] [&_button:nth-child(2)]:border-[var(--ink)] [&_button:nth-child(2)]:bg-[var(--ink)] [&_button:nth-child(2)]:text-[var(--paper)]">
      <button type="button" onClick={onPrimaryAction}>{page === "catalog" ? <House size={19} weight="bold" /> : <MagnifyingGlass size={19} weight="bold" />}{page === "catalog" ? "Գլխավոր" : "Գտնել մեքենա"}</button>
      <button type="button" onClick={onOpenAssistant} aria-expanded={assistantOpen} aria-controls="hovex-ai-panel"><Sparkle size={19} weight="fill" />AI օգնական</button>
      <button type="button" onClick={onConsultation}><ChatCircleText size={19} weight="bold" />Խորհրդատվություն</button>
    </div>
  );
}
