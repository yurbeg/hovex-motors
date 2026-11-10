import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Car,
  ClockCounterClockwise,
  GasPump,
  Gauge,
  WarningCircle,
} from "@phosphor-icons/react";
import { loadPublicVehicles } from "../../../application/publicCatalog";
import type { LeadRequestKind } from "../../../domain/lead";
import type { Vehicle } from "../../../domain/vehicle";
import { submitPublicLead } from "../../../infrastructure/supabase/publicLeadRepository";
import { ConsultationModal } from "../consultation/ConsultationModal";
import { PublicFooter } from "../layout/PublicFooter";
import { PublicHeader } from "../layout/PublicHeader";
import { ImageGallery } from "../shared/ImageGallery";
import { pageShellClasses } from "../shared/styles";
import {
  classNames,
  formatUsd,
  formatUsdRange,
  phoneHref,
} from "../shared/utils";
import { InventoryStatusBadge } from "./InventoryStatusBadge";
import { VehicleProductActions } from "./VehicleProductActions";

type DetailState = "loading" | "ready" | "not-found" | "error";

interface VehicleDetailsPageProps {
  vehicleId: string | null;
}

interface DetailMessageProps {
  state: Exclude<DetailState, "loading" | "ready">;
  onRetry: () => void;
}

function DetailMessage({ state, onRetry }: DetailMessageProps) {
  const notFound = state === "not-found";
  return (
    <main className={classNames(pageShellClasses, "grid min-h-[62vh] place-items-center py-16")}>
      <div
        className="flex w-full max-w-[680px] flex-col items-center rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-[var(--shadow-sm)] max-[600px]:p-7"
        role={state === "error" ? "alert" : undefined}
        data-scroll-reveal="scale"
      >
        <span className="grid size-[68px] place-items-center rounded-full bg-[var(--yellow-pale)] text-[var(--yellow-ink)]">
          <WarningCircle size={35} weight="fill" aria-hidden="true" />
        </span>
        <h1 className="mt-5 mb-2 text-2xl">
          {notFound ? "Մեքենան հասանելի չէ" : "Մեքենան չբեռնվեց"}
        </h1>
        <p className="m-0 max-w-[560px] text-sm leading-[1.65] text-[var(--ink-soft)]">
          {notFound
            ? "Այն կարող է դեռ հրապարակված չլինել կամ այլևս չցուցադրվել Hovex-ի առաջարկներում։"
            : "Մեքենայի տվյալները հիմա հասանելի չեն։ Փորձեք կրկին մի փոքր ուշ։"}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--ink)] bg-[var(--ink)] px-4 text-xs font-bold text-[var(--paper)]" href="/#vehicles">
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Վերադառնալ մեքենաներին
          </a>
          {!notFound ? (
            <button className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-bold" type="button" onClick={onRetry}>
              <ClockCounterClockwise size={17} weight="bold" aria-hidden="true" />
              Կրկին փորձել
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function VehicleDetailsLoading() {
  return (
    <main className={classNames(pageShellClasses, "py-10")} aria-busy="true">
      <div className="h-6 w-48 animate-pulse rounded bg-[var(--skeleton)] motion-reduce:animate-none" />
      <div className="mt-7 grid grid-cols-[1.35fr_0.65fr] gap-7 max-[1080px]:grid-cols-1">
        <div className="h-[560px] animate-pulse rounded-[18px] bg-[var(--skeleton)] motion-reduce:animate-none max-[800px]:h-[320px]" />
        <div className="h-[500px] animate-pulse rounded-[18px] bg-[var(--skeleton)] motion-reduce:animate-none" />
      </div>
      <span className="sr-only" role="status">Մեքենան բեռնվում է</span>
    </main>
  );
}

interface VehicleDetailsContentProps {
  vehicle: Vehicle;
  fallbackWarning?: boolean;
  onRequest: (kind: LeadRequestKind) => void;
}

export function VehicleDetailsContent({
  vehicle,
  fallbackWarning = false,
  onRequest,
}: VehicleDetailsContentProps) {
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const images = vehicle.images.length ? vehicle.images : [vehicle.image];
  const specs: Array<[string, string]> = [
    ["Տարեթիվ", vehicle.year.toString()],
    ["Մակնիշ", vehicle.make],
    ["Մոդել", vehicle.model],
    ["Թափք", vehicle.body || "Նշված չէ"],
    ["Վազք", vehicle.mileage || "Նշված չէ"],
    ["Վառելիք", vehicle.fuel || "Նշված չէ"],
    ["Վիճակ / վնասվածք", vehicle.damage || "Նշված չէ"],
    ["Աղբյուր / աճուրդ", vehicle.auction || "Նշված չէ"],
  ];
  const base = vehicle.estimateMin;
  const breakdown: Array<[string, number]> = [
    ["Մեքենայի գնման սցենար", base * 0.46],
    ["Աճուրդի վճարներ", base * 0.08],
    ["ԱՄՆ տեղափոխում", base * 0.05],
    ["Ծովային առաքում", base * 0.13],
    ["Մաքսային գնահատում", base * 0.21],
    ["Hovex ծառայություն", base * 0.07],
  ];

  return (
    <main className="pb-16">
      <div className={classNames(pageShellClasses, "pt-7 pb-5")} data-scroll-reveal="up">
        <a className="inline-flex min-h-10 items-center gap-2 text-xs font-bold hover:underline" href="/#vehicles">
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Վերադառնալ մեքենաներին
        </a>
        {fallbackWarning ? (
          <p className="mt-3 mb-0 flex items-start gap-2 rounded-[11px] border border-[var(--orange-border)] bg-[var(--orange-pale)] p-3 text-[10px] leading-[1.55] font-bold text-[var(--orange-ink)]" role="status">
            <WarningCircle className="mt-px shrink-0" size={18} weight="fill" aria-hidden="true" />
            Ամպային տվյալները ժամանակավորապես հասանելի չեն․ ցուցադրվում է պահպանված տարբերակը։
          </p>
        ) : null}
      </div>

      <section className={classNames(pageShellClasses, "grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] items-start gap-7 max-[1080px]:grid-cols-1")}>
        <div className="min-w-0 [grid-column:1] [grid-row:1]" data-scroll-reveal="left">
          <ImageGallery images={images} name={name} imagePosition={vehicle.imagePosition} />
        </div>

        <aside className="sticky top-24 self-start overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] [grid-column:2] [grid-row:1/span_2] max-[1080px]:static max-[1080px]:[grid-column:1] max-[1080px]:[grid-row:2]" data-scroll-reveal="right" data-scroll-delay="80">
          <div className="border-b border-[var(--border)] p-6 max-[800px]:p-5">
            <p className="m-0 text-[10px] font-black tracking-[0.06em] text-[var(--yellow-ink)] uppercase">
              {vehicle.auction || "Hovex Motors"}
            </p>
            <h1 className="mt-2 mb-0 text-[clamp(27px,3vw,38px)] leading-[1.26] font-bold">{name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <InventoryStatusBadge status={vehicle.inventoryStatus} />
              {vehicle.badge.trim() ? <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2">{vehicle.badge}</span> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-6 max-[480px]:grid-cols-1 max-[800px]:p-5">
            <div className="rounded-[13px] border border-[var(--yellow-border)] bg-[var(--yellow-pale)] p-4">
              <span className="block text-[11px] font-bold text-[var(--yellow-ink)]">Հայաստան հասցնելու նախնական արժեք</span>
              <strong className="mt-1 block text-[24px] leading-[1.25]">{formatUsdRange(vehicle.estimateMin, vehicle.estimateMax)}</strong>
            </div>
            <div className="rounded-[13px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <span className="block text-[11px] font-bold text-[var(--ink-soft)]">Առաջարկվող առավելագույն խաղադրույք</span>
              <strong className="mt-1 block text-[24px] leading-[1.25]">{formatUsd(vehicle.maxBid)}</strong>
            </div>
          </div>

          <p className="mx-6 mt-0 mb-5 flex items-start gap-2 rounded-[11px] bg-[var(--orange-pale)] p-3 text-[10px] leading-[1.55] text-[var(--orange-ink)] max-[800px]:mx-5">
            <WarningCircle className="mt-px shrink-0" size={18} weight="fill" aria-hidden="true" />
            Գինը նախնական է և վերջնականապես հաստատվում է մեքենայի, աճուրդի վճարների ու առաքման տվյալների ստուգումից հետո։
          </p>

          <VehicleProductActions vehicle={vehicle} onRequest={onRequest} />
        </aside>

        <div className="mt-1 grid gap-7 [grid-column:1] [grid-row:2] max-[1080px]:[grid-row:3]" aria-labelledby="vehicle-specifications-title" data-scroll-stagger>
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 max-[800px]:p-5" data-scroll-reveal="up">
            <h2 className="m-0 text-2xl" id="vehicle-specifications-title">Մեքենայի բնութագրերը</h2>
            <dl className="mt-5 mb-0 grid grid-cols-2 gap-x-8 max-[700px]:grid-cols-1 [&>div]:grid [&>div]:min-h-12 [&>div]:grid-cols-[0.9fr_1.1fr] [&>div]:items-center [&>div]:gap-4 [&>div]:border-t [&>div]:border-[var(--border)] [&>div]:py-2.5 [&_dt]:text-[11px] [&_dt]:text-[var(--muted)] [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-[11px] [&_dd]:font-bold">
              {specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <div className="mt-5 grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
              <span className="flex min-h-14 items-center gap-2 rounded-[11px] bg-[var(--surface-soft)] px-3 text-xs font-bold"><Gauge size={19} className="text-[var(--yellow-ink)]" aria-hidden="true" />{vehicle.mileage || "Վազքը նշված չէ"}</span>
              <span className="flex min-h-14 items-center gap-2 rounded-[11px] bg-[var(--surface-soft)] px-3 text-xs font-bold"><GasPump size={19} className="text-[var(--yellow-ink)]" aria-hidden="true" />{vehicle.fuel || "Վառելիքը նշված չէ"}</span>
              <span className="flex min-h-14 items-center gap-2 rounded-[11px] bg-[var(--surface-soft)] px-3 text-xs font-bold"><Car size={19} className="text-[var(--yellow-ink)]" aria-hidden="true" />{vehicle.body || "Թափքը նշված չէ"}</span>
            </div>
          </div>

          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 max-[800px]:p-5" data-scroll-reveal="up">
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-8 max-[700px]:grid-cols-1 max-[700px]:gap-4">
              <div>
                <h2 className="m-0 text-xl">Ինչպես է ձևավորվում արժեքը</h2>
                <p className="mt-2 mb-0 text-[11px] leading-[1.6] text-[var(--ink-soft)]">Ցուցադրական կառուցվածք՝ հաշվարկի հիմնական մասերը հասկանալու համար։</p>
              </div>
              <div>
                {breakdown.map(([label, amount]) => (
                  <p className="m-0 flex min-h-[42px] items-center justify-between gap-5 border-b border-[var(--border)] text-[11px] text-[var(--ink)]" key={label}>
                    <span>{label}</span>
                    <strong className="whitespace-nowrap">մոտ {formatUsd(Math.round(amount / 50) * 50)}</strong>
                  </p>
                ))}
              </div>
            </div>
            <p className="mt-5 mb-0 flex items-start gap-2 rounded-[10px] bg-[var(--orange-pale)] px-3.5 py-3 text-[11px] leading-[1.55] text-[var(--orange-ink)]">
              <WarningCircle className="shrink-0" size={18} weight="fill" aria-hidden="true" />
              Վերանորոգման և հաշվառման ծախսերը ներառված չեն։ Վերջնական արժեքը հաստատվում է կոնկրետ մեքենայի ստուգումից հետո։
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function VehicleDetailsPage({ vehicleId }: VehicleDetailsPageProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [state, setState] = useState<DetailState>(vehicleId ? "loading" : "not-found");
  const [fallbackWarning, setFallbackWarning] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [requestKind, setRequestKind] = useState<LeadRequestKind | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setVehicle(null);
      setState("not-found");
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setState("loading");
    setFallbackWarning(false);

    void loadPublicVehicles({ signal: controller.signal }).then((result) => {
      if (!active || controller.signal.aborted) return;
      const item = result.items.find((candidate) => candidate.id === vehicleId && candidate.status === "published") || null;
      setVehicle(item);
      setFallbackWarning(Boolean(item && result.error));
      setState(item ? "ready" : result.error ? "error" : "not-found");
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      setVehicle(null);
      setState("error");
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, vehicleId]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model} | Hovex Motors`
      : "Մեքենայի մանրամասներ | Hovex Motors";
    return () => { document.title = previousTitle; };
  }, [vehicle]);

  useEffect(() => {
    if (requestKind === null) return undefined;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [requestKind]);

  const callHovex = (): void => window.location.assign(`tel:${phoneHref}`);

  if (state === "loading") {
    return (
      <>
        <PublicHeader page="vehicle" onConsultation={callHovex} />
        <VehicleDetailsLoading />
        <PublicFooter />
      </>
    );
  }

  if (!vehicle || state !== "ready") {
    return (
      <>
        <PublicHeader page="vehicle" onConsultation={callHovex} />
        <DetailMessage state={state === "not-found" ? "not-found" : "error"} onRetry={() => setReloadToken((value) => value + 1)} />
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader page="vehicle" onConsultation={() => setRequestKind("consultation")} />
      <VehicleDetailsContent vehicle={vehicle} fallbackWarning={fallbackWarning} onRequest={setRequestKind} />
      <PublicFooter />
      <VehicleProductActions vehicle={vehicle} onRequest={setRequestKind} variant="mobile" />
      {requestKind ? (
        <ConsultationModal
          selectedVehicle={vehicle}
          requestKind={requestKind}
          source="website"
          onClose={() => setRequestKind(null)}
          onSubmitLead={submitPublicLead}
        />
      ) : null}
    </>
  );
}
