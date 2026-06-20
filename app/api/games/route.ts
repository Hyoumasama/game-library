import { supabase } from "@/lib/supabase";

export async function GET() {
  const pageSize = 1000;
  let from = 0;
  let allGames: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("games")
      .select(`
        id,
        title,
        slug,
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
      `)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) break;

    allGames = [...allGames, ...data];

    if (data.length < pageSize) break;

    from += pageSize;
  }

  return Response.json(allGames);
}