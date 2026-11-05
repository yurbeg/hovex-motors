import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Button } from "../shared/Button";

interface CompareBarProps {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}

export function CompareBar({ count, onOpen, onClear }: CompareBarProps) {
  return <div data-compare-bar className="fixed bottom-[22px] left-1/2 z-[55] flex min-h-[63px] min-w-[440px] -translate-x-1/2 items-center gap-[15px] rounded-[15px] border border-[#3b3933] bg-[rgba(17,17,15,0.96)] py-2 pr-[9px] pl-[17px] text-white shadow-[0_18px_45px_rgba(0,0,0,0.26)] max-[800px]:bottom-[calc(77px_+_env(safe-area-inset-bottom))] max-[800px]:min-h-[57px] max-[800px]:w-[calc(100%_-_20px)] max-[800px]:min-w-0 max-[800px]:gap-[7px] max-[800px]:pl-3" role="group" aria-label="Մեքենաների համեմատում"><span className="flex flex-1 items-center gap-[7px] text-xs max-[800px]:text-[10px] [&_svg]:text-[var(--yellow)] max-[800px]:[&_svg]:hidden [&_strong]:text-[var(--yellow)]" aria-live="polite"><ArrowsLeftRight size={22} weight="bold" /><strong>{count}</strong> մեքենա ընտրված է</span><button className="cursor-pointer border-0 bg-transparent p-[9px] text-[11px] text-[#c6c2bb] max-[800px]:text-[10px]" type="button" onClick={onClear}>Մաքրել</button><Button className="min-h-[45px] px-4 text-[11px] max-[800px]:min-h-[41px] max-[800px]:px-3" onClick={onOpen}>Համեմատել</Button></div>;
}
