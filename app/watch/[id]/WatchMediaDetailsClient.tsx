"use client";

import AppNav from "@/components/AppNav";
import SafeImage from "@/components/SafeImage";
import type {
  WatchEpisode,
  WatchMediaDetails,
  WatchSeason,
} from "@/lib/server/watch/library";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EpisodeFilter = "all" | "owned" | "not-owned";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function releaseYear(value: string | null) {
  return value ? String(value).slice(0, 4) : null;
}

function mediaTypeLabel(type: string) {
  if (type === "anime") return "Anime";
  if (type === "tv") return "TV Show";
  return "Movie";
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scoreValue(details: WatchMediaDetails) {
  return details.media.tmdb_score ?? details.media.anilist_score;
}

function seasonTitle(season: WatchSeason) {
  if (season.season_number === 0) return season.title || "Specials";

  return season.title || `Season ${season.season_number}`;
}

function seasonSubtitle(season: WatchSeason) {
  if (season.season_number === 0) return "Specials / Season 0";

  return `Season ${season.season_number}`;
}

function seasonOwnershipLabel(season: WatchSeason) {
  if (season.officialEpisodesCount <= 0) return "No Episodes";
  if (season.ownedEpisodesCount === season.officialEpisodesCount) {
    return "Fully Owned";
  }
  if (season.ownedEpisodesCount > 0) return "Partially Owned";

  return "Not Owned";
}

function filterEpisodes(episodes: WatchEpisode[], filter: EpisodeFilter) {
  if (filter === "owned") return episodes.filter((episode) => episode.owned);
  if (filter === "not-owned") {
    return episodes.filter((episode) => !episode.owned);
  }

  return episodes;
}

function HeroFact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3 backdrop-blur">
      <p className="text-xs font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function OwnershipSummary({ details }: { details: WatchMediaDetails }) {
  const isMovie = details.media.media_type === "movie";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-black">Library Ownership</h2>

      {isMovie ? (
        <p className="mt-4 inline-flex rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-200">
          Movie in Library
        </p>
      ) : details.officialEpisodesCount > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SummaryMetric
            label="Official Episodes"
            value={details.officialEpisodesCount}
          />
          <SummaryMetric label="Owned Episodes" value={details.ownedEpisodesCount} />
          <SummaryMetric
            label="Not Owned"
            value={Math.max(
              0,
              details.officialEpisodesCount - details.ownedEpisodesCount
            )}
          />
          <SummaryMetric
            label="Ownership"
            value={`${details.ownershipPercentage}%`}
          />
        </div>
      ) : (
        <p className="mt-4 rounded border border-zinc-800 bg-black px-3 py-3 text-sm font-bold text-zinc-500">
          Episode information is not available yet.
        </p>
      )}
    </section>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-3">
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function EpisodeCard({ episode }: { episode: WatchEpisode }) {
  return (
    <article
      className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[168px_1fr] ${
        episode.owned
          ? "border-cyan-300/45 bg-cyan-300/10"
          : "border-zinc-800 bg-black/60"
      }`}
    >
      <div className="relative aspect-video overflow-hidden rounded bg-zinc-900">
        {episode.still_url ? (
          <SafeImage
            src={episode.still_url}
            alt={episode.title || `Episode ${episode.episode_number}`}
            fill
            sizes="168px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-600">
            No still
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-white">
            Episode {episode.episode_number}
          </p>
          {episode.owned && (
            <span className="rounded border border-cyan-300/40 bg-cyan-300 px-2 py-0.5 text-xs font-black text-black">
              Owned
            </span>
          )}
        </div>
        <h4 className="mt-1 text-base font-black text-white">
          {episode.title || "Untitled"}
        </h4>
        {episode.overview && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
            {episode.overview}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-zinc-500">
          {formatDate(episode.air_date) && (
            <span>{formatDate(episode.air_date)}</span>
          )}
          {episode.duration ? <span>{episode.duration} min</span> : null}
        </div>
      </div>
    </article>
  );
}

function SeasonAccordion({
  season,
  episodeFilter,
}: {
  season: WatchSeason;
  episodeFilter: EpisodeFilter;
}) {
  const [isOpen, setIsOpen] = useState(season.season_number !== 0);
  const visibleEpisodes = filterEpisodes(season.episodes, episodeFilter);
  const label = seasonOwnershipLabel(season);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="grid w-full gap-3 p-4 text-left sm:grid-cols-[88px_1fr_auto]"
      >
        <div className="relative aspect-[2/3] w-20 overflow-hidden rounded bg-zinc-900">
          {season.poster_url ? (
            <SafeImage
              src={season.poster_url}
              alt={seasonTitle(season)}
              fill
              sizes="88px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-600">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 self-center">
          <p className="text-xs font-black uppercase text-cyan-300">
            {seasonSubtitle(season)}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            {seasonTitle(season)}
          </h3>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            {formatNumber(season.ownedEpisodesCount)} /{" "}
            {formatNumber(season.officialEpisodesCount)} Owned
          </p>
        </div>

        <div className="flex items-center gap-3 self-center">
          <span
            className={`rounded border px-2 py-1 text-xs font-black ${
              label === "Fully Owned"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : label === "Partially Owned"
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
            }`}
          >
            {label}
          </span>
          <span className="text-lg font-black text-zinc-500">
            {isOpen ? "-" : "+"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-zinc-800 p-4">
          {visibleEpisodes.length ? (
            visibleEpisodes.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))
          ) : (
            <p className="rounded border border-zinc-800 bg-black p-3 text-sm font-bold text-zinc-500">
              No episodes match this filter.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SeasonsList({ details }: { details: WatchMediaDetails }) {
  const [episodeFilter, setEpisodeFilter] = useState<EpisodeFilter>("all");

  if (details.media.media_type === "movie") return null;

  if (!details.seasons.length) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-xl font-black">Seasons</h2>
        <p className="mt-4 rounded border border-zinc-800 bg-black px-3 py-3 text-sm font-bold text-zinc-500">
          Episode information is not available yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black">Seasons</h2>
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
          {[
            ["all", "All Episodes"],
            ["owned", "Owned"],
            ["not-owned", "Not Owned"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setEpisodeFilter(value as EpisodeFilter)}
              className={`rounded-md px-3 py-2 text-xs font-black ${
                episodeFilter === value
                  ? "bg-cyan-300 text-black"
                  : "text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {details.seasons.map((season) => (
          <SeasonAccordion
            key={season.id}
            season={season}
            episodeFilter={episodeFilter}
          />
        ))}
      </div>
    </section>
  );
}

