import { WarningCircle } from "@phosphor-icons/react";

export function Notice({ message }: { message: string }) {
  if (!message) return null;
  return <div className="fixed top-[98px] left-1/2 z-[130] flex w-[min(480px,calc(100%_-_32px))] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border border-[var(--orange-border)] bg-[var(--orange-pale)] px-4 py-[13px] text-xs font-bold text-[var(--orange-ink)] shadow-[var(--shadow-sm)]" role="alert"><WarningCircle size={20} weight="fill" />{message}</div>;
}
