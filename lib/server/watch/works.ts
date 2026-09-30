import "server-only";

import { supabase } from "@/lib/supabase";
import {
  getTmdbImageUrl,
  getTmdbMovieDetails,
  getTmdbTvDetails,
  getTmdbTvSeasonDetails,
} from "@/lib/server/watch/tmdb";
import type {
  TmdbMovieDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbType,
} from "@/lib/server/watch/types";
import { parseEpisodeRanges } from "@/lib/watchEpisodeRanges";
import { HARD_DISK, withDiskSource } from "@/lib/watchSources";
import { normalizeWatchGenres } from "@/lib/watchGenres";

// Adding, editing and deleting watch-library works. Used by the admin API
// routes behind the Add Work / Edit Work modals and by scripts/watch.

export type WatchFormat = "series" | "movie" | "ova";

// Season number -> episode ranges text ("all", "", "1-12, 14"), used for
// both owned and watched episodes.
export type EpisodeRanges = Record<number, string>;

export class WatchWorkError extends Error {
  status: number;
  mediaId?: number;

  constructor(message: string, status: number, mediaId?: number) {
    super(message);
    this.name = "WatchWorkError";
    this.status = status;
    this.mediaId = mediaId;
  }
}

const INSERT_CHUNK_SIZE = 500;

function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function dateOrNull(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function scoreOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "watch-media";
}

async function chunkedInsert<T extends object>(table: string, rows: T[], columns: string) {
  const inserted: Record<string, unknown>[] = [];

  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .insert(rows.slice(start, start + INSERT_CHUNK_SIZE))
      .select(columns);

    if (error) throw error;
    inserted.push(...((data || []) as unknown as Record<string, unknown>[]));
  }

  return inserted;
}

// Everything in this library is anime, so media_type is always "anime" and
// only the format varies.
function mapMovieMedia(movie: TmdbMovieDetails, format: WatchFormat, fallbackTitle?: string) {
  const title = movie.title || fallbackTitle || `TMDB ${movie.id}`;

  return {
    title,
    original_title: movie.original_title || null,
    alternative_titles: uniqueStrings([fallbackTitle, movie.title, movie.original_title]),
    slug: slugify(title),
    media_type: "anime",
    format,
    tmdb_type: "movie",
    tmdb_id: movie.id,
    overview: movie.overview || null,
    poster_url: getTmdbImageUrl(movie.poster_path),
    backdrop_url: getTmdbImageUrl(movie.backdrop_path, "w1280"),
    release_date: dateOrNull(movie.release_date),
    end_date: null,
    airing_status: movie.status || null,
    tmdb_score: scoreOrNull(movie.vote_average),
    genres: normalizeWatchGenres((movie.genres || []).map((genre) => genre.name)),
    studios: [],
    total_episodes: 1,
    episode_duration: movie.runtime || null,
  };
}

function mapTvMedia(tv: TmdbTvDetails, format: WatchFormat, fallbackTitle?: string) {
  const title = tv.name || fallbackTitle || `TMDB ${tv.id}`;

  return {
    title,
    original_title: tv.original_name || null,
    alternative_titles: uniqueStrings([fallbackTitle, tv.name, tv.original_name]),
    slug: slugify(title),
    media_type: "anime",
    format,
    tmdb_type: "tv",
    tmdb_id: tv.id,
    overview: tv.overview || null,
    poster_url: getTmdbImageUrl(tv.poster_path),
    backdrop_url: getTmdbImageUrl(tv.backdrop_path, "w1280"),
    release_date: dateOrNull(tv.first_air_date),
    end_date: dateOrNull(tv.last_air_date),
    airing_status: tv.status || null,
    tmdb_score: scoreOrNull(tv.vote_average),
    genres: normalizeWatchGenres((tv.genres || []).map((genre) => genre.name)),
    studios: [],
    total_episodes: tv.number_of_episodes || null,
    episode_duration: tv.episode_run_time?.[0] || null,
  };
}

