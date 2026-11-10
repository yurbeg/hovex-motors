import { ChatCircleText, CheckCircle, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses } from "../shared/styles";
import { classNames, scrollToId } from "../shared/utils";

export function Hero({ onConsultation }: { onConsultation: ConsultationHandler }) {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface-soft)]" id="top">
      <div className={classNames(pageShellClasses, "grid min-h-[420px] grid-cols-[minmax(0,0.94fr)_minmax(520px,1.06fr)] items-stretch gap-[38px] max-[1240px]:grid-cols-[0.92fr_1.08fr] max-[1240px]:gap-[25px] max-[1080px]:min-h-[430px] max-[1080px]:grid-cols-[1fr_0.92fr] max-[800px]:flex max-[800px]:min-h-0 max-[800px]:w-full max-[800px]:flex-col max-[800px]:gap-0")}>
        <div className="self-center py-[42px] pb-[60px] max-[1080px]:py-10 max-[1080px]:pb-[54px] max-[800px]:mx-auto max-[800px]:w-[calc(100%_-_28px)] max-[800px]:py-[34px] max-[800px]:pb-[31px]">
          <p className={eyebrowClasses}><span />ԱՄՆ և Չինաստան • ամբողջական ուղեկցում</p>
          <h1 className="m-0 max-w-[720px] text-[clamp(42px,4.1vw,62px)] leading-[1.08] font-black max-[1240px]:text-5xl max-[1080px]:text-[42px] max-[800px]:text-[clamp(34px,10.6vw,42px)] max-[800px]:leading-[1.14] [&_mark]:box-decoration-clone [&_mark]:bg-[var(--yellow)] [&_mark]:px-[7px] [&_mark]:pb-[3px] [&_mark]:text-[var(--on-yellow)]">Գտեք մեքենա՝ <mark>ձեր իրական բյուջեի սահմաններում</mark></h1>
          <p className="mt-[22px] mb-0 max-w-[650px] text-[17px] leading-[1.65] text-[var(--ink-soft)] max-[1080px]:text-sm max-[800px]:mt-[18px] max-[800px]:text-[13px]">Նշեք բյուջեն, տարեթիվը և ցանկալի մակնիշը․ մենք կցուցադրենք համապատասխան տարբերակներ և Հայաստան հասցնելու նախնական արժեքը։</p>
          <div className="mt-[25px] flex flex-wrap gap-[11px] max-[800px]:[&>button]:w-full">
            <Button icon={MagnifyingGlass} onClick={() => scrollToId("finder")}>Սկսել որոնումը</Button>
            <Button variant="ghost" icon={ChatCircleText} onClick={() => onConsultation(null)}>Խոսել մասնագետի հետ</Button>
          </div>
          <div className="mt-[23px] flex flex-wrap gap-[21px] text-[13px] font-bold max-[800px]:gap-[11px] max-[800px]:text-[10px] [&_span]:inline-flex [&_span]:items-center [&_span]:gap-[7px] [&_svg]:text-[var(--green)]" aria-label="Ծառայության առավելություններ"><span><CheckCircle size={18} weight="fill" /> Թափանցիկ հաշվարկ</span><span><CheckCircle size={18} weight="fill" /> Առանց պարտադիր գրանցման</span></div>
        </div>
        <div className="relative grid min-h-[420px] grid-cols-[1.5fr_0.72fr] gap-[7px] overflow-hidden border-l-[7px] border-[var(--yellow)] bg-[#11110f] max-[1080px]:min-h-[430px] max-[1080px]:grid-cols-1 max-[800px]:min-h-[330px] max-[800px]:grid-cols-[1.42fr_0.72fr] max-[800px]:border-t-[5px] max-[800px]:border-l-0 max-[420px]:grid-cols-1 [&_img]:h-full [&_img]:min-h-[420px] [&_img]:w-full [&_img]:object-cover max-[1080px]:[&_img]:min-h-[430px] max-[800px]:[&_img]:min-h-[330px]" aria-label="Hovex Motors-ի իրական հրապարակումներից">
          <img className="object-[50%_37%]" src="/assets/hovex/presenter-import-made-easy.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների կողքին" />
          <img className="object-[48%_68%] max-[1080px]:hidden max-[800px]:block max-[420px]:hidden" src="/assets/hovex/hongqi-ehs9.jpg" alt="Hovex Motors-ի ներկայացրած Hongqi մեքենան" />
          <div className="absolute right-[18px] bottom-[18px] flex w-[min(280px,calc(100%_-_36px))] items-center gap-2.5 rounded-[13px] border border-[rgba(255,255,255,0.55)] bg-[rgba(17,17,15,0.9)] px-[15px] py-[13px] text-[13px] leading-[1.45] text-white max-[800px]:right-3 max-[800px]:bottom-3 max-[800px]:w-[min(250px,calc(100%_-_24px))] max-[800px]:text-[10px] [&_svg]:shrink-0 [&_svg]:text-[var(--yellow)] [&_span]:block [&_strong]:block"><ShieldCheck size={22} weight="fill" aria-hidden="true" /><span><strong>Անհատական ընտրություն</strong> ըստ ձեր բյուջեի</span></div>
        </div>
      </div>
    </section>
  );
}
