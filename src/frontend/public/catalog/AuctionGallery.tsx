import { useEffect, useState } from "react";
import type { AuctionCatalogLot } from "../../../domain/auctionCatalog";
import { auctionLotDisplayName } from "../../../domain/auctionCatalog";
import { classNames } from "../shared/utils";
import { AuctionPhoto, AuctionPhotoPlaceholder } from "./AuctionPhoto";

export function AuctionGallery({ lot }: { lot: AuctionCatalogLot }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const name = auctionLotDisplayName(lot);
  const photos = lot.photoUrls;

  useEffect(() => setActiveIndex(0), [lot.id]);

  if (!photos.length) {
    return <AuctionPhotoPlaceholder className="min-h-[520px] w-full rounded-[18px] max-[1080px]:min-h-[430px] max-[800px]:min-h-[300px]" />;
  }

  const safeIndex = Math.min(activeIndex, photos.length - 1);

  return (
    <section aria-label={`${name} լուսանկարներ`}>
      <div className="relative overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--media-surface)]">
        <AuctionPhoto className="h-[560px] w-full object-contain max-[1240px]:h-[500px] max-[1080px]:h-[430px] max-[800px]:h-[320px]" url={photos[safeIndex]} alt={`${name}, լուսանկար ${safeIndex + 1}`} loading={safeIndex === 0 ? "eager" : "lazy"} />
        <span className="absolute right-3 bottom-3 rounded-full bg-[rgba(17,17,15,0.82)] px-3 py-2 text-[10px] font-bold text-white" aria-live="polite">{safeIndex + 1} / {photos.length}</span>
      </div>

      {photos.length > 1 ? (
        <div className="mt-3 grid grid-cols-6 gap-2.5 max-[1080px]:grid-cols-5 max-[800px]:grid-cols-4 max-[480px]:grid-cols-3" role="group" aria-label="Ընտրել լուսանկարը">
          {photos.map((photo, index) => (
            <button
              className={classNames("h-[88px] cursor-pointer overflow-hidden rounded-[10px] border-2 bg-[var(--media-surface)] p-0 max-[800px]:h-[72px]", index === safeIndex ? "border-[var(--yellow-hover)] shadow-[0_0_0_2px_rgba(255,196,0,0.2)]" : "border-transparent hover:border-[var(--border-strong)]")}
              type="button"
              key={photo}
              aria-label={`Ցուցադրել ${index + 1}-րդ լուսանկարը`}
              aria-pressed={index === safeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <AuctionPhoto className="h-full w-full object-cover" url={photo} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
