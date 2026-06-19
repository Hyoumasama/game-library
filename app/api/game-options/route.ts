import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("games")
    .select("store, platform, hardware");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const unique = (key: "store" | "platform" | "hardware") =>
    Array.from(
      new Set(
        (data || [])
          .map((item) => item[key])
          .filter(Boolean)
      )
    ).sort();

  return Response.json({
    stores: unique("store"),
    platforms: unique("platform"),
    hardware: unique("hardware"),
  });
}