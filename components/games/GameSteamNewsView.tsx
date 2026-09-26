"use client";

import SafeImage from "@/components/SafeImage";
import { useState } from "react";
import type { GameNewsItem, GameNewsPage } from "@/lib/server/gameSteamNews";

type KindFilter = "all" | "update" | "news";

const FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "update", label: "Updates" },
  { value: "news", label: "News" },
];

const KIND_BADGES = {
  update: { label: "Update", className: "bg-emerald-400 text-black" },
  news: { label: "News", className: "bg-cyan-300 text-black" },
} as const;

// Fixed zone so the server render and the browser agree on the date.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Riyadh",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

export default function GameSteamNewsView({
  appid,
  featured,
  initialList,
  initialNextBefore,
  fallbackImage,
}: {
  appid: number;
  featured: GameNewsItem[];
  initialList: GameNewsItem[];
  initialNextBefore: number | null;
  fallbackImage: string | null;
}) {
  const [list, setList] = useState(initialList);
  const [nextBefore, setNextBefore] = useState(initialNextBefore);
  const [filter, setFilter] = useState<KindFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const visibleList =
    filter === "all" ? list : list.filter((item) => item.kind === filter);

  async function loadMore() {
    if (!nextBefore) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(
        `/api/game-news?appid=${appid}&before=${nextBefore}`
      );
      const data = (await response.json()) as GameNewsPage & { error?: string };

      if (!response.ok) {
        setLoadError(data.error || "Couldn't load more news");
        return;
      }

      setList((current) => {
        const seen = new Set(current.map((item) => item.gid));
        return [...current, ...data.items.filter((item) => !seen.has(item.gid))];
      });
      setNextBefore(data.nextBefore);
    } catch (error) {
      console.error("Game news load failed:", error);
      setLoadError("Couldn't load more news");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-bold">Steam News</h2>
        <a
          href={`https://store.steampowered.com/news/app/${appid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs font-black text-cyan-300 hover:text-white md:text-sm"
        >
          {"View on Steam ->"}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4">
        {featured.map((item) => {
          const badge = KIND_BADGES[item.kind];
          const image = item.imageUrl || fallbackImage;

          return (
            <a
              key={item.gid}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group min-w-0"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition group-hover:ring-cyan-300/60">
                {image && (
                  <SafeImage
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 270px, 50vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
                <span
                  className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black uppercase ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {formatDate(item.publishedAt)}
              </div>
              <div className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-cyan-300">
                {item.title}
              </div>
            </a>
          );
        })}
      </div>

      {list.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              Older posts
            </h3>
            <div className="ml-auto flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-md px-3 py-1 text-xs font-black transition ${
                    filter === option.value
                      ? "bg-cyan-300 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-zinc-800/80">
            {visibleList.map((item) => {
              const badge = KIND_BADGES[item.kind];

              return (
                <li key={item.gid}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 py-2.5"
                  >
                    <span
                      className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-black uppercase ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200 group-hover:text-cyan-300">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDate(item.publishedAt)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {visibleList.length === 0 && (
            <p className="py-4 text-sm text-zinc-500">
              No {filter === "update" ? "updates" : "news"} in the loaded posts.
            </p>
          )}

          {nextBefore && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoading}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-bold text-white transition hover:border-cyan-300/60 disabled:opacity-60"
              >
                {isLoading ? "Loading..." : "Load more"}
              </button>
              {loadError && <span className="text-xs text-red-300">{loadError}</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
