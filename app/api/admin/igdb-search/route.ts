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
      fields name, first_release_date, cover.image_id, summary;
      limit 10;
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
    summary: game.summary || "",
  }));

  return Response.json({ results });
}