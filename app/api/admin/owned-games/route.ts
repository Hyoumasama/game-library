import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();

  if (!title || title.length < 3) {
    return Response.json({ games: [] });
  }

  const { data, error } = await supabase
    .from("games")
    .select("id, title, slug, store, platform, hardware, status")
    .ilike("title", `%${title}%`)
    .limit(10);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ games: data || [] });
}