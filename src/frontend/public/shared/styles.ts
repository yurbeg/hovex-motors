export const pageShellClasses = "mx-auto w-[min(1440px,calc(100%_-_80px))] max-[1240px]:w-[min(calc(100%_-_44px),1180px)] max-[800px]:w-[calc(100%_-_28px)]";

export const eyebrowClasses = "m-0 mb-3 flex items-center gap-[9px] text-[13px] leading-[1.4] font-bold text-[var(--ink-soft)] uppercase max-[800px]:text-[10px] [&>span]:h-1 [&>span]:w-[26px] [&>span]:shrink-0 [&>span]:rounded [&>span]:bg-[var(--yellow)]";

export const sectionTitleClasses = "m-0 text-[clamp(30px,3vw,42px)] leading-[1.22] font-black max-[800px]:text-[29px]";

export const formFieldClasses = "flex flex-col gap-[7px] text-[13px] font-bold [&>span:first-child]:leading-[1.35] [&_input]:min-h-[49px] [&_input]:w-full [&_input]:rounded-[11px] [&_input]:border [&_input]:border-[var(--border)] [&_input]:bg-[var(--surface)] [&_input]:px-3.5 [&_input]:text-[15px] [&_input]:font-normal [&_input]:text-[var(--ink)] [&_input]:transition-[border-color,box-shadow] [&_input]:duration-150 [&_input:hover]:border-[var(--border-strong)] [&_input:focus]:border-[var(--yellow-hover)] [&_input:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_input:focus]:outline-none [&_select]:min-h-[49px] [&_select]:w-full [&_select]:rounded-[11px] [&_select]:border [&_select]:border-[var(--border)] [&_select]:bg-[var(--surface)] [&_select]:px-3.5 [&_select]:text-[15px] [&_select]:font-normal [&_select]:text-[var(--ink)] [&_select]:transition-[border-color,box-shadow] [&_select]:duration-150 [&_select:hover]:border-[var(--border-strong)] [&_select:focus]:border-[var(--yellow-hover)] [&_select:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_select:focus]:outline-none [&_textarea]:min-h-[92px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[11px] [&_textarea]:border [&_textarea]:border-[var(--border)] [&_textarea]:bg-[var(--surface)] [&_textarea]:px-3.5 [&_textarea]:pt-3 [&_textarea]:text-[15px] [&_textarea]:font-normal [&_textarea]:text-[var(--ink)] [&_textarea]:transition-[border-color,box-shadow] [&_textarea]:duration-150 [&_textarea:hover]:border-[var(--border-strong)] [&_textarea:focus]:border-[var(--yellow-hover)] [&_textarea:focus]:shadow-[0_0_0_3px_rgba(255,196,0,0.18)] [&_textarea:focus]:outline-none [&_small]:min-h-4 [&_small]:text-[11px] [&_small]:leading-[1.45] [&_small]:font-normal [&_small]:text-[var(--muted)]";

export const navButtonClasses = "relative inline-flex cursor-pointer items-center border-0 bg-transparent px-0 py-2 text-sm font-bold after:absolute after:right-full after:bottom-px after:left-0 after:h-[3px] after:bg-[var(--yellow)] after:transition-[right] after:duration-150 hover:after:right-0 aria-[current=page]:after:right-0 max-[1240px]:text-xs max-[1080px]:min-h-[46px] max-[1080px]:border-b max-[1080px]:border-[var(--border)] max-[1080px]:text-left max-[1080px]:last:border-b-0";

export const vehicleBadgeToneClasses: Record<string, string> = {
  green: "bg-[#23853c] text-white",
  yellow: "bg-[var(--yellow)] text-[var(--on-yellow)]",
  blue: "bg-[#155b86] text-white",
  orange: "bg-[#8e4300] text-white",
  black: "bg-[var(--ink)] text-[var(--paper)]",
};
