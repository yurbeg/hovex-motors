import { ArrowSquareOut, SignOut } from "@phosphor-icons/react";
import { ThemeToggle } from "../../theme/ThemeToggle";
import { classNames } from "../shared/classNames";

interface AdminTopbarProps {
  connectionLabel: string;
  connectionDot: string;
  adminEmail: string;
  onSignOut: () => void;
}

export function AdminTopbar({
  connectionLabel,
  connectionDot,
  adminEmail,
  onSignOut,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-[15] flex h-[70px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface-translucent)] px-[clamp(24px,3.2vw,50px)] backdrop-blur-[14px] max-[900px]:top-[68px] max-[700px]:top-[62px] max-[700px]:h-[58px] max-[700px]:px-4 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&>div]:text-xs [&>div]:font-bold [&>div]:text-[var(--ink-soft)] max-[700px]:[&>div:first-child]:hidden max-[700px]:[&>div:last-child]:w-full max-[700px]:[&>div:last-child]:justify-between">
      <div><span className={classNames("size-2 rounded-full shadow-[0_0_0_4px_rgba(54,173,85,0.12)]", connectionDot)} />{connectionLabel}</div>
      <div>
        <a className="inline-flex items-center gap-1.5 text-[var(--ink)]" href="/" target="_blank" rel="noreferrer">Բացել կայքը <ArrowSquareOut size={16} weight="bold" /></a>
        <span className="hidden max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] min-[901px]:inline">{adminEmail}</span>
        <ThemeToggle className="shrink-0" />
        <button className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] border-0 bg-[var(--yellow)] text-[var(--on-yellow)]" type="button" onClick={onSignOut} aria-label="Դուրս գալ"><SignOut size={18} weight="bold" /></button>
      </div>
    </header>
  );
}
