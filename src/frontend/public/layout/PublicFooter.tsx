import { Clock, InstagramLogo, MapPin, Phone, WhatsappLogo } from "@phosphor-icons/react";
import { pageShellClasses } from "../shared/styles";
import { classNames, phoneDisplay, phoneHref } from "../shared/utils";

export function PublicFooter() {
  return (
    <footer className="bg-[#10100f] text-white">
      <div className={classNames(pageShellClasses, "grid grid-cols-[1.35fr_0.7fr_1fr_0.65fr] gap-[50px] pt-[62px] pb-[52px] max-[1080px]:grid-cols-[1.4fr_0.8fr_1fr] max-[1080px]:[&>div:last-child]:hidden max-[800px]:grid-cols-2 max-[800px]:gap-x-5 max-[800px]:gap-y-[35px]")}>
        <div className="max-[800px]:col-span-full"><img className="h-[78px] w-[90px] rounded-[11px] object-cover" src="/assets/hovex/hovex-logo-instagram.jpg" alt="Hovex Motors" /><p className="mt-[17px] mb-0 max-w-[390px] text-xs leading-[1.7] text-[#aaa69e]">Մեքենաների ընտրություն և ներմուծում ԱՄՆ-ից ու Չինաստանից՝ թափանցիկ հաշվարկով և մասնագետի աջակցությամբ։</p></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_a]:mb-[11px] [&_a]:flex [&_a]:items-start [&_a]:gap-2 [&_a]:text-[11px] [&_a]:leading-[1.6] [&_a]:text-[#c4c0b9] [&_svg]:mt-px [&_svg]:shrink-0"><h3>Կապ</h3><a href={`tel:${phoneHref}`}><Phone size={18} />{phoneDisplay}</a><a href="https://wa.me/37433344366" target="_blank" rel="noreferrer"><WhatsappLogo size={18} />WhatsApp</a><a href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={18} />Instagram</a></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_p]:mb-[11px] [&_p]:flex [&_p]:items-start [&_p]:gap-2 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-[#c4c0b9] [&_svg]:mt-px [&_svg]:shrink-0"><h3>Այցելեք մեզ</h3><p><MapPin size={18} />Երևան, Էրեբունի<br />Ազատամարտիկների 68/1</p><p><Clock size={18} />Աշխատանքային ժամերը ճշտեք զանգով</p></div>
        <div className="flex flex-col items-start [&_h3]:mt-[3px] [&_h3]:mb-[17px] [&_h3]:text-[13px] [&_h3]:text-[var(--yellow)] [&_a]:mb-[11px] [&_a]:text-[11px] [&_a]:leading-[1.6] [&_a]:font-bold [&_a]:text-[#c4c0b9]"><h3>Արագ հղումներ</h3><a href="/#finder">Մեքենա գտնել</a><a href="/catalog">Մեքենաների կատալոգ</a><a href="/#how-it-works">Ինչպես է աշխատում</a><a href="/#faq">Հաճախ տրվող հարցեր</a></div>
      </div>
      <div className={classNames(pageShellClasses, "flex min-h-[70px] items-center justify-between gap-[25px] border-t border-[#33322e] text-[10px] text-[#8f8a82] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-2 max-[800px]:py-[18px] [&_p]:m-0 [&_p]:text-right max-[800px]:[&_p]:text-left")}><span>© {new Date().getFullYear()} Hovex Motors</span><p>Աճուրդային տվյալներն ու գները կարող են փոփոխվել և ինքնուրույն չեն հաստատում վերջնական գնման կամ ներմուծման արժեքը։</p></div>
    </footer>
  );
}
