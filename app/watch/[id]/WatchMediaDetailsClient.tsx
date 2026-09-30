"use client";

import AppNav from "@/components/AppNav";
import SafeImage from "@/components/SafeImage";
import type {
  WatchEpisode,
  WatchMediaDetails,
  WatchSeason,
} from "@/lib/server/watch/library";
import { useIsAdmin } from "@/lib/useAdminStatus";
import { watchScore100 } from "@/lib/watchFilters";
import { HARD_DISK } from "@/lib/watchSources";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

// Only admins ever see the edit modal, so keep it out of everyone else's
// initial JS bundle.
const EditWorkModal = dynamic(() => import("@/components/watch/EditWorkModal"), {
  ssr: false,
});

type EpisodeFilter = "all" | "watched" | "unwatched" | "owned" | "not-owned";

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

// Out of 100, like game scores.
function scoreValue(details: WatchMediaDetails) {
  return watchScore100(details.media);
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

function filterEpisodes(
  episodes: WatchEpisode[],
  filter: EpisodeFilter,
  watchedIds: Set<number>
) {
  if (filter === "watched") return episodes.filter((episode) => watchedIds.has(episode.id));
  if (filter === "unwatched") return episodes.filter((episode) => !watchedIds.has(episode.id));
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

function OwnershipSummary({
  details,
  progress,
}: {
  details: WatchMediaDetails;
  progress: WatchProgress;
}) {
  const isMovie = details.media.format === "movie";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-black">Progress</h2>

      {isMovie ? (
        details.entry.watch_sources.includes(HARD_DISK) ? (
          <p className="mt-4 inline-flex rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-200">
            Movie on Hard Disk
          </p>
        ) : (
          <p className="mt-4 inline-flex rounded border border-zinc-700 bg-black/40 px-3 py-2 text-sm font-black text-zinc-300">
            Not on Hard Disk
          </p>
        )
      ) : details.officialEpisodesCount > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <SummaryMetric
            label="Watched"
            value={`${formatNumber(progress.watchedCount)} / ${formatNumber(progress.regularCount)}`}
          />
          <SummaryMetric
            label="Next Episode"
            value={
              progress.nextEpisode
                ? `S${progress.nextEpisode.seasonNumber} E${progress.nextEpisode.episodeNumber}`
                : "All watched"
            }
          />
          <SummaryMetric
            label="On Hard Disk"
            value={`${formatNumber(details.ownedEpisodesCount)} / ${formatNumber(details.officialEpisodesCount)}`}
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

function WatchedButton({
  watched,
  busy,
  onClick,
  label,
}: {
  watched: boolean;
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={busy}
      aria-pressed={watched}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-black transition disabled:opacity-50 ${
        watched
          ? "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300"
          : "border-zinc-600 bg-black/60 text-zinc-500 hover:border-emerald-400 hover:text-emerald-300"
      }`}
    >
      ✓
    </button>
  );
}

function EpisodeCard({
  episode,
  watched,
  canEdit,
  busy,
  onToggleWatched,
}: {
  episode: WatchEpisode;
  watched: boolean;
  canEdit: boolean;
  busy: boolean;
  onToggleWatched: () => void;
}) {
  return (
    <article
      className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[168px_1fr_auto] ${
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
            className={`object-cover ${watched ? "opacity-60" : ""}`}
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
              On Disk
            </span>
          )}
          {watched && (
            <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-black text-emerald-300">
              Watched
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

      {canEdit && (
        <div className="self-center">
          <WatchedButton
            watched={watched}
            busy={busy}
            onClick={onToggleWatched}
            label={watched ? `Mark episode ${episode.episode_number} unwatched` : `Mark episode ${episode.episode_number} watched`}
          />
        </div>
      )}
    </article>
  );
}

function SeasonAccordion({
  season,
  episodeFilter,
  watchedIds,
  canEdit,
  pending,
  onToggleEpisode,
  onToggleSeason,
}: {
  season: WatchSeason;
  episodeFilter: EpisodeFilter;
  watchedIds: Set<number>;
  canEdit: boolean;
  pending: Set<string>;
  onToggleEpisode: (episode: WatchEpisode) => void;
  onToggleSeason: (season: WatchSeason, watched: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(season.season_number !== 0);
  const visibleEpisodes = filterEpisodes(season.episodes, episodeFilter, watchedIds);
  const label = seasonOwnershipLabel(season);
  const watchedCount = season.episodes.filter((episode) => watchedIds.has(episode.id)).length;
  const seasonWatched = season.episodes.length > 0 && watchedCount === season.episodes.length;

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="grid w-full gap-3 p-4 text-left sm:grid-cols-[88px_1fr_auto]">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-label={isOpen ? "Collapse season" : "Expand season"}
          className="relative aspect-[2/3] w-20 overflow-hidden rounded bg-zinc-900"
        >
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
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="min-w-0 self-center text-left"
        >
          <p className="text-xs font-black uppercase text-cyan-300">
            {seasonSubtitle(season)}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            {seasonTitle(season)}
          </h3>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            {formatNumber(watchedCount)} / {formatNumber(season.officialEpisodesCount)} Watched
            {season.ownedEpisodesCount > 0 && (
              <>
                {" · "}
                {formatNumber(season.ownedEpisodesCount)} on Disk
              </>
            )}
          </p>
        </button>

        <div className="flex flex-wrap items-center gap-3 self-center">
          {canEdit && season.episodes.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleSeason(season, !seasonWatched)}
              disabled={pending.has(`season-${season.season_number}`)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-black transition disabled:opacity-50 ${
                seasonWatched
                  ? "border-zinc-600 text-zinc-300 hover:border-zinc-400"
                  : "border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10"
              }`}
            >
              {pending.has(`season-${season.season_number}`)
                ? "..."
                : seasonWatched
                  ? "Unmark season"
                  : "Mark season watched"}
            </button>
          )}
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
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? "Collapse season" : "Expand season"}
            className="text-lg font-black text-zinc-500"
          >
            {isOpen ? "-" : "+"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-zinc-800 p-4">
          {visibleEpisodes.length ? (
            visibleEpisodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                watched={watchedIds.has(episode.id)}
                canEdit={canEdit}
                busy={pending.has(`episode-${episode.id}`)}
                onToggleWatched={() => onToggleEpisode(episode)}
              />
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

function initialWatchedIds(details: WatchMediaDetails) {
  return new Set(
    details.seasons.flatMap((season) =>
      season.episodes.filter((episode) => episode.watched).map((episode) => episode.id)
    )
  );
}

// Client-side mirror of the server's progress numbers (regular seasons
// only), so the page can follow the ✓ buttons without a reload.
function watchProgress(seasons: WatchSeason[], watchedIds: Set<number>) {
  const episodes = seasons
    .filter((season) => season.season_number > 0)
    .flatMap((season) => season.episodes.map((episode) => ({ season, episode })));
  let lastWatchedIndex = -1;
  let watchedCount = 0;

  episodes.forEach(({ episode }, index) => {
    if (!watchedIds.has(episode.id)) return;
    watchedCount += 1;
    lastWatchedIndex = index;
  });

  const next = episodes[lastWatchedIndex + 1];

  return {
    watchedCount,
    regularCount: episodes.length,
    nextEpisode: next
      ? { seasonNumber: next.season.season_number, episodeNumber: next.episode.episode_number }
      : null,
  };
}

type WatchProgress = ReturnType<typeof watchProgress>;

// Watched-episode state for the work page. Clicks update it at once and are
// saved in the background; several can be in flight. The server replies with
// the entry's derived status, which replaces the local one. The page is not
// reloaded, so open seasons and scroll position stay put. New `details`
// (after the Edit modal saves) reset everything to the server's state.
function useWatchedEpisodes(details: WatchMediaDetails) {
  const [syncedDetails, setSyncedDetails] = useState(details);
  const [watchedIds, setWatchedIds] = useState(() => initialWatchedIds(details));
  const [status, setStatus] = useState(details.entry.watch_status);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const latestRequest = useRef(0);

  if (details !== syncedDetails) {
    setSyncedDetails(details);
    setWatchedIds(initialWatchedIds(details));
    setStatus(details.entry.watch_status);
  }

  function applyLocally(episodeIds: number[], watched: boolean) {
    setWatchedIds((current) => {
      const next = new Set(current);

      for (const id of episodeIds) {
        if (watched) next.add(id);
        else next.delete(id);
      }

      return next;
    });
  }

  async function update(
    key: string,
    body: { episodeId: number } | { seasonNumber: number },
    watched: boolean,
    episodeIds: number[]
  ) {
    const requestId = ++latestRequest.current;

    applyLocally(episodeIds, watched);
    setPending((current) => new Set(current).add(key));
    setError("");

    try {
      const response = await fetch(`/api/admin/watch/works/${details.media.id}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, watched }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update");

      // Replies can arrive out of order; only the newest click's status wins.
      if (requestId === latestRequest.current && data.entry?.watch_status) {
        setStatus(data.entry.watch_status);
      }
    } catch (updateError) {
      applyLocally(episodeIds, !watched);
      setError((updateError as Error).message);
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  return {
    watchedIds,
    status,
    pending,
    error,
    progress: watchProgress(details.seasons, watchedIds),
    toggleEpisode: (episode: WatchEpisode) => {
      const watched = !watchedIds.has(episode.id);
      update(`episode-${episode.id}`, { episodeId: episode.id }, watched, [episode.id]);
    },
    toggleSeason: (season: WatchSeason, watched: boolean) =>
      update(
        `season-${season.season_number}`,
        { seasonNumber: season.season_number },
        watched,
        season.episodes.map((episode) => episode.id)
      ),
  };
}

type WatchedState = ReturnType<typeof useWatchedEpisodes>;

function SeasonsList({
  details,
  canEdit,
  watchedState,
}: {
  details: WatchMediaDetails;
  canEdit: boolean;
  watchedState: WatchedState;
}) {
  const [episodeFilter, setEpisodeFilter] = useState<EpisodeFilter>("all");
  const { watchedIds, pending, error, toggleEpisode, toggleSeason } = watchedState;

  if (details.media.format === "movie") return null;

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
        <div className="flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-1">
          {[
            ["all", "All Episodes"],
            ["watched", "Watched"],
            ["unwatched", "Unwatched"],
            ["owned", "On Disk"],
            ["not-owned", "Not on Disk"],
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

      {error && <p className="mb-4 text-sm font-bold text-red-400">{error}</p>}

      <div className="space-y-4">
        {details.seasons.map((season) => (
          <SeasonAccordion
            key={season.id}
            season={season}
            episodeFilter={episodeFilter}
            watchedIds={watchedIds}
            canEdit={canEdit}
            pending={pending}
            onToggleEpisode={toggleEpisode}
            onToggleSeason={toggleSeason}
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
  const isAdmin = useIsAdmin();
  const watchedState = useWatchedEpisodes(details);
  const heroImage = details.media.backdrop_url || details.media.poster_url;
  const score = scoreValue(details);
  const factItems = useMemo<[string, string | null][]>(
    () => [
      ["Release Year", releaseYear(details.media.release_date)],
      ["Media Type", mediaTypeLabel(details.media.media_type)],
      ["Format", formatLabel(details.media.format)],
      ["Official Status", details.media.airing_status],
      [
        details.media.tmdb_score != null ? "TMDB Score" : "AniList Score",
        score != null ? String(score) : null,
      ],
      [
        "Duration",
        details.media.episode_duration
          ? `${details.media.episode_duration} min`
          : null,
      ],
      [
        "Official Seasons",
        details.media.format !== "movie" && details.officialSeasonsCount > 0
          ? formatNumber(details.officialSeasonsCount)
          : null,
      ],
      [
        "Official Episodes",
        details.media.format !== "movie" && details.officialEpisodesCount > 0
          ? formatNumber(details.officialEpisodesCount)
          : null,
      ],
      [
        "Owned Episodes",
        details.media.format !== "movie" && details.officialEpisodesCount > 0
          ? formatNumber(details.ownedEpisodesCount)
          : null,
      ],
      ["Watch Status", watchedState.status],
    ],
    [details, score, watchedState.status]
  );

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.11),transparent_32%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

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
                  {watchedState.status}
                </span>
                {details.entry.watch_sources.map((source) => (
                  <span
                    key={source}
                    className={`rounded border px-3 py-1 text-xs font-black ${
                      source === HARD_DISK
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-pink-400/30 bg-pink-400/10 text-pink-200"
                    }`}
                  >
                    {source}
                  </span>
                ))}
                {isAdmin && (
                  <span className="ml-auto">
                    {/* Remount on every save so the form reopens with the saved values. */}
                    <EditWorkModal
                      key={details.entry.updated_at}
                      details={details}
                      currentStatus={watchedState.status}
                      watchedIds={watchedState.watchedIds}
                    />
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
          <OwnershipSummary details={details} progress={watchedState.progress} />
          <SeasonsList details={details} canEdit={isAdmin} watchedState={watchedState} />
        </div>
      </div>
    </main>
  );
}
