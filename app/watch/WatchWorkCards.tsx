import SafeImage from "@/components/SafeImage";
import type { WatchLibraryItem } from "@/lib/server/watch/library";
import { watchScore100 } from "@/lib/watchFilters";
import { HARD_DISK } from "@/lib/watchSources";
import Link from "next/link";

// Poster cards shared by the watch home rows and the All Works grid, styled
// after the game cards on the games home and All Games pages.

// Shown out of 100 with the same colour bands as game scores.
function scoreClass(score: number) {
  if (score >= 76) return "bg-emerald-400 text-black";
  if (score >= 60) return "bg-yellow-400 text-black";
  return "bg-red-400 text-black";
}

// Posters are saved at TMDB w500 for the work page; cards are ~155-220px
// wide, so they load the w342 rendition TMDB serves at the same path.
function cardPosterUrl(url: string) {
  return url.replace("/t/p/w500/", "/t/p/w342/");
}

// Status colours, matching the game cards: Plan to Watch yellow, Completed
// turquoise, Dropped red, Watching blue.
const STATUS_STYLES: Record<string, { badge: string; bar: string }> = {
  Watching: { badge: "border-blue-400/40 text-blue-300", bar: "bg-blue-400" },
  Rewatching: { badge: "border-blue-400/40 text-blue-300", bar: "bg-blue-400" },
  Completed: { badge: "border-cyan-400/40 text-cyan-300", bar: "bg-cyan-400" },
  "Plan to Watch": { badge: "border-yellow-400/40 text-yellow-300", bar: "bg-yellow-400" },
  "On Hold": { badge: "border-purple-500/40 text-purple-300", bar: "bg-purple-400" },
  Dropped: { badge: "border-red-400/40 text-red-300", bar: "bg-red-400" },
};
const DEFAULT_STATUS_STYLE = { badge: "border-zinc-500/40 text-zinc-300", bar: "bg-zinc-400" };

function statusStyle(status: string) {
  return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
}

// Episodes on the hard disk when there are any, otherwise (streaming only)
// episodes watched.
function countLabel(item: WatchLibraryItem) {
  if (item.media.format === "movie") {
    return item.entry.watch_sources.includes(HARD_DISK) ? "Movie" : null;
  }

  if (item.ownedEpisodesCount > 0 && item.officialEpisodesCount > 0) {
    return `${item.ownedEpisodesCount}/${item.officialEpisodesCount}`;
  }

  if (item.regularEpisodesCount > 0) {
    return `${item.watchedEpisodesCount}/${item.regularEpisodesCount}`;
  }

  return null;
}

export function WatchPosterCard({
  item,
  showStatus = false,
  showNextEpisode = false,
  eager = false,
  sizes,
  className = "",
}: {
  item: WatchLibraryItem;
  showStatus?: boolean;
  // Continue Watching: the episode to watch next, above the count.
  showNextEpisode?: boolean;
  eager?: boolean;
  sizes: string;
  className?: string;
}) {
  const score = watchScore100(item.media);
  const count = countLabel(item);
  const next = showNextEpisode ? item.nextEpisode : null;
  const style = statusStyle(item.entry.watch_status);

  return (
    <Link
      href={`/watch/${item.media.id}`}
      aria-label={item.media.title}
      title={item.media.title}
      className={`group block overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/70 hover:shadow-cyan-950/40 ${className}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
        {item.media.poster_url ? (
          <SafeImage
            src={cardPosterUrl(item.media.poster_url)}
            alt={item.media.title}
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-black text-zinc-600">
            {item.media.title}
          </div>
        )}

        {score != null && (
          <span
            className={`absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${scoreClass(score)}`}
          >
            {score}
          </span>
        )}

        {showStatus && (
          <span
            className={`absolute right-3 top-3 rounded-full border bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase backdrop-blur-sm ${style.badge}`}
          >
            {item.entry.watch_status}
          </span>
        )}

        {(next || count) && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
            <div
              title={next?.title || undefined}
              className={`absolute bottom-3 left-1/2 flex min-w-[88px] -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-2xl border bg-black/70 px-3 py-1 text-center text-xs font-black leading-tight backdrop-blur-sm ${style.badge}`}
            >
              {next && (
                <span className="text-[10px] uppercase tracking-wide">
                  Next S{next.seasonNumber} E{next.episodeNumber}
                </span>
              )}
              {count && <span>{count}</span>}
            </div>
          </>
        )}

        {item.watchedPercentage > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-black/60"
            title={`${item.watchedPercentage}% watched`}
          >
            <div
              className={`h-full ${style.bar}`}
              style={{ width: `${item.watchedPercentage}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

// A home-page row: horizontal scroll on phones, a single grid row from md up.
export function WatchPosterRow({
  title,
  items,
  href,
  emptyMessage,
  showNextEpisode = false,
}: {
  title: string;
  items: WatchLibraryItem[];
  href: string;
  emptyMessage: string;
  showNextEpisode?: boolean;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>

        <Link
          href={href}
          className="text-xs font-black text-cyan-300 hover:text-white md:text-sm"
        >
          {"All Works ->"}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-7">
          {items.map((item, index) => (
            <WatchPosterCard
              key={item.entry.id}
              item={item}
              showNextEpisode={showNextEpisode}
              eager={index === 0}
              sizes="(min-width: 1024px) 14vw, (min-width: 768px) 20vw, 155px"
              className="w-[155px] shrink-0 md:w-auto"
            />
          ))}
        </div>
      )}
    </section>
  );
}
