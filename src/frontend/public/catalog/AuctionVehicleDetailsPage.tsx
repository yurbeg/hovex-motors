import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarBlank,
  ClockCounterClockwise,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AuctionCatalogLot } from "../../../domain/auctionCatalog";
import {
  auctionLotDisplayName,
  auctionLotLeadContext,
} from "../../../domain/auctionCatalog";
import type { LeadRequestKind } from "../../../domain/lead";
import { loadAuctionCatalogLot } from "../../../infrastructure/supabase/auctionCatalogRepository";
import { submitPublicLead } from "../../../infrastructure/supabase/publicLeadRepository";
import { ConsultationModal } from "../consultation/ConsultationModal";
import { PublicFooter } from "../layout/PublicFooter";
import { PublicHeader } from "../layout/PublicHeader";
import { pageShellClasses } from "../shared/styles";
import { classNames, phoneHref } from "../shared/utils";
import {
  AUCTION_VALUE_UNAVAILABLE,
  formatAuctionDate,
  formatAuctionDateTime,
  formatAuctionMoney,
  formatAuctionOdometer,
  formatCharacteristicValue,
} from "./auctionCatalogFormatters";
import { AuctionGallery } from "./AuctionGallery";
import { AuctionProductActions } from "./AuctionProductActions";
import { CatalogMobileActionBar } from "./CatalogMobileActionBar";

type DetailState = "loading" | "ready" | "not-found" | "error";

function characteristicLabel(key: string): string {
  const labels: Record<string, string> = {
    keys_available: "Բանալիները հասանելի են",
    airbags: "Անվտանգության բարձիկներ",
    title_type: "Փաստաթղթի տեսակ",
    detailed_title: "Մանրամասն փաստաթուղթ",
    condition: "Վիճակ",
    tags: "Նշումներ",
    is_timed_auction: "Ժամանակային աճուրդ",
    auction_type: "Աճուրդի տեսակ",
  };
  return labels[key] || key.replaceAll("_", " ");
}

function DetailMessage({ state, onRetry }: { state: DetailState; onRetry: () => void }) {
  const notFound = state === "not-found";
  return (
    <main className={classNames(pageShellClasses, "grid min-h-[62vh] place-items-center py-16")}>
      <div className="flex w-full max-w-[680px] flex-col items-center rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]" role={state === "error" ? "alert" : undefined}>
        <span className="grid size-[68px] place-items-center rounded-full bg-[var(--yellow-pale)] text-[var(--ink)]"><WarningCircle size={35} weight="fill" aria-hidden="true" /></span>
        <h1 className="mt-5 mb-2 text-2xl">{notFound ? "Լոտը հասանելի չէ" : "Լոտը չբեռնվեց"}</h1>
        <p className="m-0 max-w-[560px] text-sm leading-[1.65] text-[var(--ink-soft)]">{notFound ? "Այն կարող է վաճառված կամ հեռացված լինել և այլևս ակտիվ կատալոգում չցուցադրվել։" : "Կատալոգի տվյալները հիմա հասանելի չեն։ Նախկին տվյալները չեն փոխարինվել, փորձեք կրկին մի փոքր ուշ։"}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ink)] bg-[var(--ink)] px-4 text-xs font-bold text-[var(--paper)]" href="/catalog"><ArrowLeft size={17} weight="bold" aria-hidden="true" /> Վերադառնալ կատալոգ</a>
          {!notFound ? <button className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-bold" type="button" onClick={onRetry}><ClockCounterClockwise size={17} weight="bold" aria-hidden="true" /> Կրկին փորձել</button> : null}
        </div>
      </div>
    </main>
  );
}

