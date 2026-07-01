import { supabase } from "@/lib/supabase";

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

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("game_achievements")
    .select(
      "bronze, silver, gold, platinum, earned_awards, total_awards, completion_percentage"
    )
    .eq("game_id", Number(id))
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    achievements: data || {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      earned_awards: 0,
      total_awards: 0,
      completion_percentage: 0,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("games")
    .update({
      title: body.title,
      slug: slugify(body.title),
      release: body.release || null,
      date_started: body.dateStarted || null,
      date_of_purchase: body.dateOfPurchase || null,
      completion_last_played: body.completionLastPlayed || null,
      status: body.status || null,
      score: body.score || null,
      hours_played: body.hoursPlayed || null,
      price: body.price || null,
      store: body.store || null,
      platform: body.platform || null,
      hardware: body.hardware || null,

      cover_url: body.coverUrl || null,
      hero_url: body.heroUrl || null,
      wide_cover_url: body.wideCoverUrl || null,
      steam_vertical_cover: body.steamVerticalCover || null,
      summary: body.summary || null,
      genre: body.genre || null,
      screenshots: body.screenshots || null,
      developer: body.developer || null,
      publisher: body.publisher || null,
      igdb_id: body.igdbId || null,
      steam_appid: body.steamAppId || null,
    })
    .eq("id", Number(id))
    .select()
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
        game_id: Number(id),
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
  console.error("Achievement upsert failed:", achievementError);

  return Response.json(
    {
      error: achievementError.message,
      details: achievementError,
    },
    { status: 500 }
  );
}

  return Response.json({ game: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}