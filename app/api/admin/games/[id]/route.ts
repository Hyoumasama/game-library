import { supabase } from "@/lib/supabase";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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