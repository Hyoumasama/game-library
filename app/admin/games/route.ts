import { supabase } from "@/lib/supabase";
import { buildGamePayload } from "@/lib/server/adminGamePayload";

export async function POST(request: Request) {
  const body = await request.json();
  const gamePayload = buildGamePayload(body);

  if (!gamePayload.title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const { error } = await supabase.from("games").insert(gamePayload);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
