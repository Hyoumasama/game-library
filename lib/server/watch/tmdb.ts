import "server-only";

import type {
  TmdbMovieDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbType,
} from "@/lib/server/watch/types";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

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
    throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");
  }

  return token;
}

// TMDB_READ_ACCESS_TOKEN may hold either a v4 read access token (a long JWT,
// sent as a bearer header) or a short v3 API key (sent as a query parameter).
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
  });

  if (!response.ok) {
    throw new Error(`TMDB request ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

type RawTmdbSearchResult = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
};

export type TmdbSearchResult = {
  id: number;
  type: TmdbType;
  title: string;
  originalTitle: string | null;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
};

export async function searchTmdb(query: string, type: TmdbType) {
  const data = await fetchTmdb<{ results?: RawTmdbSearchResult[] }>(
    `/search/${type}?query=${encodeURIComponent(query.trim())}&include_adult=true&language=en-US&page=1`
  );

  return (data.results || [])
    .filter((result): result is RawTmdbSearchResult & { id: number } =>
      Number.isSafeInteger(result.id)
    )
    .map((result): TmdbSearchResult => {
      const date = type === "movie" ? result.release_date : result.first_air_date;
      const year = Number(date?.slice(0, 4));

      return {
        id: result.id,
        type,
        title: (type === "movie" ? result.title : result.name) || `TMDB ${result.id}`,
        originalTitle:
          (type === "movie" ? result.original_title : result.original_name) || null,
        year: Number.isFinite(year) && year > 0 ? year : null,
        overview: result.overview || null,
        posterUrl: getTmdbImageUrl(result.poster_path, "w185"),
      };
    });
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
