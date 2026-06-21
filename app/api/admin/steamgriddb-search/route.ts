export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const steamAppId = searchParams.get("steamAppId");
    const title = searchParams.get("title");

    async function fetchGrids(url: string) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
        },
        cache: "no-store",
      });

      const data = await response.json();
      return data?.data || [];
    }

    let grids: any[] = [];

    if (steamAppId) {
      grids = await fetchGrids(
        `https://www.steamgriddb.com/api/v2/grids/steam/${steamAppId}?dimensions=920x430,460x215,600x900&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`
      );
    }

    if (grids.length === 0 && title) {
      const searchResponse = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(title)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
          },
          cache: "no-store",
        }
      );

      const searchData = await searchResponse.json();
      const gameId = searchData?.data?.[0]?.id;

      if (gameId) {
        grids = await fetchGrids(
          `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=920x430,460x215,600x900&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`
        );
      }
    }

    const wideCoverOptions = grids
      .filter(
        (image: any) =>
          (image?.width === 920 && image?.height === 430) ||
          (image?.width === 460 && image?.height === 215)
      )
      .slice(0, 5)
      .map((image: any) => image.url);

    const steamVerticalCoverOptions = grids
      .filter((image: any) => image?.width === 600 && image?.height === 900)
      .slice(0, 5)
      .map((image: any) => image.url);

        return Response.json({
      wideCoverUrl: wideCoverOptions[0] || null,
      steamVerticalCover: steamVerticalCoverOptions[0] || null,
      wideCoverOptions,
      steamVerticalCoverOptions,
    });
  } catch (error) {
    console.error("SteamGridDB search failed:", error);

    return Response.json({
      wideCoverUrl: null,
      steamVerticalCover: null,
      wideCoverOptions: [],
      steamVerticalCoverOptions: [],
    });
  }
}