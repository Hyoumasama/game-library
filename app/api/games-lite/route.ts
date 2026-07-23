import {
  GAMES_LITE_PAGE_SIZE,
  getGamesLiteData,
  type GamesLiteFilters,
} from "@/lib/server/gamesLite";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || GAMES_LITE_PAGE_SIZE);
  const filters: GamesLiteFilters = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    store: searchParams.get("store") || "",
    release: searchParams.get("release") || "",
    completion: searchParams.get("completion") || "",
    genre: searchParams.get("genre") || "",
    steamAppId: searchParams.get("steamAppId") || "",
  };
  const sort = searchParams.get("sort") || "";

  try {
    return Response.json(
      await getGamesLiteData({
        filters,
        sort,
        page,
        pageSize,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