async function buildTvSeasons(tmdbId: number, tv: TmdbTvDetails) {
  const seasonNumbers = (tv.seasons || [])
    .map((season) => season.season_number)
    .filter((number): number is number => Number.isSafeInteger(number))
    .sort((a, b) => a - b);

  const details = await Promise.all(
    seasonNumbers.map((seasonNumber) => getTmdbTvSeasonDetails(tmdbId, seasonNumber))
  );

  return details.map((season: TmdbSeasonDetails) => ({
    season_number: season.season_number || 0,
    title: season.name || null,
    overview: season.overview || null,
    poster_url: getTmdbImageUrl(season.poster_path),
    air_date: dateOrNull(season.air_date),
    episode_count: season.episodes?.length || 0,
    tmdb_season_id: season.id,
    episodes: (season.episodes || [])
      .filter((episode) => Number.isSafeInteger(episode.episode_number))
      .map((episode) => ({
        episode_number: episode.episode_number,
        tmdb_episode_id: episode.id,
        title: episode.name || null,
        overview: episode.overview || null,
        air_date: dateOrNull(episode.air_date),
        still_url: getTmdbImageUrl(episode.still_path),
        duration: episode.runtime || null,
      })),
  }));
}

async function buildWatchPayload(
  tmdb: { id: number; type: TmdbType },
  format: WatchFormat,
  fallbackTitle?: string
) {
  if (tmdb.type === "movie") {
    const movie = await getTmdbMovieDetails(tmdb.id);

    return { media: mapMovieMedia(movie, format, fallbackTitle), seasons: [] };
  }

  const tv = await getTmdbTvDetails(tmdb.id);

  return {
    media: mapTvMedia(tv, format, fallbackTitle),
    seasons: await buildTvSeasons(tmdb.id, tv),
  };
}

// Season list for the Add Work form. Episodes are assumed to be numbered
// 1..episode_count; the server checks the real numbers when saving.
export async function getTmdbSeasonOutline(tmdbId: number) {
  const tv = await getTmdbTvDetails(tmdbId);

  return (tv.seasons || [])
    .filter((season) => Number.isSafeInteger(season.season_number))
    .sort((a, b) => (a.season_number || 0) - (b.season_number || 0))
    .map((season) => ({
      seasonNumber: season.season_number || 0,
      title: season.name || null,
      episodeCount: season.episode_count || 0,
    }));
}


function resolveRanges(
  seasons: { season_number: number; episodes: { episode_number: number }[] }[],
  ranges: EpisodeRanges
) {
  const picked: { seasonNumber: number; episodeNumber: number }[] = [];

  for (const season of seasons) {
    const text = ranges[season.season_number];

    if (!text) continue;

    const result = parseEpisodeRanges(
      text,
      season.episodes.map((episode) => episode.episode_number)
    );

    if ("error" in result) {
      throw new WatchWorkError(`Season ${season.season_number}: ${result.error}`, 400);
    }

    for (const episodeNumber of result.episodes) {
      picked.push({ seasonNumber: season.season_number, episodeNumber });
    }
  }

  return picked;
}

async function availableSlug(slug: string, tmdb: { id: number; type: TmdbType }) {
  const { data, error } = await supabase
    .from("watch_media")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (error) throw error;

  return data?.length ? `${slug}-tmdb-${tmdb.type}-${tmdb.id}` : slug;
}

// What addWatchWork would save, without writing anything.
export async function previewWatchWork({
  tmdbId,
  tmdbType,
  format,
  owned,
  fallbackTitle,
}: {
  tmdbId: number;
  tmdbType: TmdbType;
  format: WatchFormat;
  owned: EpisodeRanges;
  fallbackTitle?: string;
}) {
  const payload = await buildWatchPayload({ id: tmdbId, type: tmdbType }, format, fallbackTitle);

  return {
    title: payload.media.title,
    ownedEpisodes: resolveRanges(payload.seasons, owned).length,
  };
}

