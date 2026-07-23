import { supabase } from "@/lib/supabase";

type OwnedGame = {
  id: number;
  title: string | null;
  slug: string | null;
  store: string | null;
  platform: string | null;
  hardware: string | null;
  status: string | null;
};

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function uniqueGames(games: OwnedGame[], excludeId: number | null) {
  const byId = new Map<number, OwnedGame>();

  for (const game of games) {
    if (excludeId && game.id === excludeId) continue;
    byId.set(game.id, game);
  }

  return [...byId.values()];
}

async function findOwnedGamesByTitle(title: string) {
  return supabase
    .from("games")
    .select("id, title, slug, store, platform, hardware, status")
    .ilike("title", `%${title}%`)
    .limit(10);
}

async function findOwnedGamesByIgdbId(igdbId: number) {
  return supabase
    .from("games")
    .select("id, title, slug, store, platform, hardware, status")
    .eq("igdb_id", igdbId)
    .limit(10);
}

async function findOwnedGamesBySteamAppId(steamAppId: number) {
  return supabase
    .from("games")
    .select("id, title, slug, store, platform, hardware, status")
    .eq("steam_appid", steamAppId)
    .limit(10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const igdbId = parsePositiveInteger(searchParams.get("igdbId"));
  const steamAppId = parsePositiveInteger(searchParams.get("steamAppId"));
  const excludeId = parsePositiveInteger(searchParams.get("excludeId"));

  if ((!title || title.length < 3) && !igdbId && !steamAppId) {
    return Response.json({ games: [] });
  }

  const queries = [];

  if (title && title.length >= 3) {
    queries.push(findOwnedGamesByTitle(title));
  }

  if (igdbId) {
    queries.push(findOwnedGamesByIgdbId(igdbId));
  }

  if (steamAppId) {
    queries.push(findOwnedGamesBySteamAppId(steamAppId));
  }

  const responses = await Promise.all(queries);
  const failedResponse = responses.find((response) => response.error);

  if (failedResponse?.error) {
    return Response.json(
      { error: failedResponse.error.message },
      { status: 500 }
    );
  }

  return Response.json({
    games: uniqueGames(
      responses.flatMap((response) => response.data || []),
      excludeId
    ),
  });
}
