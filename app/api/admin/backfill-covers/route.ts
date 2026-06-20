import { supabase } from "@/lib/supabase";
import { getIgdbGame } from "@/lib/igdb";

export async function POST() {
  const { data: games, error } = await supabase
    .from("games")
    .select("id, title, release, screenshots")
    .is("screenshots", null)
    .order("id", { ascending: true })
    .limit(800);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!games || games.length === 0) {
    return Response.json({
      done: true,
      message: "No games need screenshots backfill.",
      updated: 0,
    });
  }

  const results = [];

  for (const game of games) {
    try {
      const year = game.release
        ? String(game.release).slice(0, 4)
        : undefined;

      const igdbGame = await getIgdbGame(game.title, year);

      const screenshots =
        igdbGame?.screenshots
          ?.slice(0, 8)
          .map(
            (s: any) =>
              `https://images.igdb.com/igdb/image/upload/t_1080p/${s.image_id}.jpg`
          )
          .join(",") || null;

      const { error: updateError } = await supabase
        .from("games")
        .update({
          screenshots,
        })
        .eq("id", game.id);

      results.push({
        id: game.id,
        title: game.title,
        updated: !updateError,
        screenshots: screenshots ? screenshots.split(",").length : 0,
        error: updateError?.message || null,
      });
    } catch (error: any) {
      results.push({
        id: game.id,
        title: game.title,
        updated: false,
        error: error.message,
      });
    }
  }

  return Response.json({
    done: false,
    processed: games.length,
    results,
  });
}