import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";

const allowedStatuses = new Set([
  "Completed",
  "Playing",
  "Currently Playing",
  "Unplayed",
  "Skipped",
  "Dropped",
  "Wishlist",
]);

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableDate(value: unknown) {
  const text = nullableText(value);

  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

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
  const title = String(body.title || "").trim();
  const hours = Number(body.hours);
  const status = String(body.status || "").trim();
  const dateStarted = nullableDate(body.dateStarted);
  const completionLastPlayed = nullableDate(body.completionLastPlayed);
  const month = Number(body.month);
  const year = Number(body.year);

  if (
    !Number.isInteger(gameId) ||
    gameId <= 0 ||
    !title ||
    !Number.isFinite(hours) ||
    hours <= 0 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000
  ) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  if (status && !allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("insert_monthly_play_log", {
    p_game_id: gameId,
    p_title: title,
    p_hours: hours,
    p_month: month,
    p_year: year,
    p_status: status || null,
    p_date_started: dateStarted,
    p_completion_last_played: completionLastPlayed,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: Array.isArray(data) ? data[0] : data });
}
export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Missing log id" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("delete_monthly_play_log", {
    p_log_id: id,
  });

  if (error) {
    return Response.json(
      { error: "Failed to delete monthly log", details: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    data: Array.isArray(data) ? data[0] : data,
  });
}
