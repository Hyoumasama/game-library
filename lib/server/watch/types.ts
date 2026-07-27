import "server-only";

export type WatchLocalType = "Series" | "Movie" | "OVA";
export type TmdbType = "movie" | "tv";

export type WatchMatchInput = {
  title: string;
  localType?: WatchLocalType;
  localSeasons?: number;
  localEpisodes?: number;
};

export type WatchMatchCandidate = {
  source: "tmdb" | "anilist";
  sourceId: number;
  tmdbType?: TmdbType;
  malId?: number | null;
  displayTitle: string;
  originalTitle?: string | null;
  englishTitle?: string | null;
  nativeTitle?: string | null;
  alternativeTitles: string[];
  type: string;
  format: string | null;
  releaseYear: number | null;
  episodeCount: number | null;
  posterUrl: string | null;
  score: number | null;
  confidence: number;
  confidenceReasons: string[];
};

export type WatchMatchPreview = {
  query: WatchMatchInput;
  tmdbCandidates: WatchMatchCandidate[];
  anilistCandidates: WatchMatchCandidate[];
};

export type WatchReviewSuggestion = {
  suggestedTmdbId: number | null;
  suggestedAniListId: number | null;
  suggestedAniListIds: number[];
};

export type TmdbSearchCandidate = {
  tmdb_id: number;
  tmdb_type: TmdbType;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  poster_url: string | null;
  backdrop_path: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  first_air_date: string | null;
  original_language: string | null;
  popularity: number | null;
  vote_average: number | null;
  vote_count: number | null;
  genre_ids: number[];
};

export type TmdbMovieDetails = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number | null;
  status?: string | null;
  vote_average?: number | null;
  genres?: { id: number; name: string }[];
};

export type TmdbTvDetails = {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  last_air_date?: string;
  episode_run_time?: number[];
  number_of_episodes?: number | null;
  number_of_seasons?: number | null;
  status?: string | null;
  vote_average?: number | null;
  genres?: { id: number; name: string }[];
  seasons?: {
    id: number;
    name?: string;
    overview?: string;
    poster_path?: string | null;
    air_date?: string | null;
    season_number?: number;
    episode_count?: number | null;
  }[];
};

export type TmdbSeasonDetails = {
  id: number;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  air_date?: string | null;
  season_number?: number;
  episodes?: {
    id: number;
    episode_number: number;
    name?: string;
    overview?: string;
    air_date?: string | null;
    runtime?: number | null;
    still_path?: string | null;
  }[];
};

export type AniListTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string | null;
};

export type AniListSearchCandidate = {
  id: number;
  idMal: number | null;
  title: AniListTitle;
  synonyms: string[];
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  startDate: string | null;
  endDate: string | null;
  averageScore: number | null;
  score: number | null;
  genres: string[];
  studios: { id: number; name: string; isAnimationStudio: boolean }[];
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  } | null;
  bannerImage: string | null;
  season: string | null;
  seasonYear: number | null;
  countryOfOrigin: string | null;
  isAdult: boolean;
};

export class WatchSourceError extends Error {
  status: number;
  source: "tmdb" | "anilist";
  retryAfter?: string | null;

  constructor({
    message,
    status,
    source,
    retryAfter,
  }: {
    message: string;
    status: number;
    source: "tmdb" | "anilist";
    retryAfter?: string | null;
  }) {
    super(message);
    this.name = "WatchSourceError";
    this.status = status;
    this.source = source;
    this.retryAfter = retryAfter;
  }
}
