import { InstagramLogo } from "@phosphor-icons/react";
import { eyebrowClasses, pageShellClasses, sectionTitleClasses } from "../shared/styles";
import { classNames } from "../shared/utils";

const images = [["/assets/hovex/deepal-sl03-sport.jpg", "Deepal SL03 Sport"], ["/assets/hovex/deepal-s05-lineup.jpg", "Deepal S05 մեքենաների շարք"], ["/assets/hovex/hongqi-ehs9.jpg", "Hongqi E-HS9"], ["/assets/hovex/cadillac-escalade-iq.jpg", "Cadillac Escalade IQ"]];

export function SocialProof() {
  return <section className={classNames(pageShellClasses, "py-[90px] max-[800px]:py-[68px]")}><div className="mb-7 flex items-end justify-between gap-[30px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-3.5" data-scroll-reveal="up"><div><p className={eyebrowClasses}><span />@hovex_motors</p><h2 className={sectionTitleClasses}>Ծանոթացեք մեքենաներին Hovex-ի իրական նյութերով</h2></div><a className="inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[var(--border)] px-[15px] text-xs font-bold hover:border-[var(--ink)] hover:bg-[var(--surface)] max-[800px]:w-full max-[800px]:justify-center" href="https://www.instagram.com/hovex_motors/" target="_blank" rel="noreferrer"><InstagramLogo size={21} weight="bold" /> Դիտել Instagram-ում</a></div><div className="grid grid-cols-4 gap-[13px] max-[800px]:grid-cols-2 max-[420px]:gap-2" data-scroll-stagger="">{images.map(([src, alt]) => <img className="aspect-[1/1.18] w-full rounded-[14px] bg-[var(--surface-muted)] object-cover object-[50%_38%]" key={src} src={src} alt={alt} data-scroll-reveal="scale" />)}</div></section>;
}