export function AuctionVehicleDetailsPage({ lotId }: { lotId: string }) {
  const [lot, setLot] = useState<AuctionCatalogLot | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const [requestKind, setRequestKind] = useState<LeadRequestKind | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState("loading");

    void loadAuctionCatalogLot(lotId, controller.signal).then((item) => {
      if (!active || controller.signal.aborted) return;
      setLot(item);
      setState(item ? "ready" : "not-found");
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      setLot(null);
      setState("error");
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [lotId, reloadToken]);

  useEffect(() => {
    document.body.classList.add("auction-product-page");
    return () => document.body.classList.remove("auction-product-page");
  }, []);

  useEffect(() => {
    if (requestKind === null) return undefined;
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [requestKind]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = lot ? `${auctionLotDisplayName(lot)} | Hovex Motors` : "Copart լոտ | Hovex Motors";
    return () => { document.title = previousTitle; };
  }, [lot]);

  const extraCharacteristics = useMemo(() => {
    if (!lot) return [];
    return Object.entries(lot.characteristics).flatMap(([key, value]) => {
      const formatted = formatCharacteristicValue(value);
      return formatted ? [[characteristicLabel(key), formatted] as const] : [];
    });
  }, [lot]);

  const callHovex = () => window.location.assign(`tel:${phoneHref}`);

  if (state === "loading") {
    return (
      <>
        <PublicHeader page="catalog" onConsultation={callHovex} />
        <main className={classNames(pageShellClasses, "py-10")} aria-busy="true">
          <div className="h-6 w-44 animate-pulse rounded bg-[var(--skeleton)] motion-reduce:animate-none" />
          <div className="mt-7 grid grid-cols-[1.35fr_0.65fr] gap-7 max-[1080px]:grid-cols-1">
            <div className="h-[560px] animate-pulse rounded-[18px] bg-[var(--skeleton)] motion-reduce:animate-none max-[800px]:h-[320px]" />
            <div className="h-[500px] animate-pulse rounded-[18px] bg-[var(--skeleton)] motion-reduce:animate-none" />
          </div>
          <span className="sr-only" role="status">Լոտը բեռնվում է</span>
        </main>
        <PublicFooter />
        <CatalogMobileActionBar detail />
      </>
    );
  }

  if (!lot || state !== "ready") {
    return (
      <>
        <PublicHeader page="catalog" onConsultation={callHovex} />
        <DetailMessage state={state} onRetry={() => setReloadToken((value) => value + 1)} />
        <PublicFooter />
        <CatalogMobileActionBar detail />
      </>
    );
  }

  const name = auctionLotDisplayName(lot);
  const leadContext = auctionLotLeadContext(lot);
  const specs: Array<[string, string]> = [
    ["Տարեթիվ", lot.year?.toString() || AUCTION_VALUE_UNAVAILABLE],
    ["Մակնիշ", lot.make || AUCTION_VALUE_UNAVAILABLE],
    ["Մոդել", lot.model || AUCTION_VALUE_UNAVAILABLE],
    ["Սերունդ", lot.generation || AUCTION_VALUE_UNAVAILABLE],
    ["VIN", lot.vin || AUCTION_VALUE_UNAVAILABLE],
    ["Թափք", lot.bodyType || AUCTION_VALUE_UNAVAILABLE],
    ["Մեքենայի տեսակ", lot.vehicleType || AUCTION_VALUE_UNAVAILABLE],
    ["Գույն", lot.color || AUCTION_VALUE_UNAVAILABLE],
    ["Շարժիչ", lot.engine || AUCTION_VALUE_UNAVAILABLE],
    ["Գլաններ", lot.cylinders?.toString() || AUCTION_VALUE_UNAVAILABLE],
    ["Վառելիք", lot.fuelType || AUCTION_VALUE_UNAVAILABLE],
    ["Փոխանցման տուփ", lot.transmission || AUCTION_VALUE_UNAVAILABLE],
    ["Քարշակ", lot.driveWheel || AUCTION_VALUE_UNAVAILABLE],
    ["Վազք", formatAuctionOdometer(lot.odometerValue, lot.odometerUnit, lot.odometerStatus)],
    ["Հիմնական վնասվածք", lot.primaryDamage || AUCTION_VALUE_UNAVAILABLE],
    ["Երկրորդային վնասվածք", lot.secondaryDamage || AUCTION_VALUE_UNAVAILABLE],
  ];

  return (
    <>
      <PublicHeader page="catalog" onConsultation={callHovex} />
      <main className="pb-16">
        <div className={classNames(pageShellClasses, "pt-7 pb-5")}>
          <a className="inline-flex min-h-10 items-center gap-2 text-xs font-bold hover:underline" href="/catalog"><ArrowLeft size={18} weight="bold" aria-hidden="true" /> Վերադառնալ կատալոգ</a>
        </div>

        <section className={classNames(pageShellClasses, "grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] items-start gap-7 max-[1080px]:grid-cols-1")}>
          <div className="min-w-0 [grid-column:1] [grid-row:1]">
            <AuctionGallery lot={lot} />
          </div>

          <aside className="sticky top-24 self-start overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] [grid-column:2] [grid-row:1/span_2] max-[1080px]:static max-[1080px]:[grid-column:1] max-[1080px]:[grid-row:2]">
            <div className="border-b border-[var(--border)] p-6 max-[800px]:p-5">
              <p className="m-0 text-[10px] font-black tracking-[0.06em] text-[var(--yellow-ink)] uppercase">Copart · լոտ {lot.lotNumber || lot.providerLotId}</p>
              <h1 className="mt-2 mb-0 text-[clamp(27px,3vw,38px)] leading-[1.26] font-bold">{name}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
                {lot.status ? <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2">{lot.status}</span> : null}
                {lot.location ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-3 py-2"><MapPin size={15} aria-hidden="true" />{lot.location}</span> : null}
                {lot.saleDate ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-3 py-2"><CalendarBlank size={15} aria-hidden="true" />{formatAuctionDate(lot.saleDate)}</span> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-6 max-[480px]:grid-cols-1 max-[800px]:p-5">
              <div className="rounded-[13px] border border-[var(--yellow-border)] bg-[var(--yellow-pale)] p-4">
                <span className="block text-[11px] font-bold text-[var(--yellow-ink)]">Ընթացիկ խաղադրույք</span>
                <strong className="mt-1 block text-[24px] leading-[1.25]">{formatAuctionMoney(lot.currentBid, lot.currency)}</strong>
                {lot.currentBidUpdatedAt ? <small className="mt-2 block text-[9px] leading-[1.45] text-[var(--yellow-ink)]">Թարմացված՝ {formatAuctionDateTime(lot.currentBidUpdatedAt)}</small> : null}
              </div>
              <div className="rounded-[13px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <span className="block text-[11px] font-bold text-[var(--ink-soft)]">Գնել հիմա</span>
                <strong className="mt-1 block text-[24px] leading-[1.25]">{formatAuctionMoney(lot.buyNowPrice, lot.currency)}</strong>
                {lot.buyNowUpdatedAt ? <small className="mt-2 block text-[9px] leading-[1.45] text-[var(--muted)]">Թարմացված՝ {formatAuctionDateTime(lot.buyNowUpdatedAt)}</small> : null}
              </div>
            </div>

            <p className="mx-6 mt-0 mb-5 flex items-start gap-2 rounded-[11px] bg-[var(--orange-pale)] p-3 text-[10px] leading-[1.55] text-[var(--orange-ink)] max-[800px]:mx-5"><WarningCircle className="mt-px shrink-0" size={18} weight="fill" aria-hidden="true" />Ընթացիկ խաղադրույքը, վաճառողի պահուստը կամ աճուրդից հետո գրանցված վերջին առաջարկը հաստատված վերջնական գնման արժեք չեն։ «Գնել հիմա» գինը նույնպես չի ներառում աճուրդի վճարները, առաքումը և ներմուծման ծախսերը։</p>

            <AuctionProductActions context={leadContext} onRequest={setRequestKind} />
          </aside>

          <div className="mt-1 grid gap-7 [grid-column:1] [grid-row:2] max-[1080px]:[grid-row:3]" aria-labelledby="lot-specifications-title">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 max-[800px]:p-5">
              <h2 className="m-0 text-2xl" id="lot-specifications-title">Մեքենայի բնութագրերը</h2>
              <dl className="mt-5 mb-0 grid grid-cols-2 gap-x-8 max-[700px]:grid-cols-1 [&>div]:grid [&>div]:min-h-12 [&>div]:grid-cols-[0.9fr_1.1fr] [&>div]:items-center [&>div]:gap-4 [&>div]:border-t [&>div]:border-[var(--border)] [&>div]:py-2.5 [&_dt]:text-[11px] [&_dt]:text-[var(--muted)] [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-[11px] [&_dd]:font-bold">
                {specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                {extraCharacteristics.map(([label, value], index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </div>

            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 max-[800px]:p-5">
              <h2 className="m-0 text-xl">Աճուրդի տվյալներ</h2>
              <dl className="mt-5 mb-0 [&>div]:border-t [&>div]:border-[var(--border)] [&>div]:py-3 [&_dt]:text-[10px] [&_dt]:text-[var(--muted)] [&_dd]:mt-1 [&_dd]:mb-0 [&_dd]:break-words [&_dd]:text-[11px] [&_dd]:font-bold">
                <div><dt>Աղբյուր</dt><dd>Copart · {lot.sourceSlug}</dd></div>
                <div><dt>Լոտի համար</dt><dd>{lot.lotNumber || lot.providerLotId}</dd></div>
                <div><dt>Գտնվելու վայր</dt><dd>{lot.location || AUCTION_VALUE_UNAVAILABLE}</dd></div>
                <div><dt>Աճուրդի ամսաթիվ</dt><dd>{formatAuctionDateTime(lot.saleDate)}</dd></div>
                <div><dt>Մատակարարի վերջին թարմացում</dt><dd>{formatAuctionDateTime(lot.providerUpdatedAt)}</dd></div>
                <div><dt>Մեր բազա բեռնվել է</dt><dd>{formatAuctionDateTime(lot.fetchedAt)}</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <AuctionProductActions context={leadContext} onRequest={setRequestKind} variant="mobile" />
      {requestKind ? <ConsultationModal vehicleContext={leadContext} requestKind={requestKind} source="auction-catalog" onClose={() => setRequestKind(null)} onSubmitLead={submitPublicLead} /> : null}
    </>
  );
}
