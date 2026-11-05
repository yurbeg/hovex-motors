import type { Icon } from "@phosphor-icons/react";
import { Boat, Coins, CurrencyDollar, Gavel, GearSix, ShieldCheck, Truck } from "@phosphor-icons/react";
import { priceSteps } from "../../../content/catalog";
import { pageShellClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

const costIcons: Icon[] = [CurrencyDollar, Gavel, Truck, Boat, ShieldCheck, GearSix];

export function CostStrip() {
  return (
    <section className={classNames(pageShellClasses, "mt-[21px] grid min-h-[70px] grid-cols-[235px_1fr] items-center overflow-hidden rounded-[17px] border border-[#eadca8] bg-[var(--yellow-pale)] max-[1240px]:grid-cols-[205px_1fr] max-[1080px]:block max-[800px]:mt-3.5")} aria-label="Նախնական արժեքի բաղադրիչները">
      <div className="flex h-full items-center gap-3 bg-[var(--yellow)] px-[21px] py-[13px] max-[1080px]:min-h-[60px] max-[1080px]:justify-center [&_span]:block [&_strong]:block [&_strong]:text-sm [&_small]:mt-0.5 [&_small]:block [&_small]:text-[10px]"><Coins size={25} weight="bold" /><span><strong>Թափանցիկ հաշվարկ</strong><small>Մեկ ընդհանուր բյուջե</small></span></div>
      <div className="grid grid-cols-6 gap-[5px] px-5 max-[1240px]:px-2.5 max-[1080px]:min-h-[70px] max-[800px]:grid-cols-2 max-[800px]:gap-[7px] max-[800px]:p-3">{priceSteps.map((step, index) => { const IconComponent = costIcons[index]; return IconComponent ? <span className="flex min-h-[42px] items-center justify-center gap-[7px] border-r border-[rgba(99,86,41,0.17)] text-center text-[11px] font-bold last:border-r-0 max-[1240px]:text-[10px] max-[1080px]:border-r-0 max-[800px]:min-h-10 max-[800px]:justify-start max-[800px]:text-left" key={step}><IconComponent size={21} weight="bold" />{step}</span> : null; })}</div>
    </section>
  );
}
