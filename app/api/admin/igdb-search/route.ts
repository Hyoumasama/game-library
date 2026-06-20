import { getIgdbCoverUrl } from "@/lib/igdb";

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

  const games = await response.json();

  const results = games.map((game: any) => ({
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
  game.genres?.map((g: any) => g.name).join(", ") || null,

screenshots:
  game.screenshots
    ?.slice(0, 8)
    .map(
      (s: any) =>
        `https://images.igdb.com/igdb/image/upload/t_1080p/${s.image_id}.jpg`
    )
    .join(",") || null,

developer:
  game.involved_companies?.find((x: any) => x.developer)?.company?.name ||
  null,

publisher:
  game.involved_companies?.find((x: any) => x.publisher)?.company?.name ||
  null,
  }));

  return Response.json({ results });
}