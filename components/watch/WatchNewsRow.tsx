"use client";

import SafeImage from "@/components/SafeImage";
import {
  WATCH_NEWS_GROUPS,
  watchNewsBadge,
  watchNewsGroup,
  type WatchNewsGroup,
} from "@/components/watch/watchNewsBadges";
import type { WatchNewsItem } from "@/lib/server/watch/news";
import Link from "next/link";
import { useState } from "react";

const ROW_SIZE = 5;
const TIME_ZONE = "Asia/Riyadh";
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const shortDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});

function dayLabel(publishedAt: string, now: Date) {
  const published = new Date(publishedAt);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const key = dayKeyFormat.format(published);

  if (key === dayKeyFormat.format(now)) return "Today";
  if (key === dayKeyFormat.format(yesterday)) return "Yesterday";
  return shortDayFormat.format(published);
}

// The watch home's "What's New" row, mirroring the Steam news row on the
// games home: the latest few stories of the chosen group (anime or live
// action), with the full feed on /watch/news. `nowIso` comes from the server
// so the day labels render the same on both sides.
export default function WatchNewsRow({
  items,
  nowIso,
}: {
  items: WatchNewsItem[];
  nowIso: string;
}) {
  const [group, setGroup] = useState<WatchNewsGroup>("anime");
  const now = new Date(nowIso);
  const latest = items
    .filter((item) => watchNewsGroup(item.category) === group)
    .slice(0, ROW_SIZE);

  return (
    <section className="mb-10" aria-label="Latest news">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-white md:text-2xl">What&apos;s New</h2>

        <div role="tablist" aria-label="News section" className="flex rounded-lg border border-zinc-700 bg-zinc-950 p-0.5">
          {WATCH_NEWS_GROUPS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={group === option.value}
              onClick={() => setGroup(option.value)}
              className={`rounded-md px-3 py-1 text-xs font-black ${
                group === option.value ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Link
          href={group === "anime" ? "/watch/news" : "/watch/news?group=live-action"}
          className="ml-auto text-xs font-black text-cyan-300 hover:text-white md:text-sm"
        >
          {"News ->"}
        </Link>
      </div>

      {latest.length === 0 ? (
        <p className="text-sm text-zinc-500">News is unavailable right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-5">
          {latest.map((item, index) => {
            const badge = watchNewsBadge(item.category);

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                // Two-up below lg: drop the 5th card so the grid stays 2x2.
                className={`group min-w-0 ${index === 4 ? "hidden lg:block" : ""}`}
              >
                <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                  {dayLabel(item.publishedAt, now)}
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
                      {item.source}
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

                <div className="mt-1.5 truncate text-xs text-zinc-400">
                  {item.source}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
