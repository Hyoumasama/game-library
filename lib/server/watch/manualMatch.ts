import "server-only";

import {
  getTmdbImageUrl,
  getTmdbMovieDetails,
  getTmdbTvDetails,
  getTmdbTvSeasonDetails,
  searchTmdbByTitleAndType,
} from "@/lib/server/watch/tmdb";
import {
  getAniListAnimeById,
  searchAniListAnimeByTitle,
} from "@/lib/server/watch/anilist";
import type {
  AniListSearchCandidate,
  TmdbMovieDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbType,
} from "@/lib/server/watch/types";

export type WatchImportItem = {
  id: number;
  source_key: string;
  local_title: string;
  local_type: "series" | "movie" | "ova";
  local_file_count: number;
  local_season_count: number;
  local_episode_count: number;
  local_summary: Record<string, number>;
  status: "pending" | "matched" | "skipped";
  matched_media_id: number | null;
  notes: string | null;
  matched_at: string | null;
  created_at: string;
};

export type ConfirmSelection = {
  tmdb: { id: number; type: TmdbType } | null;
  anilistIds: number[];
  includeSpecials: boolean;
  ownedEpisodes: { seasonNumber: number; episodeNumber: number }[];
};

export const importItemColumns = [
  "id",
  "source_key",
  "local_title",
  "local_type",
  "local_file_count",
  "local_season_count",
  "local_episode_count",
  "local_summary",
  "status",
  "matched_media_id",
  "notes",
  "matched_at",
  "created_at",
].join(", ");

function compact<T>(values: (T | null | undefined | "")[]) {
  return values.filter((value): value is T => Boolean(value));
}

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

function yearFromDate(value?: string | null) {
  const date = dateOrNull(value);

  return date ? Number(date.slice(0, 4)) : null;
}

function positiveIntegerOrNull(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function scoreOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "watch-media";
}

function titleFromAniList(item: AniListSearchCandidate) {
  return (
    item.title.english ||
    item.title.userPreferred ||
    item.title.romaji ||
    item.title.native ||
    `AniList ${item.id}`
  );
}

function anilistTitles(item: AniListSearchCandidate) {
  return uniqueStrings([
    item.title.english,
    item.title.romaji,
    item.title.native,
    item.title.userPreferred,
    ...item.synonyms,
  ]);
}

function localFormat(localType: WatchImportItem["local_type"]) {
  if (localType === "movie") return "movie";
  if (localType === "ova") return "ova";
  return "series";
}

function localOnlyMediaType(
  localType: WatchImportItem["local_type"],
  tmdbType?: TmdbType,
  hasAniList = false
) {
  if (hasAniList || localType === "ova") return "anime";
  return tmdbType === "movie" ? "movie" : "tv";
}

function mapTmdbSearchResult(result: Awaited<ReturnType<typeof searchTmdbByTitleAndType>>[number]) {
  const releaseDate = result.tmdb_type === "movie"
    ? result.release_date
    : result.first_air_date;

  return {
    source: "tmdb",
    id: result.tmdb_id,
    tmdb_type: result.tmdb_type,
    title: result.title,
    original_title: result.original_title,
    release_date: dateOrNull(releaseDate),
    year: yearFromDate(releaseDate),
    overview: result.overview,
    poster_url: result.poster_url,
    backdrop_url: result.backdrop_url,
    score: result.vote_average,
    popularity: result.popularity,
  };
}

function mapAniListSearchResult(result: AniListSearchCandidate) {
  return {
    source: "anilist",
    id: result.id,
    mal_id: result.idMal,
    title: titleFromAniList(result),
    english_title: result.title.english,
    romaji_title: result.title.romaji,
    native_title: result.title.native,
    alternative_titles: anilistTitles(result),
    format: result.format,
    status: result.status,
    season: result.season,
    season_year: result.seasonYear,
    episodes: result.episodes,
    duration: result.duration,
    description: null,
    cover_url: result.coverImage?.extraLarge || result.coverImage?.large || null,
    banner_url: result.bannerImage,
    average_score: result.score,
    studios: result.studios.map((studio) => studio.name),
    genres: result.genres,
    is_adult: result.isAdult,
  };
}

