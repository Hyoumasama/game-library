import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { isPipelineIds } from "@/lib/pipeline";
import { getPipeline } from "@/lib/server/pipeline";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try { return Response.json({ games: await getPipeline() }); }
  catch { return Response.json({ error: "Unable to load pipeline." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  if (!await verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return Response.json({ error: "Admin login required." }, { status: 401 });
  }
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || !isPipelineIds(body.gameIds) || !isPipelineIds(body.expectedIds)) {
    return Response.json({ error: "Choose up to 15 unique library games." }, { status: 400 });
  }
  const { error } = await supabase.rpc("save_game_pipeline", {
    game_ids: body.gameIds, expected_ids: body.expectedIds,
  });
  if (error) console.error("Pipeline save failed:", error.code, error.message);
  if (error) return Response.json({ error: error.code === "PT409"
    ? "Pipeline changed in another tab. Reload before editing."
    : "Unable to save pipeline. Please try again." }, { status: error.code === "PT409" ? 409 : 400 });
  return Response.json({ saved: true });
}
