import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import type { StatTone } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import { statToneClasses } from "../shared/styles";

interface StatCardProps {
  label: string;
  value: ReactNode;
  note: string;
  icon: Icon;
  tone?: StatTone;
}

export function StatCard({ label, value, note, icon: IconComponent, tone = "ink" }: StatCardProps) {
  return (
    <article className="grid min-w-0 grid-cols-[auto_1fr] rounded-2xl border border-[#e0dcd4] bg-white p-5 shadow-[0_8px_28px_rgba(26,24,19,0.04)] [column-gap:13px] max-[700px]:block max-[700px]:p-3.5 max-[430px]:grid">
      <div className={classNames("row-span-3 grid size-11 place-items-center rounded-xl max-[700px]:mb-[13px] max-[700px]:size-[38px] max-[430px]:m-0", statToneClasses[tone])}>
        <IconComponent size={23} weight="bold" />
      </div>
      <p className="mb-[3px] mt-0 text-[11px] font-bold text-[#77726b]">{label}</p>
      <strong className="text-[26px] leading-[1.05] max-[700px]:block max-[700px]:text-[22px]">{value}</strong>
      <small className="mt-1 text-[9px] text-[#99938a]">{note}</small>
    </article>
  );
}