export async function searchManualCandidates({
  source,
  query,
  tmdbType,
}: {
  source: "tmdb" | "anilist";
  query: string;
  tmdbType?: TmdbType;
}) {
  if (source === "tmdb") {
    const results = await searchTmdbByTitleAndType(query, tmdbType || "tv");

    return results.slice(0, 20).map(mapTmdbSearchResult);
  }

  const results = await searchAniListAnimeByTitle(query);

  return results.slice(0, 20).map(mapAniListSearchResult);
}

export async function getTmdbPreview(tmdbId: number, tmdbType: TmdbType) {
  if (tmdbType === "movie") {
    const movie = await getTmdbMovieDetails(tmdbId);

    if (!movie?.id) return null;

    return {
      id: movie.id,
      source: "tmdb",
      tmdb_type: "movie",
      title: movie.title || `TMDB Movie ${movie.id}`,
      original_title: movie.original_title || null,
      overview: movie.overview || null,
      poster_url: getTmdbImageUrl(movie.poster_path),
      backdrop_url: getTmdbImageUrl(movie.backdrop_path, "w1280"),
      release_date: dateOrNull(movie.release_date),
      runtime: movie.runtime || null,
      status: movie.status || null,
      score: scoreOrNull(movie.vote_average),
      genres: (movie.genres || []).map((genre) => genre.name),
    };
  }

  const tv = await getTmdbTvDetails(tmdbId);

  if (!tv?.id) return null;

  return {
    id: tv.id,
    source: "tmdb",
    tmdb_type: "tv",
    title: tv.name || `TMDB TV ${tv.id}`,
    original_title: tv.original_name || null,
    overview: tv.overview || null,
    poster_url: getTmdbImageUrl(tv.poster_path),
    backdrop_url: getTmdbImageUrl(tv.backdrop_path, "w1280"),
    release_date: dateOrNull(tv.first_air_date),
    end_date: dateOrNull(tv.last_air_date),
    status: tv.status || null,
    score: scoreOrNull(tv.vote_average),
    genres: (tv.genres || []).map((genre) => genre.name),
    total_seasons: tv.number_of_seasons || 0,
    total_episodes: tv.number_of_episodes || 0,
    episode_duration: tv.episode_run_time?.[0] || null,
    seasons: (tv.seasons || []).map((season) => ({
      season_number: season.season_number || 0,
      title: season.name || null,
      overview: season.overview || null,
      poster_url: getTmdbImageUrl(season.poster_path),
      air_date: dateOrNull(season.air_date),
      episode_count: season.episode_count || 0,
    })),
  };
}

export async function getAniListPreview(anilistId: number) {
  const item = await getAniListAnimeById(anilistId);

  if (!item) return null;

  return {
    id: item.id,
    source: "anilist",
    mal_id: item.idMal,
    titles: item.title,
    format: item.format,
    status: item.status,
    description: null,
    cover_url: item.coverImage?.extraLarge || item.coverImage?.large || null,
    banner_url: item.bannerImage,
    start_date: item.startDate,
    end_date: item.endDate,
    episodes: item.episodes,
    duration: item.duration,
    average_score: item.score,
    genres: item.genres,
    studios: item.studios.map((studio) => studio.name),
    season: item.season,
    season_year: item.seasonYear,
  };
}