export async function addWatchWork({
  tmdbId,
  tmdbType,
  format,
  watchStatus,
  owned,
  watched = {},
  sources,
  fallbackTitle,
}: {
  tmdbId: number;
  tmdbType: TmdbType;
  format: WatchFormat;
  watchStatus: string;
  // Episodes on the hard disk; ignored unless sources includes "Hard Disk".
  owned: EpisodeRanges;
  // Episodes already watched.
  watched?: EpisodeRanges;
  sources: string[];
  fallbackTitle?: string;
}) {
  const tmdb = { id: tmdbId, type: tmdbType };
  const { data: existing, error: existingError } = await supabase
    .from("watch_media")
    .select("id")
    .eq("tmdb_type", tmdbType)
    .eq("tmdb_id", tmdbId)
    .limit(1);

  if (existingError) throw existingError;
  if (existing?.length) {
    throw new WatchWorkError("This work is already in the library", 409, existing[0].id);
  }

  const payload = await buildWatchPayload(tmdb, format, fallbackTitle);
  const diskSelected = sources.includes(HARD_DISK);
  // Validate before writing anything.
  const ownedEpisodes = diskSelected ? resolveRanges(payload.seasons, owned) : [];
  const watchedEpisodes = resolveRanges(payload.seasons, watched);

  const { data: media, error: mediaError } = await supabase
    .from("watch_media")
    .insert({ ...payload.media, slug: await availableSlug(payload.media.slug, tmdb) })
    .select("id")
    .single();

  if (mediaError) throw mediaError;

  const mediaId = Number(media.id);

  // PostgREST has no multi-table transaction, so undo the media row (which
  // cascades to everything below) if any later insert fails.
  try {
    const seasonRows = await chunkedInsert(
      "watch_seasons",
      payload.seasons.map((season) => ({
        media_id: mediaId,
        season_number: season.season_number,
        title: season.title,
        overview: season.overview,
        poster_url: season.poster_url,
        air_date: season.air_date,
        episode_count: season.episode_count,
        tmdb_season_id: season.tmdb_season_id,
      })),
      "id, season_number"
    );
    const seasonIdByNumber = new Map(
      seasonRows.map((row) => [Number(row.season_number), Number(row.id)])
    );

    const episodeRows = await chunkedInsert(
      "watch_episodes",
      payload.seasons.flatMap((season) =>
        season.episodes.map((episode) => ({
          season_id: seasonIdByNumber.get(season.season_number),
          ...episode,
        }))
      ),
      "id, season_id, episode_number"
    );
    const episodeIdByKey = new Map(
      episodeRows.map((row) => [`${row.season_id}:${row.episode_number}`, Number(row.id)])
    );
    const episodeId = ({ seasonNumber, episodeNumber }: { seasonNumber: number; episodeNumber: number }) =>
      episodeIdByKey.get(`${seasonIdByNumber.get(seasonNumber)}:${episodeNumber}`);

    // A series only counts as on the hard disk if some episode is.
    const onDisk = tmdbType === "movie" ? diskSelected : ownedEpisodes.length > 0;
    const { data: entry, error: entryError } = await supabase
      .from("watch_library_entries")
      .insert({
        media_id: mediaId,
        watch_status: watchStatus,
        episodes_watched: watchedEpisodes.length,
        watch_sources: withDiskSource(sources, onDisk),
      })
      .select("id")
      .single();

    if (entryError) throw entryError;

    await chunkedInsert(
      "watch_owned_episodes",
      ownedEpisodes.map((episode) => ({ library_entry_id: entry.id, episode_id: episodeId(episode) })),
      "id"
    );
    await chunkedInsert(
      "watch_watched_episodes",
      watchedEpisodes.map((episode) => ({ library_entry_id: entry.id, episode_id: episodeId(episode) })),
      "id"
    );

    const { error: linkError } = await supabase.from("watch_source_links").insert({
      media_id: mediaId,
      source: "tmdb",
      source_id: tmdbId,
      source_type: tmdbType,
      relation_type: "primary",
    });

    if (linkError) throw linkError;
  } catch (error) {
    await supabase.from("watch_media").delete().eq("id", mediaId);
    throw error;
  }

  return {
    mediaId,
    ownedEpisodes: ownedEpisodes.length,
    watchedEpisodes: watchedEpisodes.length,
  };
}

// episodes_watched is not part of the patch: it always equals the number of
// watch_watched_episodes rows and is kept in sync by the server.
export type WatchEntryPatch = {
  watch_status: string;
  my_score: number | null;
  date_started: string | null;
  completion_last_watched: string | null;
  rewatch_count: number;
  notes: string | null;
  watch_sources: string[];
};

