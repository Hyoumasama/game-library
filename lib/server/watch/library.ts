import "server-only";

import { supabase } from "@/lib/supabase";

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
};

export type WatchLibraryData = {
  items: WatchLibraryItem[];
  statuses: string[];
  stats: {
    totalWorks: number;
    anime: number;
    tv: number;
    movies: number;
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
  owned: boolean;
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
  };
}

function mapEpisode(row: RawRecord, ownedEpisodeIds: Set<number>): WatchEpisode {
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
  };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function ownershipPercentage(owned: number, official: number) {
  if (official <= 0) return 0;

  return Math.round((owned / official) * 100);
}

function sortSeasons(seasons: WatchSeason[]) {
  return seasons.slice().sort((first, second) => {
    if (first.season_number === 0 && second.season_number !== 0) return 1;
    if (second.season_number === 0 && first.season_number !== 0) return -1;

    return first.season_number - second.season_number;
  });
}

function buildLibraryItem({
  entry,
  media,
  seasons,
  ownedEpisodeIds,
}: {
  entry: WatchLibraryEntry;
  media: WatchMedia;
  seasons: WatchSeason[];
  ownedEpisodeIds: Set<number>;
}): WatchLibraryItem {
  const officialEpisodesCount = seasons.reduce(
    (total, season) => total + season.officialEpisodesCount,
    0
  );
  const ownedEpisodesCount = seasons.reduce(
    (total, season) => total + season.ownedEpisodesCount,
    0
  );

  return {
    entry,
    media,
    officialSeasonsCount: seasons.length,
    normalSeasonsCount: seasons.filter((season) => season.season_number !== 0)
      .length,
    hasSpecials: seasons.some((season) => season.season_number === 0),
    officialEpisodesCount,
    ownedEpisodesCount,
    ownershipPercentage: ownershipPercentage(
      ownedEpisodesCount,
      officialEpisodesCount
    ),
  };
}

async function fetchLibraryBase({
  includeEpisodeDetails = false,
  mediaId,
}: {
  includeEpisodeDetails?: boolean;
  mediaId?: number;
} = {}) {
  let entriesQuery = supabase
    .from("watch_library_entries")
    .select(libraryEntryColumns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (mediaId) {
    entriesQuery = entriesQuery.eq("media_id", mediaId);
  }

  const { data, error } = await entriesQuery;

  if (error) throw error;

  const entries = (data || []).map(mapEntry);
  const mediaIds = entries.map((entry) => entry.media_id);

  if (!mediaIds.length) {
    return {
      entries,
      mediaById: new Map<number, WatchMedia>(),
      seasonsByMediaId: new Map<number, WatchSeason[]>(),
      ownedEpisodeIdsByEntryId: new Map<number, Set<number>>(),
    };
  }

  const { data: mediaData, error: mediaError } = await supabase
    .from("watch_media")
    .select(mediaColumns)
    .in("id", mediaIds);

  if (mediaError) throw mediaError;

  const mediaById = new Map(
    (mediaData || []).map((row) => {
      const media = mapMedia(row);

      return [media.id, media] as const;
    })
  );

  const { data: seasonData, error: seasonError } = await supabase
    .from("watch_seasons")
    .select(seasonColumns)
    .in("media_id", mediaIds);

  if (seasonError) throw seasonError;

  const seasons = (seasonData || []).map(mapSeason);
  const seasonIds = seasons.map((season) => season.id);
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const entryIds = entries.map((entry) => entry.id);

  const [episodesResult, ownedResult] = await Promise.all([
    seasonIds.length
      ? supabase
          .from("watch_episodes")
          .select(includeEpisodeDetails ? episodeColumns : "id, season_id")
          .in("season_id", seasonIds)
      : Promise.resolve({ data: [], error: null }),
    entryIds.length
      ? supabase
          .from("watch_owned_episodes")
          .select("library_entry_id, episode_id")
          .in("library_entry_id", entryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (episodesResult.error) throw episodesResult.error;
  if (ownedResult.error) throw ownedResult.error;

  const ownedEpisodeIds = new Set(
    (ownedResult.data || []).map((row: RawRecord) => asNumber(row.episode_id))
  );
  const ownedEpisodeIdsByEntryId = new Map<number, Set<number>>();

  for (const row of ownedResult.data || []) {
    const entryId = asNumber((row as RawRecord).library_entry_id);
    const episodeId = asNumber((row as RawRecord).episode_id);
    const existing = ownedEpisodeIdsByEntryId.get(entryId) || new Set<number>();

    existing.add(episodeId);
    ownedEpisodeIdsByEntryId.set(entryId, existing);
  }

  for (const row of episodesResult.data || []) {
    const record = row as RawRecord;
    const episode = includeEpisodeDetails
      ? mapEpisode(record, ownedEpisodeIds)
      : mapEpisode(
          {
            ...record,
            episode_number: 0,
          },
          ownedEpisodeIds
        );
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
    ownedEpisodeIdsByEntryId,
  };
}

export async function getWatchLibrary(): Promise<WatchLibraryData> {
  const {
    entries,
    mediaById,
    seasonsByMediaId,
    ownedEpisodeIdsByEntryId,
  } = await fetchLibraryBase();

  const items = entries
    .map((entry) => {
      const media = mediaById.get(entry.media_id);

      if (!media) return null;

      return buildLibraryItem({
        entry,
        media,
        seasons: seasonsByMediaId.get(entry.media_id) || [],
        ownedEpisodeIds: ownedEpisodeIdsByEntryId.get(entry.id) || new Set(),
      });
    })
    .filter((item): item is WatchLibraryItem => Boolean(item));

  return {
    items,
    statuses: uniqueValues(items.map((item) => item.entry.watch_status)),
    stats: {
      totalWorks: items.length,
      anime: items.filter((item) => item.media.media_type === "anime").length,
      tv: items.filter((item) => item.media.media_type === "tv").length,
      movies: items.filter((item) => item.media.media_type === "movie").length,
      ownedEpisodes: items.reduce(
        (total, item) => total + item.ownedEpisodesCount,
        0
      ),
    },
  };
}

export async function getWatchMediaDetails(
  mediaId: number
): Promise<WatchMediaDetails | null> {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) return null;

  const {
    entries,
    mediaById,
    seasonsByMediaId,
    ownedEpisodeIdsByEntryId,
  } = await fetchLibraryBase({
    includeEpisodeDetails: true,
    mediaId,
  });
  const entry = entries.find((item) => item.media_id === mediaId);
  const media = mediaById.get(mediaId);

  if (!entry || !media) return null;

  const seasons = seasonsByMediaId.get(mediaId) || [];

  return {
    ...buildLibraryItem({
      entry,
      media,
      seasons,
      ownedEpisodeIds: ownedEpisodeIdsByEntryId.get(entry.id) || new Set(),
    }),
    seasons,
  };
}