function mapTmdbMovieMedia(
  item: WatchImportItem,
  movie: TmdbMovieDetails,
  anilistItems: AniListSearchCandidate[]
) {
  const primaryAniList = anilistItems[0];
  const hasAniList = anilistItems.length > 0;

  return {
    title: hasAniList ? titleFromAniList(primaryAniList) : movie.title || item.local_title,
    original_title: movie.original_title || null,
    alternative_titles: uniqueStrings([
      item.local_title,
      movie.title,
      movie.original_title,
      ...anilistItems.flatMap(anilistTitles),
    ]),
    slug: slugify(movie.title || titleFromAniList(primaryAniList) || item.local_title),
    media_type: localOnlyMediaType(item.local_type, "movie", hasAniList),
    format: hasAniList ? localFormat(item.local_type) : item.local_type === "ova" ? "ova" : "movie",
    tmdb_type: "movie",
    tmdb_id: movie.id,
    anilist_id: primaryAniList?.id || null,
    mal_id: primaryAniList?.idMal || null,
    overview: movie.overview || null,
    poster_url: getTmdbImageUrl(movie.poster_path),
    backdrop_url: getTmdbImageUrl(movie.backdrop_path, "w1280"),
    release_date: dateOrNull(movie.release_date),
    end_date: null,
    airing_status: movie.status || primaryAniList?.status || null,
    tmdb_score: scoreOrNull(movie.vote_average),
    anilist_score: primaryAniList?.score || null,
    genres: uniqueStrings([
      ...(movie.genres || []).map((genre) => genre.name),
      ...anilistItems.flatMap((anime) => anime.genres),
    ]),
    studios: uniqueStrings(
      anilistItems.flatMap((anime) => anime.studios.map((studio) => studio.name))
    ),
    total_episodes: 1,
    episode_duration: movie.runtime || primaryAniList?.duration || null,
  };
}

function mapTmdbTvMedia(
  item: WatchImportItem,
  tv: TmdbTvDetails,
  anilistItems: AniListSearchCandidate[]
) {
  const primaryAniList = anilistItems[0];
  const hasAniList = anilistItems.length > 0;

  return {
    title: hasAniList ? titleFromAniList(primaryAniList) : tv.name || item.local_title,
    original_title: tv.original_name || null,
    alternative_titles: uniqueStrings([
      item.local_title,
      tv.name,
      tv.original_name,
      ...anilistItems.flatMap(anilistTitles),
    ]),
    slug: slugify(tv.name || titleFromAniList(primaryAniList) || item.local_title),
    media_type: localOnlyMediaType(item.local_type, "tv", hasAniList),
    format: hasAniList ? localFormat(item.local_type) : item.local_type === "ova" ? "ova" : "series",
    tmdb_type: "tv",
    tmdb_id: tv.id,
    anilist_id: primaryAniList?.id || null,
    mal_id: primaryAniList?.idMal || null,
    overview: tv.overview || null,
    poster_url: getTmdbImageUrl(tv.poster_path),
    backdrop_url: getTmdbImageUrl(tv.backdrop_path, "w1280"),
    release_date: dateOrNull(tv.first_air_date),
    end_date: dateOrNull(tv.last_air_date),
    airing_status: tv.status || primaryAniList?.status || null,
    tmdb_score: scoreOrNull(tv.vote_average),
    anilist_score: primaryAniList?.score || null,
    genres: uniqueStrings([
      ...(tv.genres || []).map((genre) => genre.name),
      ...anilistItems.flatMap((anime) => anime.genres),
    ]),
    studios: uniqueStrings(
      anilistItems.flatMap((anime) => anime.studios.map((studio) => studio.name))
    ),
    total_episodes: tv.number_of_episodes || primaryAniList?.episodes || null,
    episode_duration: tv.episode_run_time?.[0] || primaryAniList?.duration || null,
  };
}

function mapAniListOnlyMedia(item: WatchImportItem, anilistItems: AniListSearchCandidate[]) {
  const primaryAniList = anilistItems[0];
  const totalEpisodes = anilistItems.reduce(
    (total, anime) => total + (anime.episodes || 0),
    0
  );

  return {
    title: titleFromAniList(primaryAniList),
    original_title: primaryAniList.title.native || primaryAniList.title.romaji,
    alternative_titles: uniqueStrings([
      item.local_title,
      ...anilistItems.flatMap(anilistTitles),
    ]),
    slug: slugify(titleFromAniList(primaryAniList)),
    media_type: "anime",
    format: localFormat(item.local_type),
    tmdb_type: null,
    tmdb_id: null,
    anilist_id: primaryAniList.id,
    mal_id: primaryAniList.idMal,
    overview: null,
    poster_url: primaryAniList.coverImage?.extraLarge || primaryAniList.coverImage?.large || null,
    backdrop_url: primaryAniList.bannerImage,
    release_date: primaryAniList.startDate,
    end_date: primaryAniList.endDate,
    airing_status: primaryAniList.status,
    tmdb_score: null,
    anilist_score: primaryAniList.score,
    genres: uniqueStrings(anilistItems.flatMap((anime) => anime.genres)),
    studios: uniqueStrings(
      anilistItems.flatMap((anime) => anime.studios.map((studio) => studio.name))
    ),
    total_episodes: totalEpisodes || primaryAniList.episodes,
    episode_duration: primaryAniList.duration,
  };
}

