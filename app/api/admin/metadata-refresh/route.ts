import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { matchesRefreshScope, needsRefresh, parseRefreshOptions, type RefreshGame } from "@/lib/metadataRefresh";
import { REFRESH_COLUMNS, refreshMetadataGame } from "@/lib/server/metadataRefresh";
import { revalidateGameCaches } from "@/lib/server/cacheTags";

export const maxDuration = 120;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!await verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  let options;
  try {
    body = await request.json();
    options = parseRefreshOptions(body.options);
    if (body.action !== "preview" && body.action !== "refresh") throw new Error("Invalid action");
    if (body.action === "refresh" && (!Number.isSafeInteger(body.id) || body.id <= 0)) throw new Error("Invalid game ID");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
  try {
    if (body.action === "preview") {
      const ids: number[] = [];
      // Stable pagination: the resulting ID list stays fixed while missing fields are filled.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("games").select(REFRESH_COLUMNS).order("id").range(offset, offset + 499);
        if (error) throw new Error(error.message);
        for (const game of (data || []) as RefreshGame[]) {
          if (matchesRefreshScope(game, options) && options.types.some(type => needsRefresh(game, type, options.mode))) ids.push(Number(game.id));
        }
        if (!data || data.length < 500) break;
      }
      return Response.json({ ids, total: ids.length });
    }
    const { data, error } = await supabase.from("games").select(REFRESH_COLUMNS).eq("id", body.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return Response.json({ title: `#${body.id}`, results: options.types.map(type => ({ type, status: "skipped", message: "Game removed" })), halt: false });
    const outcome = await refreshMetadataGame(data as RefreshGame, options);
    if (outcome.results.some(result => result.status === "updated")) revalidateGameCaches();
    return Response.json({ title: data.title, ...outcome });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Refresh failed" }, { status: 500 });
  }
}
