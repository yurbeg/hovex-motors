import { CalendarBlank, Phone } from "@phosphor-icons/react";
import type { ConsultationHandler } from "../shared/types";
import { Button } from "../shared/Button";
import { eyebrowClasses, pageShellClasses } from "../shared/styles";
import { classNames, phoneDisplay, phoneHref } from "../shared/utils";

export function ConsultationBanner({ onConsultation }: { onConsultation: ConsultationHandler }) {
  return (
    <section className={classNames(pageShellClasses, "my-[88px] grid min-h-[225px] grid-cols-[0.82fr_1.55fr_0.78fr] items-stretch overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] max-[1240px]:grid-cols-[0.75fr_1.45fr_0.85fr] max-[1080px]:grid-cols-[0.8fr_1.2fr] max-[800px]:my-16 max-[800px]:grid-cols-1")} aria-labelledby="consultation-title">
      <div className="min-h-[225px] overflow-hidden max-[800px]:min-h-[260px] [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[50%_36%]"><img src="/assets/hovex/presenter-vehicle-choice.jpg" alt="Hovex Motors-ի մասնագետը մեքենաների ցուցասրահում" /></div>
      <div className="self-center px-[38px] py-[30px] max-[1240px]:px-7 max-[800px]:px-[21px] max-[800px]:py-[25px]">
        <p className={eyebrowClasses}><span />Իրական մարդ, հստակ պատասխաններ</p>
        <h2 className="m-0 text-[clamp(26px,2.4vw,35px)] leading-[1.22] font-black max-[800px]:text-[29px]" id="consultation-title">Որոշումը կայացրեք Hovex-ի մասնագետի հետ</h2>
        <p className="my-[11px] mb-[15px] text-sm leading-[1.65] text-[var(--ink-soft)]">Քննարկեք ձեր բյուջեն, մեքենայի պատմությունը և ներմուծման ամբողջական հաշվարկը՝ մինչև որևէ պարտավորություն ստանձնելը։</p>
        <span className="flex items-center gap-2 text-[11px] font-bold"><i className="h-[9px] w-[9px] rounded-full bg-[var(--green)]" /> Հայտերը մշակվում են աշխատանքային ժամերին</span>
      </div>
      <div className="flex flex-col items-stretch justify-center gap-3 border-l border-[var(--border)] p-6 max-[1080px]:col-span-full max-[1080px]:flex-row max-[1080px]:border-t max-[1080px]:border-l-0 max-[1080px]:[&>*]:flex-1 max-[800px]:col-auto max-[800px]:flex-col max-[800px]:p-5">
        <Button className="min-h-14" icon={CalendarBlank} onClick={() => onConsultation(null)}>Ամրագրել խորհրդատվություն</Button>
        <a className="flex min-h-[42px] items-center justify-center gap-2 text-[13px] font-bold" href={`tel:${phoneHref}`}><Phone size={19} weight="fill" />{phoneDisplay}</a>
      </div>
    </section>
  );
}
