export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const steamAppId = searchParams.get("steamAppId");
    const title = searchParams.get("title");

    async function fetchGridBySteamAppId(appId: string) {
      const response = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/steam/${appId}?dimensions=920x430,460x215&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();
      return data?.data || [];
    }

    async function fetchGridByTitle(gameTitle: string) {
      const searchResponse = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
          gameTitle
        )}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
          },
          cache: "no-store",
        }
      );

      const searchData = await searchResponse.json();
      const gameId = searchData?.data?.[0]?.id;

      if (!gameId) return [];

      const gridResponse = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=920x430,460x215&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
          },
          cache: "no-store",
        }
      );

      const gridData = await gridResponse.json();
      return gridData?.data || [];
    }

    let grids: any[] = [];

    if (steamAppId) {
      grids = await fetchGridBySteamAppId(steamAppId);
    }

    if (grids.length === 0 && title) {
      grids = await fetchGridByTitle(title);
    }

    const bestGrid =
      grids.find((image: any) => image?.width === 920 && image?.height === 430) ||
      grids.find((image: any) => image?.width === 460 && image?.height === 215) ||
      grids[0];

    return Response.json({
      wideCoverUrl: bestGrid?.url || null,
    });
  } catch (error) {
    console.error("SteamGridDB grid search error:", error);

    return Response.json({
      wideCoverUrl: null,
    });
  }
}