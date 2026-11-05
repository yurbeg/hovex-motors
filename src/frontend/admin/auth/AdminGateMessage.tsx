import type { ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";

interface AdminGateMessageProps {
  title: string;
  text: string;
  action?: ReactNode;
}

export function AdminGateMessage({ title, text, action }: AdminGateMessageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f2ec] px-4 text-[#11110f]">
      <section className="w-full max-w-[480px] rounded-[20px] border border-[#ded8cf] bg-white p-8 text-center shadow-[0_24px_70px_rgba(31,28,20,0.1)]">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#fff1bb] text-[#806300]">
          <LockKey size={27} weight="fill" />
        </span>
        <h1 className="mb-2 mt-0 text-2xl">{title}</h1>
        <p className="mb-5 mt-0 text-[12px] leading-relaxed text-[#716c64]">{text}</p>
        {action}
      </section>
    </main>
  );
}
