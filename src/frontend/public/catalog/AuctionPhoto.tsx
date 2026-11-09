import { useEffect, useState } from "react";
import { ImageBroken } from "@phosphor-icons/react";
import { classNames } from "../shared/utils";

interface AuctionPhotoProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

export function AuctionPhotoPlaceholder({
  className = "",
  label = "Մեքենայի լուսանկարը հասանելի չէ",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={classNames("grid place-items-center bg-[#e9e5dd] text-[#7d776e]", className)}
      role="img"
      aria-label={label}
    >
      <span className="grid justify-items-center gap-2 px-4 text-center text-[11px] font-bold leading-[1.45]">
        <ImageBroken size={34} weight="duotone" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

export function AuctionPhoto({
  url,
  alt,
  className = "",
  loading = "lazy",
}: AuctionPhotoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return <AuctionPhotoPlaceholder className={className} />;
  }

  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
