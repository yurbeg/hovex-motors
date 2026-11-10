import {
  ArrowRight,
  CalendarBlank,
  Gauge,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AuctionCatalogLot } from "../../../domain/auctionCatalog";
import { auctionLotDisplayName } from "../../../domain/auctionCatalog";
import {
  formatAuctionDate,
  formatAuctionDateTime,
  formatAuctionMoney,
  formatAuctionOdometer,
} from "./auctionCatalogFormatters";
import { AuctionPhoto } from "./AuctionPhoto";

export function AuctionVehicleCard({ lot }: { lot: AuctionCatalogLot }) {
  const name = auctionLotDisplayName(lot);
  const detailUrl = `/catalog/${encodeURIComponent(lot.id)}`;

  return (
    <article className="group min-w-0 overflow-hidden rounded-[17px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_24px_rgba(17,17,15,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-[var(--shadow-sm)] motion-reduce:transition-none">
      <a className="relative block h-[230px] overflow-hidden bg-[var(--media-surface)] max-[1240px]:h-[215px] max-[800px]:h-[245px]" href={detailUrl} aria-label={`${name} մանրամասները`}>
        <AuctionPhoto className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" url={lot.photoUrls[0]} alt={name} />
        <span className="absolute top-3 left-3 rounded-full bg-[rgba(17,17,15,0.9)] px-2.5 py-2 text-[10px] leading-none font-black tracking-[0.05em] text-white">COPART</span>
        {lot.status ? <span className="absolute top-3 right-3 max-w-[55%] truncate rounded-full bg-[var(--surface-translucent)] px-2.5 py-2 text-[10px] leading-none font-bold text-[var(--ink)]">{lot.status}</span> : null}
      </a>

      <div className="p-[18px]">
        <p className="m-0 text-[10px] font-bold tracking-[0.04em] text-[var(--muted)]">Լոտ {lot.lotNumber || lot.providerLotId}</p>
        <h3 className="mt-1 mb-0 min-h-[52px] text-[19px] leading-[1.35] font-black max-[800px]:min-h-0">
          <a className="hover:underline" href={detailUrl}>{name}</a>
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--ink-soft)] max-[420px]:grid-cols-1 [&>span]:flex [&>span]:min-w-0 [&>span]:items-start [&>span]:gap-1.5 [&_svg]:mt-px [&_svg]:shrink-0 [&_svg]:text-[var(--yellow-ink)]">
          <span><Gauge size={17} />{formatAuctionOdometer(lot.odometerValue, lot.odometerUnit)}</span>
          <span><WarningCircle size={17} />{lot.primaryDamage || "Վնասվածքը նշված չէ"}</span>
          <span><MapPin size={17} />{lot.location || "Վայրը նշված չէ"}</span>
          <span><CalendarBlank size={17} />{formatAuctionDate(lot.saleDate)}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 max-[420px]:grid-cols-1">
          <div className="rounded-xl border border-[var(--yellow-border)] bg-[var(--yellow-pale)] px-3 py-3">
            <span className="block text-[10px] font-bold text-[var(--yellow-ink)]">Ընթացիկ խաղադրույք</span>
            <strong className="mt-1 block text-[17px] leading-[1.35]">{formatAuctionMoney(lot.currentBid, lot.currency)}</strong>
            {lot.currentBidUpdatedAt ? <small className="mt-1 block text-[8px] leading-[1.4] text-[var(--yellow-ink)]">Թարմացված՝ {formatAuctionDateTime(lot.currentBidUpdatedAt)}</small> : null}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3">
            <span className="block text-[10px] font-bold text-[var(--ink-soft)]">Գնել հիմա</span>
            <strong className="mt-1 block text-[17px] leading-[1.35]">{formatAuctionMoney(lot.buyNowPrice, lot.currency)}</strong>
            {lot.buyNowUpdatedAt ? <small className="mt-1 block text-[8px] leading-[1.4] text-[var(--muted)]">Թարմացված՝ {formatAuctionDateTime(lot.buyNowUpdatedAt)}</small> : null}
          </div>
        </div>

        <p className="mt-3 mb-0 text-[9px] leading-[1.5] text-[var(--muted)]">Խաղադրույքը կամ «Գնել հիմա» գինը վերջնական գնման ընդհանուր արժեք չէ։</p>
        <a className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-xs font-bold hover:underline" href={detailUrl}>Դիտել լոտը <ArrowRight size={17} weight="bold" aria-hidden="true" /></a>
      </div>
    </article>
  );
}
