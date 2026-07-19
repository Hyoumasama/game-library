"use client";

import Image from "next/image";

const nextImageHosts = new Set([
  "images.igdb.com",
  "cdn.cloudflare.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "shared.cloudflare.steamstatic.com",
  "steamcdn-a.akamaihd.net",
  "cdn2.steamgriddb.com",
  "i.playground.ru",
]);

function canUseNextImage(src: string) {
  if (src.startsWith("/")) return true;

  try {
    return nextImageHosts.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export default function SafeImage({
  src,
  alt,
  className,
  sizes,
  fill,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading="lazy"
      className={fill ? `absolute inset-0 ${className || ""}` : className}
    />
  );
}
