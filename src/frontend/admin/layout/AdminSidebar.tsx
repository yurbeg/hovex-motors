import {
  ArrowSquareOut,
  SealCheck,
  SignOut,
} from "@phosphor-icons/react";
import type { NavView } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import { navItems } from "../shared/navigation";

interface AdminSidebarProps {
  view: NavView;
  onNavigate: (view: NavView) => void;
  newLeadCount: number;
  adminEmail: string;
  onSignOut: () => void;
}

export function AdminSidebar({
  view,
  onNavigate,
  newLeadCount,
  adminEmail,
  onSignOut,
}: AdminSidebarProps) {
  return (
    <aside className="sticky top-0 z-20 flex h-screen flex-col bg-[#11110f] px-[18px] pb-5 pt-6 text-white shadow-[10px_0_36px_rgba(17,17,15,0.1)] max-[900px]:grid max-[900px]:h-auto max-[900px]:grid-cols-[auto_minmax(0,1fr)] max-[900px]:items-center max-[900px]:gap-[18px] max-[900px]:px-4 max-[900px]:py-2.5 max-[700px]:grid-cols-[42px_minmax(0,1fr)] max-[700px]:gap-2.5">
      <a className="mx-1.5 mb-[30px] flex min-h-[62px] items-center gap-3 max-[900px]:m-0 max-[900px]:min-h-12" href="/" aria-label="Hovex Motors կայք">
        <img className="size-[52px] shrink-0 rounded-[11px] border border-[#302f2b] object-contain max-[900px]:size-[42px]" src="/assets/hovex/hovex-logo-instagram.jpg" alt="" />
        <span className="grid gap-px max-[900px]:hidden"><strong className="text-base leading-[1.1] tracking-[0.14em]">HOVEX</strong><small className="text-[9px] font-bold tracking-[0.19em] text-[#aaa69e]">ADMIN PANEL</small></span>
      </a>
      <nav className="grid gap-[7px] max-[900px]:flex max-[900px]:justify-end max-[900px]:gap-[5px]" aria-label="Կառավարման ընտրացանկ">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={classNames(
              "relative flex min-h-[50px] w-full cursor-pointer items-center gap-3 rounded-[11px] border border-transparent bg-transparent px-3.5 text-left font-bold text-[#c9c6c0] transition duration-150 hover:bg-[#201f1c] hover:text-white max-[900px]:min-h-[43px] max-[900px]:w-auto max-[900px]:px-[11px] max-[700px]:flex-1 max-[700px]:justify-center max-[700px]:[&>span]:hidden",
              view === id && "border-[rgba(255,196,0,0.26)] bg-[#2b281d] text-[#ffc400] shadow-[inset_3px_0_0_#ffc400] max-[900px]:shadow-[inset_0_-3px_0_#ffc400]",
            )}
            aria-label={label}
            aria-current={view === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={21} weight={view === id ? "fill" : "regular"} />
            <span>{label}</span>
            {id === "requests" && newLeadCount ? <em className="ml-auto grid h-[23px] min-w-[23px] place-items-center rounded-full bg-[#ffc400] px-1.5 text-[11px] font-black not-italic text-[#11110f] max-[900px]:absolute max-[900px]:translate-x-[18px] max-[900px]:-translate-y-3.5 max-[700px]:translate-x-[15px] max-[700px]:-translate-y-[13px]">{newLeadCount}</em> : null}
          </button>
        ))}
      </nav>
      <div className="mt-auto grid gap-2.5 max-[900px]:hidden">
        <span className="flex items-center gap-2.5 rounded-[11px] border border-[#34322d] bg-[#191815] p-[13px] text-[#ffc400]">
          <SealCheck size={20} weight="fill" />
          <p className="m-0 grid min-w-0"><strong className="text-xs text-white">Supabase Cloud</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#8e8a82]">{adminEmail}</small></p>
        </span>
        <button className="flex cursor-pointer items-center justify-between border-0 bg-transparent px-1.5 py-[7px] text-left text-xs font-bold text-[#9b978f] hover:text-white" type="button" onClick={onSignOut}>Դուրս գալ <SignOut size={16} weight="bold" /></button>
        <a className="flex items-center justify-between px-1.5 py-[7px] text-xs font-bold text-[#9b978f] hover:text-white" href="/">Վերադառնալ կայք <ArrowSquareOut size={16} weight="bold" /></a>
      </div>
    </aside>
  );
}