type StoredSeason = {
  id: number;
  season_number: number;
  watch_episodes: { id: number; episode_number: number }[];
};

async function loadSeasons(mediaId: number) {
  const { data, error } = await supabase
    .from("watch_seasons")
    .select("id, season_number, watch_episodes(id, episode_number)")
    .eq("media_id", mediaId);

  if (error) throw error;

  return (data || []) as StoredSeason[];
}

function episodeIdsForRanges(seasons: StoredSeason[], ranges: EpisodeRanges) {
  const ids: number[] = [];

  for (const season of seasons) {
    const text = ranges[season.season_number];

    if (!text) continue;

    const episodes = season.watch_episodes || [];
    const result = parseEpisodeRanges(
      text,
      episodes.map((episode) => episode.episode_number)
    );

    if ("error" in result) {
      throw new WatchWorkError(`Season ${season.season_number}: ${result.error}`, 400);
    }

    const picked = new Set(result.episodes);
    ids.push(...episodes.filter((episode) => picked.has(episode.episode_number)).map((episode) => episode.id));
  }

  return ids;
}

async function replaceEntryEpisodes(table: string, entryId: number, episodeIds: number[]) {
  const { error } = await supabase.from(table).delete().eq("library_entry_id", entryId);

  if (error) throw error;

  await chunkedInsert(
    table,
    episodeIds.map((episodeId) => ({ library_entry_id: entryId, episode_id: episodeId })),
    "id"
  );
}

// Updates the library entry and, when given, replaces the owned (`owned`)
// and watched (`watched`) episodes. Dropping "Hard Disk" from a series'
// sources clears its owned episodes; keeping it with no episodes left drops
// "Hard Disk". Episode sets that are not given are left as they are.
export async function updateWatchWork(
  mediaId: number,
  patch: WatchEntryPatch,
  { owned, watched }: { owned?: EpisodeRanges; watched?: EpisodeRanges } = {}
) {
  const { data: current, error: currentError } = await supabase
    .from("watch_library_entries")
    .select("id, watch_sources, watch_media(tmdb_type)")
    .eq("media_id", mediaId)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) throw new WatchWorkError("Work not found", 404);

  const media = current.watch_media as unknown as { tmdb_type: string | null } | null;
  const isMovie = media?.tmdb_type === "movie";
  const diskSelected = patch.watch_sources.includes(HARD_DISK);
  const seasons = !isMovie && (owned || watched) ? await loadSeasons(mediaId) : [];
  // Validate ranges before writing anything. null = leave as is.
  const ownedEpisodeIds = isMovie
    ? null
    : !diskSelected
      ? []
      : owned
        ? episodeIdsForRanges(seasons, owned)
        : null;
  const watchedEpisodeIds = !isMovie && watched ? episodeIdsForRanges(seasons, watched) : null;
  const onDisk = isMovie
    ? diskSelected
    : ownedEpisodeIds
      ? ownedEpisodeIds.length > 0
      : (current.watch_sources || []).includes(HARD_DISK);

  const { error: entryError } = await supabase
    .from("watch_library_entries")
    .update({
      ...patch,
      watch_sources: withDiskSource(patch.watch_sources, onDisk),
      ...(watchedEpisodeIds ? { episodes_watched: watchedEpisodeIds.length } : {}),
    })
    .eq("id", current.id);

  if (entryError) throw entryError;

  if (ownedEpisodeIds) await replaceEntryEpisodes("watch_owned_episodes", current.id, ownedEpisodeIds);
  if (watchedEpisodeIds) await replaceEntryEpisodes("watch_watched_episodes", current.id, watchedEpisodeIds);
}

const ID_CHUNK_SIZE = 200;
const IN_PROGRESS_STATUSES = new Set(["Plan to Watch", "Watching", "Rewatching"]);

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

