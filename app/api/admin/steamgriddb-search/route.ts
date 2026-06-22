async function getIgdbToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  const data = await response.json();
  return data.access_token;
}

function getIgdbCoverUrl(imageId?: string) {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
}

function getIgdbImageUrl(imageId?: string) {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`;
}

function uniqueImages(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

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

    async function fetchIgdbImages(gameTitle: string) {
      try {
        const clientId = process.env.IGDB_CLIENT_ID;
        const token = await getIgdbToken();

        const response = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": clientId!,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: `
            search "${gameTitle.replace(/"/g, "")}";
            fields name, cover.image_id, screenshots.image_id;
            limit 10;
          `,
          cache: "no-store",
        });

        const data = await response.json();

        const verticalOptions = uniqueImages(
          data
            .map((game: any) => getIgdbCoverUrl(game?.cover?.image_id))
            .filter(Boolean)
        ).slice(0, 5);

        const wideOptions = uniqueImages(
          data
            .flatMap((game: any) => game?.screenshots || [])
            .map((screenshot: any) => getIgdbImageUrl(screenshot?.image_id))
            .filter(Boolean)
        ).slice(0, 5);

        return {
          verticalOptions,
          wideOptions,
        };
      } catch (error) {
        console.error("IGDB images failed:", error);

        return {
          verticalOptions: [],
          wideOptions: [],
        };
      }
    }

    let grids: any[] = [];

    if (steamAppId) {
      grids = await fetchGrids(
        `https://www.steamgriddb.com/api/v2/grids/steam/${steamAppId}?dimensions=920x430,460x215,600x900&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`
      );
    }

    if (grids.length === 0 && title) {
      const searchResponse = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
          title
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

      if (gameId) {
        grids = await fetchGrids(
          `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=920x430,460x215,600x900&types=static&nsfw=false&humor=false&epilepsy=false&limit=50`
        );
      }
    }

    const steamWideCoverOptions = grids
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

    const igdbImages = title
      ? await fetchIgdbImages(title)
      : { verticalOptions: [], wideOptions: [] };

    const wideCoverOptions = uniqueImages([
      ...steamWideCoverOptions,
      ...igdbImages.wideOptions,
    ]);

    const steamVerticalCoverOptionsFinal = uniqueImages([
      ...steamVerticalCoverOptions,
      ...igdbImages.verticalOptions,
    ]);

    return Response.json({
      wideCoverUrl: wideCoverOptions[0] || null,
      steamVerticalCover: steamVerticalCoverOptionsFinal[0] || null,
      wideCoverOptions,
      steamVerticalCoverOptions: steamVerticalCoverOptionsFinal,
    });
  } catch (error) {
    console.error("SteamGridDB / IGDB search failed:", error);

    return Response.json({
      wideCoverUrl: null,
      steamVerticalCover: null,
      wideCoverOptions: [],
      steamVerticalCoverOptions: [],
    });
  }
}