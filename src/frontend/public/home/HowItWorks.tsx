import type { Icon } from "@phosphor-icons/react";
import { Car, Handshake, ListMagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { eyebrowClasses, pageShellClasses, sectionTitleClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

const processSteps: Array<{ title: string; text: string; icon: Icon }> = [
  { title: "Նշեք պահանջները", text: "Բյուջե, տարեթիվ և ցանկալի մակնիշ", icon: ListMagnifyingGlass },
  { title: "Ընտրեք տարբերակը", text: "Համեմատեք մեքենաներն ու նախնական արժեքները", icon: Car },
  { title: "Ստուգեք մասնագետի հետ", text: "Ճշտեք պատմությունը, վնասվածքն ու անվտանգ խաղադրույքը", icon: ShieldCheck },
  { title: "Ստացեք Հայաստանում", text: "Hovex-ը ուղեկցում է գնումից մինչև հանձնում", icon: Handshake },
];

export function HowItWorks() {
  return <section className="border-y border-[var(--border)] bg-[#efeae1] py-[86px] pb-24 max-[800px]:py-16" id="how-it-works"><div className={pageShellClasses}><div className="mx-auto mb-7 max-w-[760px] text-center"><p className={classNames(eyebrowClasses, "justify-center")}><span />Պարզ ընթացք</p><h2 className={sectionTitleClasses}>Ինչպես է աշխատում ներմուծումը</h2><p className="mt-2.5 mb-0 text-[15px] leading-[1.55] text-[var(--ink-soft)]">Մեկ մասնագետ, մեկ թափանցիկ հաշվարկ և հստակ հաջորդ քայլ յուրաքանչյուր փուլում։</p></div><div className="mt-[39px] grid grid-cols-4 gap-[17px] max-[1080px]:grid-cols-2 max-[800px]:gap-[11px] max-[420px]:grid-cols-1">{processSteps.map(({ title, text, icon: IconComponent }, index) => <article className="min-h-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[23px] max-[800px]:min-h-[210px] max-[800px]:p-[17px] max-[420px]:min-h-[175px]" key={title}><div className="flex items-center justify-between [&>span]:grid [&>span]:h-[34px] [&>span]:w-[34px] [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[var(--yellow)] [&>span]:font-black [&>svg]:text-[#9c7b23]"><span>{index + 1}</span><IconComponent size={29} weight="bold" /></div><h3 className="mt-8 mb-[7px] text-lg leading-[1.4] max-[800px]:mt-[23px] max-[800px]:text-[15px]">{title}</h3><p className="m-0 text-[13px] leading-[1.6] text-[var(--ink-soft)] max-[800px]:text-[11px]">{text}</p></article>)}</div></div></section>;
}