async function buildTmdbTvSeasons(
  tmdbId: number,
  tv: TmdbTvDetails
) {
  const seasonSummaries = (tv.seasons || [])
    .filter((season) => Number.isSafeInteger(season.season_number))
    .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));

  const details = await Promise.all(
    seasonSummaries.map((season) =>
      getTmdbTvSeasonDetails(tmdbId, season.season_number || 0)
    )
  );

  return details.map((season: TmdbSeasonDetails) => ({
    season_number: season.season_number || 0,
    title: season.name || null,
    overview: season.overview || null,
    poster_url: getTmdbImageUrl(season.poster_path),
    air_date: dateOrNull(season.air_date),
    episode_count: season.episodes?.length || 0,
    tmdb_season_id: season.id,
    anilist_id: null,
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

function buildAniListOnlySeasons(
  item: WatchImportItem,
  anilistItems: AniListSearchCandidate[]
) {
  void item;
  void anilistItems;

  return [];
}

function buildSourceLinks(
  selection: ConfirmSelection,
  anilistItems: AniListSearchCandidate[]
) {
  return compact([
    selection.tmdb
      ? {
          source: "tmdb",
          source_id: selection.tmdb.id,
          source_type: selection.tmdb.type,
          relation_type: "primary",
          part_number: null,
          episode_count: null,
          episode_offset: 0,
        }
      : null,
    ...anilistItems.flatMap((item, index) => {
      const relationType = index === 0 ? "primary" : "part";
      const partNumber = index === 0 ? null : index + 1;

      return [{
        source: "anilist",
        source_id: item.id,
        source_type: null,
        relation_type: relationType,
        part_number: partNumber,
        episode_count: item.episodes,
        episode_offset: 0,
      }];
    }),
  ]);
}

export async function buildConfirmPayload(
  item: WatchImportItem,
  selection: ConfirmSelection
) {
  const anilistItems = await Promise.all(
    selection.anilistIds.map(async (id) => {
      const result = await getAniListAnimeById(id);

      if (!result) {
        throw new Error(`ANILIST_CANDIDATE_NOT_FOUND:${id}`);
      }

      return result;
    })
  );

  if (selection.tmdb?.type === "movie") {
    const movie = await getTmdbMovieDetails(selection.tmdb.id);

    if (!movie?.id) throw new Error(`TMDB_CANDIDATE_NOT_FOUND:${selection.tmdb.id}`);

    return {
      media: mapTmdbMovieMedia(item, movie, anilistItems),
      seasons: [],
      sourceLinks: buildSourceLinks(selection, anilistItems),
      ownedEpisodes: [],
    };
  }

  if (selection.tmdb?.type === "tv") {
    const tv = await getTmdbTvDetails(selection.tmdb.id);

    if (!tv?.id) throw new Error(`TMDB_CANDIDATE_NOT_FOUND:${selection.tmdb.id}`);

    return {
      media: mapTmdbTvMedia(item, tv, anilistItems),
      seasons: await buildTmdbTvSeasons(selection.tmdb.id, tv),
      sourceLinks: buildSourceLinks(selection, anilistItems),
      ownedEpisodes: selection.ownedEpisodes,
    };
  }

  if (!anilistItems.length) {
    throw new Error("NO_SOURCE_SELECTED");
  }

  return {
    media: mapAniListOnlyMedia(item, anilistItems),
    seasons: buildAniListOnlySeasons(item, anilistItems),
    sourceLinks: buildSourceLinks(selection, anilistItems),
    ownedEpisodes: [],
  };
}

export function selectedEpisodeCount(seasons: { episodes?: unknown[] }[]) {
  return seasons.reduce(
    (total, season) => total + (season.episodes?.length || 0),
    0
  );
}
