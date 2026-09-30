import "server-only";

import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/server/fetchAllRows";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { unstable_cache } from "next/cache";

export type WatchMediaType = "anime" | "tv" | "movie";

export type WatchMedia = {
  id: number;
  title: string;
  original_title: string | null;
  alternative_titles: string[];
  slug: string | null;
  media_type: WatchMediaType;
  format: string;
  tmdb_type: string | null;
  tmdb_id: number | null;
  anilist_id: number | null;
  mal_id: number | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  end_date: string | null;
  airing_status: string | null;
  tmdb_score: number | null;
  anilist_score: number | null;
  genres: string[];
  studios: string[];
  total_episodes: number | null;
  episode_duration: number | null;
  created_at: string;
  updated_at: string;
};

export type WatchLibraryEntry = {
  id: number;
  media_id: number;
  watch_status: string;
  my_score: number | null;
  episodes_watched: number;
  date_added: string | null;
  date_started: string | null;
  completion_last_watched: string | null;
  rewatch_count: number;
  notes: string | null;
  // "Hard Disk" and/or streaming services; see lib/watchSources.ts.
  watch_sources: string[];
  created_at: string;
  updated_at: string;
};

export type WatchLibraryItem = {
  entry: WatchLibraryEntry;
  media: WatchMedia;
  officialSeasonsCount: number;
  normalSeasonsCount: number;
  hasSpecials: boolean;
  officialEpisodesCount: number;
  ownedEpisodesCount: number;
  ownershipPercentage: number;
  // Viewing progress counts regular episodes only (specials excluded).
  regularEpisodesCount: number;
  watchedEpisodesCount: number;
  watchedPercentage: number;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    title: string | null;
  } | null;
};

export type WatchLibraryData = {
  items: WatchLibraryItem[];
  statuses: string[];
  stats: {
    totalWorks: number;
    series: number;
    movies: number;
    ovas: number;
    ownedEpisodes: number;
  };
};

export type WatchEpisode = {
  id: number;
  season_id: number;
  episode_number: number;
  tmdb_episode_id: number | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  airing_at: string | null;
  still_url: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
  // On the hard disk / watched; independent of each other.
  owned: boolean;
  watched: boolean;
};

export type WatchSeason = {
  id: number;
  media_id: number;
  season_number: number;
  title: string | null;
  overview: string | null;
  poster_url: string | null;
  air_date: string | null;
  episode_count: number | null;
  tmdb_season_id: number | null;
  anilist_id: number | null;
  created_at: string;
  updated_at: string;
  episodes: WatchEpisode[];
  officialEpisodesCount: number;
  ownedEpisodesCount: number;
  watchedEpisodesCount: number;
};

export type WatchMediaDetails = WatchLibraryItem & {
  seasons: WatchSeason[];
};

type RawRecord = Record<string, any>;

const libraryEntryColumns = [
  "id",
  "media_id",
  "watch_status",
  "my_score",
  "episodes_watched",
  "date_added",
  "date_started",
  "completion_last_watched",
  "rewatch_count",
  "notes",
  "watch_sources",
  "created_at",
  "updated_at",
].join(", ");

const mediaColumns = [
  "id",
  "title",
  "original_title",
  "alternative_titles",
  "slug",
  "media_type",
  "format",
  "tmdb_type",
  "tmdb_id",
  "anilist_id",
  "mal_id",
  "overview",
  "poster_url",
  "backdrop_url",
  "release_date",
  "end_date",
  "airing_status",
  "tmdb_score",
  "anilist_score",
  "genres",
  "studios",
  "total_episodes",
  "episode_duration",
  "created_at",
  "updated_at",
].join(", ");

const seasonColumns = [
  "id",
  "media_id",
  "season_number",
  "title",
  "overview",
  "poster_url",
  "air_date",
  "episode_count",
  "tmdb_season_id",
  "anilist_id",
  "created_at",
  "updated_at",
].join(", ");

const episodeColumns = [
  "id",
  "season_id",
  "episode_number",
  "tmdb_episode_id",
  "title",
  "overview",
  "air_date",
  "airing_at",
  "still_url",
  "duration",
  "created_at",
  "updated_at",
].join(", ");

function asNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function asNumberOrNull(value: unknown) {
  if (value == null) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function mapEntry(row: RawRecord): WatchLibraryEntry {
  return {
    id: asNumber(row.id),
    media_id: asNumber(row.media_id),
    watch_status: String(row.watch_status || "Plan to Watch"),
    my_score: asNumberOrNull(row.my_score),
    episodes_watched: asNumber(row.episodes_watched),
    date_added: row.date_added || null,
    date_started: row.date_started || null,
    completion_last_watched: row.completion_last_watched || null,
    rewatch_count: asNumber(row.rewatch_count),
    notes: row.notes || null,
    watch_sources: asStringArray(row.watch_sources),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function mapMedia(row: RawRecord): WatchMedia {
  return {
    id: asNumber(row.id),
    title: String(row.title || "Untitled"),
    original_title: row.original_title || null,
    alternative_titles: asStringArray(row.alternative_titles),
    slug: row.slug || null,
    media_type: row.media_type,
    format: String(row.format || ""),
    tmdb_type: row.tmdb_type || null,
    tmdb_id: asNumberOrNull(row.tmdb_id),
    anilist_id: asNumberOrNull(row.anilist_id),
    mal_id: asNumberOrNull(row.mal_id),
    overview: row.overview || null,
    poster_url: row.poster_url || null,
    backdrop_url: row.backdrop_url || null,
    release_date: row.release_date || null,
    end_date: row.end_date || null,
    airing_status: row.airing_status || null,
    tmdb_score: asNumberOrNull(row.tmdb_score),
    anilist_score: asNumberOrNull(row.anilist_score),
    genres: asStringArray(row.genres),
    studios: asStringArray(row.studios),
    total_episodes: asNumberOrNull(row.total_episodes),
    episode_duration: asNumberOrNull(row.episode_duration),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function mapSeason(row: RawRecord): WatchSeason {
  return {
    id: asNumber(row.id),
    media_id: asNumber(row.media_id),
    season_number: asNumber(row.season_number),
    title: row.title || null,
    overview: row.overview || null,
    poster_url: row.poster_url || null,
    air_date: row.air_date || null,
    episode_count: asNumberOrNull(row.episode_count),
    tmdb_season_id: asNumberOrNull(row.tmdb_season_id),
    anilist_id: asNumberOrNull(row.anilist_id),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    episodes: [],
    officialEpisodesCount: 0,
    ownedEpisodesCount: 0,
    watchedEpisodesCount: 0,
  };
}

function mapEpisode(
  row: RawRecord,
  ownedEpisodeIds: Set<number>,
  watchedEpisodeIds: Set<number>
): WatchEpisode {
  const id = asNumber(row.id);

  return {
    id,
    season_id: asNumber(row.season_id),
    episode_number: asNumber(row.episode_number),
    tmdb_episode_id: asNumberOrNull(row.tmdb_episode_id),
    title: row.title || null,
    overview: row.overview || null,
    air_date: row.air_date || null,
    airing_at: row.airing_at || null,
    still_url: row.still_url || null,
    duration: asNumberOrNull(row.duration),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    owned: ownedEpisodeIds.has(id),
    watched: watchedEpisodeIds.has(id),
  };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((part / total) * 100);
}

function sortSeasons(seasons: WatchSeason[]) {
  return seasons.slice().sort((first, second) => {
    if (first.season_number === 0 && second.season_number !== 0) return 1;
    if (second.season_number === 0 && first.season_number !== 0) return -1;

    return first.season_number - second.season_number;
  });
}

// The episode after the furthest watched one, in season/episode order
// (specials excluded). null when every regular episode is watched.
function findNextEpisode(seasons: WatchSeason[]) {
  const episodes = seasons
    .filter((season) => season.season_number > 0)
    .flatMap((season) =>
      season.episodes.map((episode) => ({ season, episode }))
    );
  let lastWatchedIndex = -1;

  episodes.forEach(({ episode }, index) => {
    if (episode.watched) lastWatchedIndex = index;
  });

  const next = episodes[lastWatchedIndex + 1];

  return next
    ? {
        seasonNumber: next.season.season_number,
        episodeNumber: next.episode.episode_number,
        title: next.episode.title,
      }
    : null;
}

type SeasonCountField =
  | "officialEpisodesCount"
  | "ownedEpisodesCount"
  | "watchedEpisodesCount";

function buildLibraryItem({
  entry,
  media,
  seasons,
}: {
  entry: WatchLibraryEntry;
  media: WatchMedia;
  seasons: WatchSeason[];
}): WatchLibraryItem {
  const sum = (field: SeasonCountField, regularOnly = false) =>
    seasons
      .filter((season) => !regularOnly || season.season_number > 0)
      .reduce((total, season) => total + season[field], 0);
  const officialEpisodesCount = sum("officialEpisodesCount");
  const ownedEpisodesCount = sum("ownedEpisodesCount");
  const regularEpisodesCount = sum("officialEpisodesCount", true);
  const watchedEpisodesCount = sum("watchedEpisodesCount", true);

  return {
    entry,
    media,
    officialSeasonsCount: seasons.length,
    normalSeasonsCount: seasons.filter((season) => season.season_number !== 0)
      .length,
    hasSpecials: seasons.some((season) => season.season_number === 0),
    officialEpisodesCount,
    ownedEpisodesCount,
    ownershipPercentage: percentage(ownedEpisodesCount, officialEpisodesCount),
    regularEpisodesCount,
    watchedEpisodesCount,
    watchedPercentage: percentage(watchedEpisodesCount, regularEpisodesCount),
    nextEpisode: media.format === "movie" ? null : findNextEpisode(seasons),
  };
}

async function fetchLibraryBase({
  includeEpisodeDetails = false,
  mediaId,
}: {
  includeEpisodeDetails?: boolean;
  mediaId?: number;
} = {}) {
  // Every query below is paged with fetchAllRows: Supabase silently caps an
  // unpaginated select at 1000 rows, and episodes/owned episodes in
  // particular pass that quickly as the watch library grows.
  const { data, error } = await fetchAllRows((from, to) => {
    let entriesQuery = supabase
      .from("watch_library_entries")
      .select(libraryEntryColumns);

    if (mediaId) {
      entriesQuery = entriesQuery.eq("media_id", mediaId);
    }

    return entriesQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
  });

  if (error) throw error;

  const entries = (data || []).map(mapEntry);
  const mediaIds = entries.map((entry) => entry.media_id);

  if (!mediaIds.length) {
    return {
      entries,
      mediaById: new Map<number, WatchMedia>(),
      seasonsByMediaId: new Map<number, WatchSeason[]>(),
    };
  }

  // media and seasons both only depend on mediaIds (not on each other), so
  // fetch them together instead of one after the other.
  const [mediaResult, seasonResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("watch_media").select(mediaColumns).in("id", mediaIds).order("id").range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("watch_seasons").select(seasonColumns).in("media_id", mediaIds).order("id").range(from, to)
    ),
  ]);

  if (mediaResult.error) throw mediaResult.error;
  if (seasonResult.error) throw seasonResult.error;

  const mediaById = new Map(
    (mediaResult.data || []).map((row) => {
      const media = mapMedia(row);

      return [media.id, media] as const;
    })
  );

  const seasons = (seasonResult.data || []).map(mapSeason);
  const seasonIds = seasons.map((season) => season.id);
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const entryIds = entries.map((entry) => entry.id);
  const entryEpisodeIds = async (table: string) => {
    const { data: rows, error: rowsError } = await fetchAllRows((from, to) =>
      supabase
        .from(table)
        .select("episode_id")
        .in("library_entry_id", entryIds)
        .order("id")
        .range(from, to)
    );

    if (rowsError) throw rowsError;

    // Each season belongs to one media and so to one library entry, so one
    // set across entries is enough for mapping episodes.
    return new Set((rows || []).map((row: RawRecord) => asNumber(row.episode_id)));
  };

  const [episodesResult, ownedEpisodeIds, watchedEpisodeIds] = await Promise.all([
    seasonIds.length
      ? fetchAllRows((from, to) =>
          supabase
            .from("watch_episodes")
            // The list pages only need numbering (for the next episode).
            .select(includeEpisodeDetails ? episodeColumns : "id, season_id, episode_number")
            .in("season_id", seasonIds)
            .order("id")
            .range(from, to)
        )
      : Promise.resolve({ data: [], error: null }),
    entryEpisodeIds("watch_owned_episodes"),
    entryEpisodeIds("watch_watched_episodes"),
  ]);

  if (episodesResult.error) throw episodesResult.error;

  for (const row of episodesResult.data || []) {
    const episode = mapEpisode(row as RawRecord, ownedEpisodeIds, watchedEpisodeIds);
    const season = seasonById.get(episode.season_id);

    if (!season) continue;

    season.episodes.push(episode);
  }

  const seasonsByMediaId = new Map<number, WatchSeason[]>();

  for (const season of seasons) {
    season.episodes.sort(
      (first, second) => first.episode_number - second.episode_number
    );
    season.officialEpisodesCount = season.episodes.length;
    season.ownedEpisodesCount = season.episodes.filter(
      (episode) => episode.owned
    ).length;
    season.watchedEpisodesCount = season.episodes.filter(
      (episode) => episode.watched
    ).length;

    const list = seasonsByMediaId.get(season.media_id) || [];
    list.push(season);
    seasonsByMediaId.set(season.media_id, list);
  }

  for (const [mediaId, mediaSeasons] of seasonsByMediaId) {
    seasonsByMediaId.set(mediaId, sortSeasons(mediaSeasons));
  }

  return {
    entries,
    mediaById,
    seasonsByMediaId,
  };
}

async function fetchWatchLibrary(): Promise<WatchLibraryData> {
  const { entries, mediaById, seasonsByMediaId } = await fetchLibraryBase();

  const items = entries
    .map((entry) => {
      const media = mediaById.get(entry.media_id);

      if (!media) return null;

      return buildLibraryItem({
        entry,
        media,
        seasons: seasonsByMediaId.get(entry.media_id) || [],
      });
    })
    .filter((item): item is WatchLibraryItem => Boolean(item));

  return {
    items,
    statuses: uniqueValues(items.map((item) => item.entry.watch_status)),
    stats: {
      totalWorks: items.length,
      series: items.filter((item) => item.media.format === "series").length,
      movies: items.filter((item) => item.media.format === "movie").length,
      ovas: items.filter((item) => item.media.format === "ova").length,
      ownedEpisodes: items.reduce(
        (total, item) => total + item.ownedEpisodesCount,
        0
      ),
    },
  };
}

async function fetchWatchMediaDetails(
  mediaId: number
): Promise<WatchMediaDetails | null> {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) return null;

  const { entries, mediaById, seasonsByMediaId } = await fetchLibraryBase({
    includeEpisodeDetails: true,
    mediaId,
  });
  const entry = entries.find((item) => item.media_id === mediaId);
  const media = mediaById.get(mediaId);

  if (!entry || !media) return null;

  const seasons = seasonsByMediaId.get(mediaId) || [];

  return {
    ...buildLibraryItem({ entry, media, seasons }),
    seasons,
  };
}

// Loading the library pages runs several paged queries in a row (every
// episode, owned and watched row), which took over two seconds per visit.
// Cached like getHomeGames (lib/server/homeGames.ts): every
// /api/admin/watch/works* route calls
// revalidateTag(CACHE_TAGS.watchLibrary, { expire: 0 }) after a write, and
// the 5-minute revalidate is only a safety net for writes made elsewhere
// (e.g. npm run watch:match).
export const getWatchLibrary = unstable_cache(fetchWatchLibrary, ["watch-library", "v1"], {
  tags: [CACHE_TAGS.watchLibrary],
  revalidate: 300,
});

export const getWatchMediaDetails = unstable_cache(
  fetchWatchMediaDetails,
  ["watch-media-details", "v1"],
  { tags: [CACHE_TAGS.watchLibrary], revalidate: 300 }
);
