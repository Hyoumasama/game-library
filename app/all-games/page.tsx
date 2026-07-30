import AllGamesClient from "@/components/AllGamesClient";
import {
  GAMES_LITE_PAGE_SIZE,
  getGamesLiteData,
  type GamesLiteFilters,
} from "@/lib/server/gamesLite";

type AllGamesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string | string[];
    store?: string | string[];
    release?: string | string[];
    completion?: string | string[];
    genre?: string | string[];
    sort?: string;
    page?: string;
    playHistory?: string;
  }>;
};

function asArray(value?: string | string[]) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export default async function AllGamesPage({
  searchParams,
}: AllGamesPageProps) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const filters: GamesLiteFilters = {
    search: params.search || "",
    statuses: asArray(params.status),
    stores: asArray(params.store),
    releases: asArray(params.release),
    completions: asArray(params.completion),
    genres: asArray(params.genre),
    playHistory: params.playHistory || null,
  };
  const initialData = await getGamesLiteData({
    filters,
    sort: params.sort || "",
    page,
    pageSize: GAMES_LITE_PAGE_SIZE,
  });
  const initialFilters = {
    ...filters,
    sort: params.sort || "default",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };

  return <AllGamesClient initialData={initialData} initialFilters={initialFilters} />;
}
