import AllGamesClient from "@/components/AllGamesClient";
import {
  GAMES_LITE_PAGE_SIZE,
  getGamesLiteData,
  type GamesLiteFilters,
} from "@/lib/server/gamesLite";

type AllGamesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    store?: string;
    release?: string;
    completion?: string;
    genre?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function AllGamesPage({
  searchParams,
}: AllGamesPageProps) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const filters: GamesLiteFilters = {
    search: params.search || "",
    status: params.status || "All",
    store: params.store || "All",
    release: params.release || "All",
    completion: params.completion || "All",
    genre: params.genre || "All",
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
