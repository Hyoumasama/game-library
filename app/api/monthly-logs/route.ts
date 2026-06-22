import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();

  const gameId = Number(body.game_id);
  const title = String(body.title || "");
  const hours = Number(body.hours);
  const month = Number(body.month);
  const year = Number(body.year);

  if (!gameId || !title || !hours || !month || !year) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("monthly_play_logs")
    .insert({
      game_id: gameId,
      title,
      hours,
      month,
      year,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}