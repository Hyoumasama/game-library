import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/games";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function POST(request: Request) {
  const body = await request.json();

  const title = body.title?.trim();

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const { error } = await supabase.from("games").insert({
    title,
    slug: slugify(title),

    release: body.release || null,
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
    cover_url: body.coverUrl || null,
    summary: body.summary || null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}