export default function WatchMediaDetailsClient({
  details,
}: {
  details: WatchMediaDetails;
}) {
  const router = useRouter();
  const [usedFallback, setUsedFallback] = useState(false);
  const heroImage = details.media.backdrop_url || details.media.poster_url;
  const score = scoreValue(details);
  const factItems = useMemo<[string, string | null][]>(
    () => [
      ["Release Year", releaseYear(details.media.release_date)],
      ["Media Type", mediaTypeLabel(details.media.media_type)],
      ["Format", formatLabel(details.media.format)],
      ["Official Status", details.media.airing_status],
      [score === details.media.tmdb_score ? "TMDB Score" : "AniList Score", score ? String(score) : null],
      [
        "Duration",
        details.media.episode_duration
          ? `${details.media.episode_duration} min`
          : null,
      ],
      [
        "Official Seasons",
        details.media.media_type !== "movie" && details.officialSeasonsCount > 0
          ? formatNumber(details.officialSeasonsCount)
          : null,
      ],
      [
        "Official Episodes",
        details.media.media_type !== "movie" && details.officialEpisodesCount > 0
          ? formatNumber(details.officialEpisodesCount)
          : null,
      ],
      [
        "Owned Episodes",
        details.media.media_type !== "movie" && details.officialEpisodesCount > 0
          ? formatNumber(details.ownedEpisodesCount)
          : null,
      ],
      ["Watch Status", details.entry.watch_status],
    ],
    [details, score]
  );

  function goBack() {
    if (!usedFallback && window.history.length > 1) {
      setUsedFallback(true);
      router.back();
      window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          router.replace("/watch");
        }
      }, 350);
      return;
    }

    router.replace("/watch");
  }

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.11),transparent_32%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <button
          type="button"
          onClick={goBack}
          className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-black text-white hover:border-cyan-300"
        >
          Back to Watch
        </button>

        <section className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          {heroImage && (
            <SafeImage
              src={heroImage}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-25"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/45" />

          <div className="relative grid gap-6 p-5 md:grid-cols-[220px_1fr] md:p-8">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
              {details.media.poster_url ? (
                <SafeImage
                  src={details.media.poster_url}
                  alt={details.media.title}
                  fill
                  sizes="220px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-black text-zinc-600">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                  {mediaTypeLabel(details.media.media_type)}
                </span>
                <span className="rounded border border-zinc-700 bg-black/50 px-3 py-1 text-xs font-black text-zinc-200">
                  {details.entry.watch_status}
                </span>
                {details.media.media_type === "movie" && (
                  <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                    In Library
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                {details.media.title}
              </h1>
              {details.media.original_title &&
                details.media.original_title !== details.media.title && (
                  <p className="mt-2 text-lg font-bold text-zinc-400">
                    {details.media.original_title}
                  </p>
                )}
              {details.media.overview && (
                <p className="mt-5 max-w-4xl text-base leading-7 text-zinc-300">
                  {details.media.overview}
                </p>
              )}

              {details.media.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {details.media.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded border border-zinc-700 bg-black/45 px-2 py-1 text-xs font-bold text-zinc-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {details.media.studios.length > 0 && (
                <p className="mt-4 text-sm font-bold text-zinc-400">
                  Studios:{" "}
                  <span className="text-zinc-200">
                    {details.media.studios.join(", ")}
                  </span>
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {factItems.map(([label, value]) => (
                  <HeroFact key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <OwnershipSummary details={details} />
          <SeasonsList details={details} />
        </div>
      </div>
    </main>
  );
}
