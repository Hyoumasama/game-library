"use client";

import Image from "next/image";
import { useState, type MouseEventHandler } from "react";

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
  priority,
  loading,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  onClick?: MouseEventHandler<HTMLImageElement | HTMLDivElement>;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        onClick={onClick}
        className={`relative flex items-center justify-center bg-zinc-900 text-3xl text-transparent ${
          fill ? `absolute inset-0 ${className || ""}` : className || ""
        }`}
      >
        🎮
        <span className="absolute text-sm font-bold text-zinc-500">
          No image
        </span>
      </div>
    );
  }

  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : loading}
        className={className}
        onClick={onClick}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={loading || "lazy"}
      className={fill ? `absolute inset-0 ${className || ""}` : className}
      onClick={onClick as MouseEventHandler<HTMLImageElement>}
      onError={() => setFailed(true)}
    />
  );
}
