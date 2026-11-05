import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";

interface EmptyStateProps {
  icon: Icon;
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ icon: IconComponent, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-[50px] text-center">
      <span className="grid size-[58px] place-items-center rounded-2xl bg-[#f3f0ea] text-[#716d66]">
        <IconComponent size={28} weight="bold" />
      </span>
      <h3 className="mb-[5px] mt-4 text-base">{title}</h3>
      <p className="mb-[18px] mt-0 max-w-[360px] text-[11px] text-[#837e76]">{text}</p>
      {action}
    </div>
  );
}
