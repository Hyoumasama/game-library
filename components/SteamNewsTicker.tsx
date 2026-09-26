"use client";

import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SteamNewsTickerItem } from "@/lib/server/steamNews";

const KIND_BADGES = {
  update: { label: "Update", className: "bg-emerald-400 text-black" },
  news: { label: "News", className: "bg-cyan-300 text-black" },
} as const;

function formatDayLabel(publishedAt: string) {
  const published = new Date(publishedAt);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (published.getTime() >= startOfToday) return "Today";
  if (published.getTime() >= startOfToday - dayMs) return "Yesterday";
  return "This week";
}

// Steam-library style "What's New" row: the latest few announcement art cards
// for library games, laid out to fit the width (no scrolling); the full feed
// lives on /news.
export default function SteamNewsTicker({
  items,
  isAdmin,
}: {
  items: SteamNewsTickerItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function syncNews() {
    setIsSyncing(true);
    setSyncMessage("");

    try {
      const response = await fetch("/api/cron/steam-news", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setSyncMessage(data.error || "Sync failed");
        return;
      }

      setSyncMessage(`${data.upserted || 0} news`);
      router.refresh();
    } catch (error) {
      console.error("Steam news sync failed:", error);
      setSyncMessage("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  if (items.length === 0 && !isAdmin) return null;

  return (
    <section className="mb-10" aria-label="What's new for your Steam games">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-white md:text-2xl">What&apos;s New</h2>

        {isAdmin && (
          <button
            type="button"
            onClick={syncNews}
            disabled={isSyncing}
            aria-label="Sync Steam news"
            title="Sync Steam news"
            className="flex h-9 w-9 items-center justify-center rounded border border-cyan-300/40 bg-cyan-300 text-lg font-black leading-none text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "..." : "↻"}
          </button>
        )}

        {syncMessage && (
          <span className="text-xs font-black uppercase text-zinc-400">
            {syncMessage}
          </span>
        )}

        <Link
          href="/news"
          className="ml-auto text-xs font-black text-cyan-300 hover:text-white md:text-sm"
        >
          {"News ->"}
        </Link>

      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No Steam news this week. Use ↻ to sync.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-5">
          {items.map((item, index) => {
            const badge = KIND_BADGES[item.kind];

            return (
              <a
                key={item.gid}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${item.gameTitle}: ${item.title}`}
                // Two-up below lg: drop the 5th card so the grid stays 2x2.
                className={`group min-w-0 ${index === 4 ? "hidden lg:block" : ""}`}
              >
                <div
                  className="mb-1 text-[11px] font-black uppercase tracking-wide text-zinc-500"
                  suppressHydrationWarning
                >
                  {formatDayLabel(item.publishedAt)}
                </div>

                <div className="relative aspect-video overflow-hidden rounded bg-zinc-900 shadow-lg ring-1 ring-white/5 transition group-hover:ring-cyan-300/60">
                  {item.imageUrl ? (
                    <SafeImage
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="260px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-black text-zinc-600">
                      {item.gameTitle}
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black uppercase ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-cyan-300">
                  {item.title}
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="relative h-5 w-4 shrink-0 overflow-hidden rounded-sm bg-zinc-800">
                    {item.coverUrl && (
                      <SafeImage
                        src={item.coverUrl}
                        alt=""
                        fill
                        sizes="16px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="truncate text-xs text-zinc-400">
                    {item.gameTitle}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
