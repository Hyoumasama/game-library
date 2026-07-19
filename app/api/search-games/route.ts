import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (q.trim().length < 2) {
    return Response.json([]);
  }

  const { data, error } = await supabase
    .from("games")
    .select("id, title, steam_vertical_cover, cover_url")
    .ilike("title", `%${q}%`)
    .order("title", { ascending: true })
    .limit(10);

  if (error) {
    return Response.json([]);
  }

  return Response.json(data || []);
}
