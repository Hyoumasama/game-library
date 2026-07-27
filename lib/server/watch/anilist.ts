import "server-only";

import type { AniListSearchCandidate } from "@/lib/server/watch/types";
import { WatchSourceError } from "@/lib/server/watch/types";

const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_REVALIDATE_SECONDS = 60 * 60 * 24;

type AniListDate = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
};

type RawAniListMedia = Omit<
  AniListSearchCandidate,
  "startDate" | "endDate" | "score" | "studios"
> & {
  startDate?: AniListDate | null;
  endDate?: AniListDate | null;
  studios?: {
    nodes?: { id: number; name: string; isAnimationStudio: boolean }[];
  } | null;
};

type AniListResponse = {
  data?: {
    Page?: {
      media?: RawAniListMedia[];
    };
    Media?: RawAniListMedia | null;
  };
  errors?: { message?: string; status?: number }[];
};

const animeFields = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  synonyms
  format
  status
  episodes
  duration
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  averageScore
  genres
  studios {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
  coverImage {
    extraLarge
    large
    color
  }
  bannerImage
  season
  seasonYear
  countryOfOrigin
  isAdult
`;

const animeSearchQuery = `
  query SearchAnime($search: String!, $isAdult: Boolean) {
    Page(page: 1, perPage: 20) {
      media(
        search: $search,
        type: ANIME,
        isAdult: $isAdult,
        sort: SEARCH_MATCH
      ) {
        ${animeFields}
      }
    }
  }
`;

const animeByIdQuery = `
  query AnimeById($id: Int!, $isAdult: Boolean) {
    Media(id: $id, type: ANIME, isAdult: $isAdult) {
      ${animeFields}
    }
  }
`;

function formatAniListDate(date?: AniListDate | null) {
  if (!date?.year) return null;

  const month = String(date.month || 1).padStart(2, "0");
  const day = String(date.day || 1).padStart(2, "0");

  return `${date.year}-${month}-${day}`;
}

function normalizeAniListScore(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  return Math.round(score) / 10;
}

function normalizeAniListMedia(item: RawAniListMedia): AniListSearchCandidate {
  return {
    ...item,
    idMal: item.idMal || null,
    synonyms: item.synonyms || [],
    format: item.format || null,
    status: item.status || null,
    episodes: item.episodes || null,
    duration: item.duration || null,
    startDate: formatAniListDate(item.startDate),
    endDate: formatAniListDate(item.endDate),
    averageScore: item.averageScore || null,
    score: normalizeAniListScore(item.averageScore),
    genres: item.genres || [],
    studios: item.studios?.nodes || [],
    coverImage: item.coverImage || null,
    bannerImage: item.bannerImage || null,
    season: item.season || null,
    seasonYear: item.seasonYear || null,
    countryOfOrigin: item.countryOfOrigin || null,
    isAdult: Boolean(item.isAdult),
  };
}

export async function searchAniListAnimeByTitle(
  title: string,
  { includeAdult = false } = {}
): Promise<AniListSearchCandidate[]> {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: animeSearchQuery,
      variables: {
        search: title.trim(),
        isAdult: includeAdult,
      },
    }),
    cache: "force-cache",
    next: { revalidate: ANILIST_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new WatchSourceError({
      source: "anilist",
      status: response.status,
      message: `AniList request failed with status ${response.status}`,
      retryAfter: response.headers.get("retry-after"),
    });
  }

  const payload = (await response.json()) as AniListResponse;

  if (payload.errors?.length) {
    const rateLimited = payload.errors.find((error) => error.status === 429);

    throw new WatchSourceError({
      source: "anilist",
      status: rateLimited ? 429 : 500,
      message: "AniList GraphQL returned an error",
    });
  }

  const media = payload.data?.Page?.media;

  if (!Array.isArray(media)) {
    throw new WatchSourceError({
      source: "anilist",
      status: 500,
      message: "AniList search returned an invalid response",
    });
  }

  return media
    .filter((item) => includeAdult || !item.isAdult)
    .map(normalizeAniListMedia);
}

export async function getAniListAnimeById(
  id: number,
  { includeAdult = false } = {}
): Promise<AniListSearchCandidate | null> {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: animeByIdQuery,
      variables: {
        id,
        isAdult: includeAdult,
      },
    }),
    cache: "force-cache",
    next: { revalidate: ANILIST_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new WatchSourceError({
      source: "anilist",
      status: response.status,
      message: `AniList request failed with status ${response.status}`,
      retryAfter: response.headers.get("retry-after"),
    });
  }

  const payload = (await response.json()) as AniListResponse;

  if (payload.errors?.length) {
    const rateLimited = payload.errors.find((error) => error.status === 429);

    throw new WatchSourceError({
      source: "anilist",
      status: rateLimited ? 429 : 500,
      message: "AniList GraphQL returned an error",
    });
  }

  const media = payload.data?.Media;

  if (!media || (!includeAdult && media.isAdult)) return null;

  return normalizeAniListMedia(media);
}
