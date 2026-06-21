import { supabase } from "@/lib/supabase";

const selectColumns = `
  id,
  title,
  release,
  date_of_purchase,
  completion_last_played,
  score,
  price,
  hours_played,
  status,
  store,
  platform,
  hardware,
  genre,
  cover_url
`;

export async function GET() {
  const { data: playingGames, error: playingError } = await supabase
    .from("games")
    .select(selectColumns)
    .eq("status", "Playing")
    .order("id", { ascending: false });

  if (playingError) {
    return Response.json({ error: playingError.message }, { status: 500 });
  }

  const { data: latestGames, error: latestError } = await supabase
    .from("games")
    .select(selectColumns)
    .order("id", { ascending: false })
    .limit(80);

  if (latestError) {
    return Response.json({ error: latestError.message }, { status: 500 });
  }

  const mergedGames = [...(playingGames || []), ...(latestGames || [])];

  const uniqueGames = Array.from(
    new Map(mergedGames.map((game) => [game.id, game])).values()
  );

  return Response.json(uniqueGames);
}