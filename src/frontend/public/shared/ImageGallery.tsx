import { useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { CaretLeft, CaretRight, ImageBroken } from "@phosphor-icons/react";
import { classNames, handleVehicleImageError } from "./utils";

export type GalleryNavigationKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

export function normalizeGalleryIndex(index: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return ((index % imageCount) + imageCount) % imageCount;
}

export function galleryIndexForKey(
  key: string,
  currentIndex: number,
  imageCount: number,
): number | null {
  if (imageCount <= 0) return null;
  if (key === "ArrowLeft") return normalizeGalleryIndex(currentIndex - 1, imageCount);
  if (key === "ArrowRight") return normalizeGalleryIndex(currentIndex + 1, imageCount);
  if (key === "Home") return 0;
  if (key === "End") return imageCount - 1;
  return null;
}

export function gallerySwipeStep(
  deltaX: number,
  deltaY: number,
  threshold = 44,
): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) <= Math.abs(deltaY)) return 0;
  return deltaX < 0 ? 1 : -1;
}

interface ImageGalleryProps {
  images: readonly string[];
  name: string;
  imagePosition?: string;
  emptyLabel?: string;
  className?: string;
}

interface PointerOrigin {
  x: number;
  y: number;
  id: number;
}

export function ImageGallery({
  images,
  name,
  imagePosition = "50% 50%",
  emptyLabel = "Մեքենայի լուսանկարը հասանելի չէ",
  className,
}: ImageGalleryProps) {
  const galleryImages = useMemo(
    () => images.filter((image): image is string => typeof image === "string" && Boolean(image.trim())),
    [images],
  );
  const galleryIdentity = galleryImages.join("\u0000");
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerOriginRef = useRef<PointerOrigin | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => setActiveIndex(0), [galleryIdentity]);

  const safeIndex = normalizeGalleryIndex(activeIndex, galleryImages.length);
  const hasMultipleImages = galleryImages.length > 1;

  useEffect(() => {
    if (!hasMultipleImages) return;
    const strip = thumbnailStripRef.current;
    const thumbnail = thumbnailRefs.current[safeIndex];
    if (!strip || !thumbnail) return;
    const itemLeft = thumbnail.offsetLeft;
    const itemRight = itemLeft + thumbnail.offsetWidth;
    if (itemLeft < strip.scrollLeft) strip.scrollLeft = itemLeft;
    else if (itemRight > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = itemRight - strip.clientWidth;
    }
  }, [hasMultipleImages, safeIndex]);

  const selectIndex = (index: number): void => {
    setActiveIndex(normalizeGalleryIndex(index, galleryImages.length));
  };

  const navigate = (step: -1 | 1): void => {
    setActiveIndex((current) => normalizeGalleryIndex(current + step, galleryImages.length));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const nextIndex = galleryIndexForKey(event.key, safeIndex, galleryImages.length);
    if (nextIndex === null) return;
    event.preventDefault();
    selectIndex(nextIndex);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!hasMultipleImages || event.pointerType === "mouse") return;
    pointerOriginRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const origin = pointerOriginRef.current;
    pointerOriginRef.current = null;
    if (!origin || origin.id !== event.pointerId) return;
    const step = gallerySwipeStep(event.clientX - origin.x, event.clientY - origin.y);
    if (step) navigate(step);
  };

  if (!galleryImages.length) {
    return (
      <div
        className={classNames("grid min-h-[520px] w-full place-items-center rounded-[18px] border border-[var(--border)] bg-[var(--media-surface)] text-[var(--ink-soft)] max-[1080px]:min-h-[430px] max-[800px]:min-h-[300px]", className)}
        role="img"
        aria-label={emptyLabel}
      >
        <span className="grid justify-items-center gap-2 px-4 text-center text-[11px] leading-[1.45] font-bold">
          <ImageBroken size={38} weight="duotone" aria-hidden="true" />
          {emptyLabel}
        </span>
      </div>
    );
  }

  const activeImage = galleryImages[safeIndex];

  return (
    <section
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${name} լուսանկարների պատկերասրահ`}
    >
      <div
        className="relative touch-pan-y overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--media-surface)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--yellow-hover)] focus-visible:ring-offset-3 focus-visible:ring-offset-[var(--paper)]"
        tabIndex={hasMultipleImages ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerOriginRef.current = null; }}
      >
        <img
          key={`${activeImage}-${safeIndex}`}
          className="h-[560px] w-full select-none object-contain motion-safe:animate-[motion-gallery-image-in_360ms_cubic-bezier(0.22,1,0.36,1)_both] max-[1240px]:h-[500px] max-[1080px]:h-[430px] max-[800px]:h-[320px]"
          src={activeImage}
          alt={`${name}, լուսանկար ${safeIndex + 1}՝ ${galleryImages.length}-ից`}
          style={{ objectPosition: imagePosition }}
          loading="eager"
          fetchPriority={safeIndex === 0 ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onError={handleVehicleImageError}
        />

        {hasMultipleImages ? (
          <>
            <button
              className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[rgba(255,255,255,0.65)] bg-[rgba(17,17,15,0.82)] text-white shadow-[0_6px_20px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-[rgba(17,17,15,0.94)] active:scale-95 motion-reduce:transition-none"
              type="button"
              aria-label="Ցուցադրել նախորդ լուսանկարը"
              onClick={() => navigate(-1)}
            >
              <CaretLeft size={22} weight="bold" aria-hidden="true" />
            </button>
            <button
              className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[rgba(255,255,255,0.65)] bg-[rgba(17,17,15,0.82)] text-white shadow-[0_6px_20px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-[rgba(17,17,15,0.94)] active:scale-95 motion-reduce:transition-none"
              type="button"
              aria-label="Ցուցադրել հաջորդ լուսանկարը"
              onClick={() => navigate(1)}
            >
              <CaretRight size={22} weight="bold" aria-hidden="true" />
            </button>
          </>
        ) : null}

        <span
          className="absolute right-3 bottom-3 rounded-full bg-[rgba(17,17,15,0.82)] px-3 py-2 text-[10px] font-bold text-white"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {safeIndex + 1} / {galleryImages.length}
        </span>
      </div>

      {hasMultipleImages ? (
        <div
          ref={thumbnailStripRef}
          className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
          role="group"
          aria-label="Ընտրել լուսանկարը"
        >
          {galleryImages.map((image, index) => (
            <button
              ref={(element) => { thumbnailRefs.current[index] = element; }}
              className={classNames(
                "h-[88px] w-[118px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-[10px] border-2 bg-[var(--media-surface)] p-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none max-[800px]:h-[72px] max-[800px]:w-[96px]",
                index === safeIndex
                  ? "border-[var(--yellow-hover)] shadow-[0_0_0_2px_rgba(255,196,0,0.2)]"
                  : "border-transparent hover:border-[var(--border-strong)]",
              )}
              type="button"
              key={`${image}-${index}`}
              aria-label={`Ցուցադրել ${index + 1}-րդ լուսանկարը՝ ${galleryImages.length}-ից`}
              aria-pressed={index === safeIndex}
              onClick={() => selectIndex(index)}
            >
              <img
                className="h-full w-full object-cover"
                src={image}
                alt=""
                style={{ objectPosition: imagePosition }}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={handleVehicleImageError}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
