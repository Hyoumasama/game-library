import { getIgdbCoverUrl } from "@/lib/igdb";

type IgdbImage = { image_id?: string };
type IgdbGenre = { name?: string };
type IgdbCompany = {
  developer?: boolean;
  publisher?: boolean;
  company?: { name?: string };
};
type IgdbGame = {
  id?: number;
  name?: string;
  first_release_date?: number;
  cover?: IgdbImage;
  artworks?: IgdbImage[];
  screenshots?: IgdbImage[];
  summary?: string;
  genres?: IgdbGenre[];
  involved_companies?: IgdbCompany[];
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
async function getIgdbToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

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

  cachedToken = data.access_token;

  tokenExpiresAt =
    Date.now() + (Number(data.expires_in) - 60) * 1000;

  return cachedToken;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return Response.json({ results: [] });
  }

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
      search "${query}";
      fields
  name,
  first_release_date,
  cover.image_id,
  summary,
genres.name,
artworks.image_id,
screenshots.image_id,
  involved_companies.company.name,
  involved_companies.developer,
  involved_companies.publisher;
      limit 15;
    `,
    cache: "no-store",
  });

  const games = (await response.json()) as IgdbGame[];

    let finalGames = games;

  if (Array.isArray(games) && games.length === 0) {
    const exactResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId!,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: `
        fields
          name,
          first_release_date,
          cover.image_id,
          summary,
          genres.name,
          artworks.image_id,
          screenshots.image_id,
          involved_companies.company.name,
          involved_companies.developer,
          involved_companies.publisher;
        where name = "${query.replaceAll('"', '\\"')}";
        limit 15;
      `,
      cache: "no-store",
    });

    finalGames = (await exactResponse.json()) as IgdbGame[];
  }

  const results = finalGames.map((game: IgdbGame) => ({
    igdbId: game.id,
    title: game.name,
    year: game.first_release_date
  ? new Date(game.first_release_date * 1000).getFullYear()
  : null,

releaseDate: game.first_release_date
  ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
  : "",
    coverUrl: getIgdbCoverUrl(game.cover?.image_id),

heroUrl:
  game.artworks?.[0]?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.artworks[0].image_id}.jpg`
    : game.screenshots?.[0]?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.screenshots[0].image_id}.jpg`
    : null,

summary: game.summary || "",

genre:
  game.genres?.map((genre) => genre.name).join(", ") || null,

screenshots:
  game.screenshots
    ?.slice(0, 8)
    .map(
      (screenshot) =>
        `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`
    )
    .join(",") || null,

developer:
  game.involved_companies?.find((company) => company.developer)?.company?.name ||
  null,

publisher:
  game.involved_companies?.find((company) => company.publisher)?.company?.name ||
  null,
  }));

  return Response.json({ results });
}
