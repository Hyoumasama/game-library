import "server-only";

import type {
  TmdbMovieDetails,
  TmdbSearchCandidate,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbType,
} from "@/lib/server/watch/types";
import { WatchSourceError } from "@/lib/server/watch/types";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_REVALIDATE_SECONDS = 60 * 60 * 24;

type RawTmdbSearchResult = {
  id?: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

type RawTmdbSearchResponse = {
  results?: RawTmdbSearchResult[];
};

export function getTmdbImageUrl(
  path?: string | null,
  size = "w500"
): string | null {
  if (!path) return null;

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

function getTmdbToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    throw new WatchSourceError({
      source: "tmdb",
      status: 500,
      message: "TMDB_READ_ACCESS_TOKEN is not configured",
    });
  }

  return token;
}

function getTmdbRequestPath(path: string, token: string) {
  if (token.includes(".") || token.length > 80) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}api_key=${encodeURIComponent(token)}`;
}

async function fetchTmdb<T>(path: string): Promise<T> {
  const token = getTmdbToken();
  const requestPath = getTmdbRequestPath(path, token);
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (requestPath === path) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${TMDB_API_BASE_URL}${requestPath}`, {
    headers,
    cache: "force-cache",
    next: { revalidate: TMDB_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new WatchSourceError({
      source: "tmdb",
      status: response.status,
      message: `TMDB request failed with status ${response.status}`,
      retryAfter: response.headers.get("retry-after"),
    });
  }

  return response.json() as Promise<T>;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeTmdbResult(
  result: RawTmdbSearchResult,
  tmdbType: TmdbType
): TmdbSearchCandidate | null {
  if (!Number.isSafeInteger(result.id)) return null;

  const title =
    tmdbType === "movie"
      ? stringOrNull(result.title)
      : stringOrNull(result.name);

  if (!title) return null;

  return {
    tmdb_id: result.id!,
    tmdb_type: tmdbType,
    title,
    original_title:
      tmdbType === "movie"
        ? stringOrNull(result.original_title)
        : stringOrNull(result.original_name),
    overview: stringOrNull(result.overview),
    poster_path: result.poster_path || null,
    poster_url: getTmdbImageUrl(result.poster_path),
    backdrop_path: result.backdrop_path || null,
    backdrop_url: getTmdbImageUrl(result.backdrop_path, "w1280"),
    release_date: stringOrNull(result.release_date),
    first_air_date: stringOrNull(result.first_air_date),
    original_language: stringOrNull(result.original_language),
    popularity: numberOrNull(result.popularity),
    vote_average: numberOrNull(result.vote_average),
    vote_count: numberOrNull(result.vote_count),
    genre_ids: Array.isArray(result.genre_ids) ? result.genre_ids : [],
  };
}

export async function searchTmdbByTitle(title: string) {
  const query = encodeURIComponent(title.trim());
  const [movieData, tvData] = await Promise.all([
    fetchTmdb<RawTmdbSearchResponse>(
      `/search/movie?query=${query}&include_adult=false&language=en-US&page=1`
    ),
    fetchTmdb<RawTmdbSearchResponse>(
      `/search/tv?query=${query}&include_adult=false&language=en-US&page=1`
    ),
  ]);

  const movieResults = (movieData.results || [])
    .map((result) => normalizeTmdbResult(result, "movie"))
    .filter((result): result is TmdbSearchCandidate => Boolean(result));
  const tvResults = (tvData.results || [])
    .map((result) => normalizeTmdbResult(result, "tv"))
    .filter((result): result is TmdbSearchCandidate => Boolean(result));

  return [...movieResults, ...tvResults].sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0)
  );
}

export async function searchTmdbByTitleAndType(title: string, tmdbType: TmdbType) {
  const query = encodeURIComponent(title.trim());
  const path =
    tmdbType === "movie"
      ? `/search/movie?query=${query}&include_adult=false&language=en-US&page=1`
      : `/search/tv?query=${query}&include_adult=false&language=en-US&page=1`;
  const data = await fetchTmdb<RawTmdbSearchResponse>(path);

  return (data.results || [])
    .map((result) => normalizeTmdbResult(result, tmdbType))
    .filter((result): result is TmdbSearchCandidate => Boolean(result))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

export function getTmdbMovieDetails(tmdbId: number) {
  return fetchTmdb<TmdbMovieDetails>(
    `/movie/${tmdbId}?language=en-US`
  );
}

export function getTmdbTvDetails(tmdbId: number) {
  return fetchTmdb<TmdbTvDetails>(
    `/tv/${tmdbId}?language=en-US`
  );
}

export function getTmdbTvSeasonDetails(tmdbId: number, seasonNumber: number) {
  return fetchTmdb<TmdbSeasonDetails>(
    `/tv/${tmdbId}/season/${seasonNumber}?language=en-US`
  );
}
