import { ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

export function CatalogSourceNotice({ visible, onRetry }: { visible: boolean; onRetry: () => void }) {
  if (!visible) return null;
  return <div className={classNames(pageShellClasses, "mt-5 flex items-center justify-between gap-5 rounded-[13px] border border-[var(--orange-border)] bg-[var(--orange-pale)] px-4 py-3.5 text-[var(--orange-ink)] max-[800px]:items-start max-[800px]:gap-3 max-[560px]:flex-col")} role="status"><span className="flex items-start gap-2.5 text-[11px] leading-[1.55] font-bold"><WarningCircle className="mt-px shrink-0" size={20} weight="fill" /><span>Ամպային կատալոգը հիմա հասանելի չէ, ուստի ժամանակավորապես ցուցադրվում են փորձնական մեքենաները։</span></span><button className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--orange-border)] bg-[var(--surface)] px-3 text-[10px] font-bold max-[560px]:w-full max-[560px]:justify-center" type="button" onClick={onRetry}><ArrowCounterClockwise size={16} weight="bold" />Կրկին փորձել</button></div>;
}
