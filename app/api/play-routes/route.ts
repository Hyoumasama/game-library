import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { getPlayRoutes } from "@/lib/server/constellations";
export async function GET() {
  try {
    return Response.json({ routes: await getPlayRoutes() });
  } catch {
    return Response.json({ error: "Unable to load routes." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  if (
    !(await verifyAdminSessionValue(
      (await cookies()).get(ADMIN_SESSION_COOKIE)?.value,
    ))
  )
    return Response.json({ error: "Admin login required." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || !["create", "save", "delete", "reorder", "move"].includes(body.action))
    return Response.json({ error: "Invalid action." }, { status: 400 });
  const { data, error } = await supabase.rpc(body.action === "move" ? "move_play_route_game" : body.action === "reorder" ? "reorder_play_routes" : "mutate_play_route", {
    payload: body,
  });
  if (error)
    return Response.json(
      {
        error:
          error.code === "PT409"
            ? "Route changed in another tab. Reload before editing."
            : error.code === "PT422" ? error.message : "Unable to save. Check your route and library games.",
      },
      { status: error.code === "PT409" ? 409 : 400 },
    );
  return Response.json({ saved: true, id: data });
}
