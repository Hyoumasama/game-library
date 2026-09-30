import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every route here is dynamic (force-dynamic / no revalidate), so by
    // default Next.js treats client-side navigation back to an
    // already-visited page as stale immediately and re-fetches it. This
    // keeps the last-visited copy of a dynamic route around for 30s so
    // clicking back-and-forth (e.g. All Games -> a game -> back) feels
    // instant instead of re-running every query.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    // next/image lists every width below (plus deviceSizes) in each image's
    // srcset. The defaults (16 widths, 16px-3840px) made srcsets alone over
    // 40% of the home and news page HTML. These cover what the site
    // actually renders: icons/thumbnails (16-116px, 1x and 2x), cards
    // (~155-300px) and full-width heroes.
    imageSizes: [32, 64, 128, 256],
    deviceSizes: [384, 640, 1080, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "shared.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "steamcdn-a.akamaihd.net",
      },
      {
        protocol: "https",
        hostname: "cdn2.steamgriddb.com",
      },
      {
        protocol: "https",
        hostname: "i.playground.ru",
      },
    ],
  },
};

export default nextConfig;
