import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { check } from "@/lib/server/relationships/data";
import { normalizeTitle } from "@/lib/relationships/model";
import {
  uuid,
  text,
  relationshipPayload,
} from "@/lib/relationships/validation";
async function authorized(request: Request, write = false) {
  if (
    write &&
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return false;
  const store = await cookies();
  return verifyAdminSessionValue(store.get(ADMIN_SESSION_COOKIE)?.value);
}
function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid request";
  const conflict =
    /duplicate key|already resolved|relationships or memberships|foreign key/i.test(
      message,
    );
  return Response.json(
    {
      error: conflict
        ? "This operation conflicts with existing records. Refresh and check duplicate relationships or memberships."
        : message,
    },
    { status: conflict ? 409 : 400 },
  );
}
export async function GET(request: Request) {
  if (!(await authorized(request)))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    if (mode === "search") {
      const q = normalizeTitle(url.searchParams.get("q") || "");
      let query = supabase
        .from("canonical_games")
        .select("id,title,igdb_id,steam_appid")
        .order("normalized_title")
        .limit(50);
      if (q) query = query.like("normalized_title", `${q}%`);
      const games = check(await query) || [];
      const selected = url.searchParams.get("selected");
      if (selected && !games.some((g) => g.id === selected)) {
        const chosen = check(
          await supabase
            .from("canonical_games")
            .select("id,title,igdb_id,steam_appid")
            .eq("id", uuid(selected))
            .maybeSingle(),
        );
        if (chosen) games.unshift(chosen);
      }
      return Response.json({ games });
    }
    if (mode === "taxonomy") {
      const [series, franchises] = await Promise.all([
        supabase.from("game_series").select("*").order("name").limit(1000),
        supabase.from("game_franchises").select("*").order("name").limit(1000),
      ]);
      return Response.json({
        series: check(series),
        franchises: check(franchises),
      });
    }
    const status = url.searchParams.get("status") || "pending";
    if (!["pending", "approved", "rejected", "resolved"].includes(status))
      throw new Error("Invalid review status");
    const page = Math.max(
      0,
      Math.min(100000, Number(url.searchParams.get("page")) || 0),
    );
    const result = await supabase
      .from("game_relationship_reviews")
      .select(
        "*,source_game:canonical_games!source_game_id(id,title,igdb_id,steam_appid),target_game:canonical_games!target_game_id(id,title,igdb_id,steam_appid)",
        { count: "exact" },
      )
      .eq("status", status)
      .order("created_at")
      .order("id")
      .range(page * 30, page * 30 + 29);
    return Response.json({ reviews: check(result), count: result.count, page });
  } catch (error) {
    return failed(error);
  }
}
export async function POST(request: Request) {
  if (!(await authorized(request, true)))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (b.action === "review") {
      if (typeof b.approve !== "boolean")
        throw new Error("Review decision is required");
      check(
        await supabase.rpc("resolve_game_relationship_review", {
          review_id: uuid(b.id),
          approve: b.approve,
          notes: typeof b.notes === "string" ? b.notes.slice(0, 2000) : null,
        }),
      );
    } else if (b.action === "canonical") {
      const title = text(b.title);
      check(
        await supabase
          .from("canonical_games")
          .insert({ title, normalized_title: normalizeTitle(title) }),
      );
    } else if (b.action === "link") {
      const gameId = Number(b.game_id);
      if (!Number.isSafeInteger(gameId) || gameId < 1)
        throw new Error("Invalid owned copy ID");
      const cid = uuid(b.canonical_game_id);
      const version = check(
        await supabase
          .from("game_versions")
          .select("id")
          .eq("canonical_game_id", cid)
          .maybeSingle(),
      );
      check(
        await supabase.from("game_identity_links").upsert({
          game_id: gameId,
          canonical_game_id: cid,
          version_id: version?.id || null,
          confidence: 1,
          match_type: "manual",
        }),
      );
    } else if (b.action === "taxonomy") {
      const table =
        b.kind === "series"
          ? "game_series"
          : b.kind === "franchise"
            ? "game_franchises"
            : null;
      if (!table) throw new Error("Invalid taxonomy type");
      const name = text(b.name, 200),
        slug = normalizeTitle(name).replaceAll(" ", "-");
      if (!slug) throw new Error("Name must contain letters or numbers");
      check(
        await supabase.from(table).insert({
          name,
          slug,
          ...(table === "game_series"
            ? { franchise_id: b.franchise_id ? uuid(b.franchise_id) : null }
            : {}),
        }),
      );
    } else if (b.action === "membership") {
      const series = b.kind === "series";
      if (!series && b.kind !== "franchise")
        throw new Error("Invalid membership");
      const order = b.sort_order == null ? null : Number(b.sort_order);
      if (order !== null && !Number.isFinite(order))
        throw new Error("Invalid series order");
      check(
        await supabase
          .from(series ? "canonical_game_series" : "canonical_game_franchises")
          .upsert({
            canonical_game_id: uuid(b.canonical_game_id),
            [series ? "series_id" : "franchise_id"]: uuid(b.entity_id),
            ...(series ? { sort_order: order } : {}),
          }),
      );
    } else if (b.action === "relationship") {
      check(
        await supabase
          .from("game_relationships")
          .insert(relationshipPayload(b)),
      );
    } else throw new Error("Unknown action");
    return Response.json({ success: true });
  } catch (error) {
    return failed(error);
  }
}
export async function PATCH(request: Request) {
  if (!(await authorized(request, true)))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (b.action === "taxonomy") {
      if (b.kind !== "series")
        throw new Error("Only series have a parent franchise");
      check(
        await supabase
          .from("game_series")
          .update({
            franchise_id: b.franchise_id ? uuid(b.franchise_id) : null,
          })
          .eq("id", uuid(b.id))
          .select("id")
          .single(),
      );
    } else if (b.action === "canonical") {
      const title = text(b.title);
      check(
        await supabase
          .from("canonical_games")
          .update({ title, normalized_title: normalizeTitle(title) })
          .eq("id", uuid(b.id))
          .select("id")
          .single(),
      );
    } else
      check(
        await supabase
          .from("game_relationships")
          .update(relationshipPayload(b))
          .eq("id", uuid(b.id))
          .select("id")
          .single(),
      );
    return Response.json({ success: true });
  } catch (error) {
    return failed(error);
  }
}
export async function DELETE(request: Request) {
  if (!(await authorized(request, true)))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    if (b.action === "membership") {
      const series = b.kind === "series";
      if (!series && b.kind !== "franchise")
        throw new Error("Invalid membership");
      check(
        await supabase
          .from(series ? "canonical_game_series" : "canonical_game_franchises")
          .delete()
          .eq("canonical_game_id", uuid(b.canonical_game_id))
          .eq(series ? "series_id" : "franchise_id", uuid(b.entity_id)),
      );
    } else
      check(
        await supabase
          .from("game_relationships")
          .delete()
          .eq("id", uuid(b.id))
          .select("id")
          .single(),
      );
    return Response.json({ success: true });
  } catch (error) {
    return failed(error);
  }
}