async function countRows(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

// Marks one episode, or every episode of one season, as watched or not from
// the work page, then keeps the entry in step: episodes_watched is
// recounted, the first watched episode moves "Plan to Watch" to "Watching",
// and watching the last regular episode moves an in-progress work to
// "Completed" dated today.
export async function setEpisodesWatched(
  mediaId: number,
  target: { episodeId: number } | { seasonNumber: number },
  watched: boolean
) {
  // Each round trip to Supabase costs noticeable time, so look up the entry
  // and resolve the target episodes in parallel.
  const resolveEpisodeIds = async () => {
    if ("episodeId" in target) {
      const { data, error } = await supabase
        .from("watch_episodes")
        .select("id, watch_seasons!inner(media_id)")
        .eq("id", target.episodeId)
        .eq("watch_seasons.media_id", mediaId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new WatchWorkError("Episode not found in this work", 404);

      return [target.episodeId];
    }

    const season = (await loadSeasons(mediaId)).find(
      (entry) => entry.season_number === target.seasonNumber
    );

    if (!season) throw new WatchWorkError("Season not found in this work", 404);

    return season.watch_episodes.map((episode) => episode.id);
  };

  const [{ data: entry, error: entryError }, episodeIds] = await Promise.all([
    supabase
      .from("watch_library_entries")
      .select("id, watch_status, date_started, completion_last_watched")
      .eq("media_id", mediaId)
      .maybeSingle(),
    resolveEpisodeIds(),
  ]);

  if (entryError) throw entryError;
  if (!entry) throw new WatchWorkError("Work not found", 404);

  for (let start = 0; start < episodeIds.length; start += ID_CHUNK_SIZE) {
    const chunk = episodeIds.slice(start, start + ID_CHUNK_SIZE);
    const { error } = watched
      ? await supabase.from("watch_watched_episodes").upsert(
          chunk.map((episodeId) => ({ library_entry_id: entry.id, episode_id: episodeId })),
          { onConflict: "library_entry_id,episode_id", ignoreDuplicates: true }
        )
      : await supabase
          .from("watch_watched_episodes")
          .delete()
          .eq("library_entry_id", entry.id)
          .in("episode_id", chunk);

    if (error) throw error;
  }

  const [watchedCount, regularTotal, regularWatched] = await Promise.all([
    countRows(
      supabase
        .from("watch_watched_episodes")
        .select("id", { count: "exact", head: true })
        .eq("library_entry_id", entry.id)
    ),
    countRows(
      supabase
        .from("watch_episodes")
        .select("id, watch_seasons!inner(media_id, season_number)", { count: "exact", head: true })
        .eq("watch_seasons.media_id", mediaId)
        .gt("watch_seasons.season_number", 0)
    ),
    countRows(
      supabase
        .from("watch_watched_episodes")
        .select("id, watch_episodes!inner(watch_seasons!inner(season_number))", {
          count: "exact",
          head: true,
        })
        .eq("library_entry_id", entry.id)
        .gt("watch_episodes.watch_seasons.season_number", 0)
    ),
  ]);

  const today = todayIso();
  const update: Record<string, unknown> = { episodes_watched: watchedCount };

  if (watched && regularTotal > 0 && regularWatched >= regularTotal && IN_PROGRESS_STATUSES.has(entry.watch_status)) {
    update.watch_status = "Completed";
    update.completion_last_watched = today;
    update.date_started = entry.date_started || today;
  } else if (watched && entry.watch_status === "Plan to Watch") {
    update.watch_status = "Watching";
    update.date_started = entry.date_started || today;
  }

  const { data: updated, error: updateError } = await supabase
    .from("watch_library_entries")
    .update(update)
    .eq("id", entry.id)
    .select("watch_status, episodes_watched")
    .single();

  if (updateError) throw updateError;

  return updated;
}

export async function deleteWatchWork(mediaId: number) {
  // An import item matched to this work goes back to pending so it can be
  // matched again.
  const { error: importError } = await supabase
    .from("watch_import_items")
    .update({ status: "pending", matched_media_id: null, matched_at: null })
    .eq("matched_media_id", mediaId);

  if (importError) throw importError;

  const { data, error } = await supabase
    .from("watch_media")
    .delete()
    .eq("id", mediaId)
    .select("id");

  if (error) throw error;
  if (!data?.length) throw new WatchWorkError("Work not found", 404);
}
