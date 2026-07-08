import { supabase } from "@/lib/supabase";

const STEAMGRIDDB_API_KEY = process.env.STEAMGRIDDB_API_KEY;

async function getSteamGridDbGameId(title: string) {
  if (!STEAMGRIDDB_API_KEY) {
    throw new Error("Missing STEAMGRIDDB_API_KEY");
  }

  const response = await fetch(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
      title
    )}`,
    {
      headers: {
        Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
      },
    }
  );

  const data = await response.json();

  return data?.data?.[0]?.id || null;
}

async function getSteamGridDbCover(gameId: number, dimensions: string) {
  if (!STEAMGRIDDB_API_KEY) {
    throw new Error("Missing STEAMGRIDDB_API_KEY");
  }

  const response = await fetch(
    `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=${dimensions}`,
    {
      headers: {
        Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
      },
    }
  );

  const data = await response.json();

  return data?.data?.[0]?.url || null;
}

export async function POST() {
  const { data: games, error } = await supabase
    .from("games")
    .select("id, title, steam_vertical_cover, wide_cover_url")
    .or("steam_vertical_cover.is.null,wide_cover_url.is.null")
    .order("id", { ascending: true })
    .limit(800);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!games || games.length === 0) {
    return Response.json({
      done: true,
      message: "No games need SteamGridDB covers backfill.",
      updated: 0,
    });
  }

  const results = [];

  for (const game of games) {
    try {
      const gameId = await getSteamGridDbGameId(game.title);

      if (!gameId) {
        results.push({
          id: game.id,
          title: game.title,
          updated: false,
          steamVerticalCover: null,
          wideCoverUrl: null,
          error: "Game not found in SteamGridDB",
        });

        continue;
      }

      const steamVerticalCover = game.steam_vertical_cover
        ? game.steam_vertical_cover
        : await getSteamGridDbCover(gameId, "600x900");

      const wideCoverUrl = game.wide_cover_url
        ? game.wide_cover_url
        : await getSteamGridDbCover(gameId, "920x430");

      const { error: updateError } = await supabase
        .from("games")
        .update({
          steam_vertical_cover: steamVerticalCover,
          wide_cover_url: wideCoverUrl,
        })
        .eq("id", game.id);

      results.push({
        id: game.id,
        title: game.title,
        updated: !updateError,
        steamVerticalCover,
        wideCoverUrl,
        error: updateError?.message || null,
      });
    } catch (error) {
      results.push({
        id: game.id,
        title: game.title,
        updated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return Response.json({
    done: false,
    processed: games.length,
    results,
  });
}
