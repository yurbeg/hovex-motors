import type { ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";
import { ThemeToggle } from "../../theme/ThemeToggle";

interface AdminGateMessageProps {
  title: string;
  text: string;
  action?: ReactNode;
}

export function AdminGateMessage({ title, text, action }: AdminGateMessageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-4 text-[var(--ink)]">
      <section className="relative w-full max-w-[480px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_24px_70px_rgba(31,28,20,0.1)]" data-scroll-reveal="scale">
        <ThemeToggle className="absolute right-4 top-4" />
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[var(--yellow-pale)] text-[var(--yellow-ink)]">
          <LockKey size={27} weight="fill" />
        </span>
        <h1 className="mb-2 mt-0 text-2xl">{title}</h1>
        <p className="mb-5 mt-0 text-[12px] leading-relaxed text-[var(--ink-soft)]">{text}</p>
        {action}
      </section>
    </main>
  );
}
