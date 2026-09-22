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
