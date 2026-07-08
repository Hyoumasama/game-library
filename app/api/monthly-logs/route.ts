import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json();

  const gameId = Number(body.game_id);
  const title = String(body.title || "");
  const hours = Number(body.hours);
  const currentTotalHours = Number(body.currentTotalHours);
  const month = Number(body.month);
  const year = Number(body.year);

  if (!gameId || !title || Number.isNaN(hours) || Number.isNaN(currentTotalHours) || !month || !year) {
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

  const { error: updateGameError } = await supabase
  .from("games")
  .update({ hours_played: currentTotalHours })
  .eq("id", gameId);

if (updateGameError) {
  return Response.json({ error: updateGameError.message }, { status: 500 });
}

  return Response.json({ data });
}
export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return Response.json({ error: "Missing log id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("monthly_play_logs")
    .delete()
    .eq("log_id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
