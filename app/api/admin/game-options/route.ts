import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.rpc("get_admin_game_options");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const options = data?.[0] || {
    stores: [],
    platforms: [],
    hardware: [],
  };

  return Response.json(options);
}