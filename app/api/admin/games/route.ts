import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/gameHelpers";

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function toCompletion(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, Math.floor(number)));
}

function toPlatinum(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function calculateCompletion(
  earnedAwards: number,
  totalAwards: number,
  manualCompletion: unknown
) {
  if (totalAwards > 0) {
    return Math.min(100, Math.floor((earnedAwards / totalAwards) * 100));
  }

  return toCompletion(manualCompletion);
}

export async function POST(request: Request) {
  const body = await request.json();

  const title = body.title?.trim();

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: newGame, error } = await supabase
    .from("games")
    .insert({
      title,
      slug: slugify(title),

      release: body.release || null,
date_started: body.dateStarted || null,
date_of_purchase: body.dateOfPurchase || null,
completion_last_played: body.completionLastPlayed || null,

      status: body.status || null,
      score: toNumber(body.score),
      hours_played: toNumber(body.hoursPlayed),
      price: body.price || null,

      store: body.store || null,
      platform: body.platform || null,
      hardware: body.hardware || null,

      igdb_id: body.igdbId || null,
      steam_appid: body.steamAppId || null,

      cover_url: body.coverUrl || null,
      hero_url: body.heroUrl || null,
      wide_cover_url: body.wideCoverUrl || null,
      steam_vertical_cover: body.steamVerticalCover || null,

      summary: body.summary || null,
      genre: body.genre || null,
      screenshots: body.screenshots || null,
      developer: body.developer || null,
      publisher: body.publisher || null,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const earnedAwards = toInteger(body.earnedAwards);
  const totalAwards = toInteger(body.totalAwards);

  const { error: achievementError } = await supabase
    .from("game_achievements")
    .upsert(
      {
        game_id: newGame.id,
        bronze: toInteger(body.bronze),
        silver: toInteger(body.silver),
        gold: toInteger(body.gold),
        platinum: toPlatinum(body.platinum),
        earned_awards: earnedAwards,
        total_awards: totalAwards,
        completion_percentage: calculateCompletion(
          earnedAwards,
          totalAwards,
          body.completionPercentage
        ),
      },
      { onConflict: "game_id" }
    );

    if (achievementError) {
    await supabase
      .from("games")
      .delete()
      .eq("id", newGame.id);

    return Response.json({ error: achievementError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}