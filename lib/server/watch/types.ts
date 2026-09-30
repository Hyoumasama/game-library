import "server-only";

export type TmdbType = "movie" | "tv";

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
