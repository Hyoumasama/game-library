import { supabase } from "@/lib/supabase";

function positiveInt(value: string | null) {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

const PAGE_SIZE = 1000;

// Supabase caps an unpaginated select at 1000 rows, and the library has more
// games/identity links than that - without paging, anything past the first
// 1000 silently disappears from the owned-games picker (and from the
// current game's identity lookup below).
async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

export async function GET(request: Request) {
  const gameId = positiveInt(new URL(request.url).searchParams.get("gameId"));
  const [franchisesResult, typesResult, linksResult] = await Promise.all([
    supabase.from("game_franchises").select("id,name").order("name"),
    supabase.from("game_relationship_types").select("code,label_en,inverse_label_en,sort_order").eq("is_selectable", true).order("sort_order"),
    fetchAllRows((from, to) =>
      supabase.from("game_identity_links").select("game_id,canonical_game_id").order("game_id").range(from, to)
    ),
  ]);
  const error = franchisesResult.error || typesResult.error || linksResult.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Every linked game is needed, so page through `games` instead of an
  // `.in("id", [2000+ ids])` filter that would overflow the request URL.
  const gamesResult = await fetchAllRows((from, to) =>
    supabase.from("games").select("id,title,platform,store").order("title").order("id").range(from, to)
  );
  if (gamesResult.error) return Response.json({ error: gamesResult.error.message }, { status: 500 });

  const byCanonical = new Map<string, { id: string; title: string; platforms: Set<string> }>();
  const gamesById = new Map((gamesResult.data || []).map((game) => [game.id, game]));
  for (const link of linksResult.data) {
    const game = gamesById.get(link.game_id);
    if (!game) continue;
    const current = byCanonical.get(link.canonical_game_id) || { id: link.canonical_game_id, title: game.title, platforms: new Set<string>() };
    if (game.platform) current.platforms.add(game.platform);
    if (game.store) current.platforms.add(game.store);
    byCanonical.set(link.canonical_game_id, current);
  }

  let currentCanonicalId: string | null = null;
  let currentFranchise = null;
  let currentRelationships: unknown[] = [];
  if (gameId) {
    const link = linksResult.data.find((row) => row.game_id === gameId);
    currentCanonicalId = link?.canonical_game_id || null;
    if (currentCanonicalId) {
      const membership = await supabase
        .from("canonical_game_franchises")
        .select("franchise_id")
        .eq("canonical_game_id", currentCanonicalId)
        .limit(1)
        .maybeSingle();
      if (membership.error) return Response.json({ error: membership.error.message }, { status: 500 });
      const franchise = franchisesResult.data.find((row) => row.id === membership.data?.franchise_id);
      currentFranchise = franchise || null;
      const relationships = await supabase
        .from("game_relationships_bidirectional")
        .select("relationship_id,related_game_id,display_relation_type,perspective")
        .eq("game_id", currentCanonicalId)
        .order("relationship_id");
      if (relationships.error) return Response.json({ error: relationships.error.message }, { status: 500 });
      currentRelationships = relationships.data.map((row) => ({
        id: row.relationship_id,
        relatedGameId: row.related_game_id,
        relationType: row.display_relation_type,
        perspective: row.perspective,
      }));
    }
  }

  return Response.json({
    franchises: franchisesResult.data,
    relationshipTypes: typesResult.data.map((row) => ({ code: row.code, label: row.label_en })),
    ownedGames: [...byCanonical.values()].map((row) => ({
      ...row,
      platforms: [...row.platforms].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" })),
    })),
    currentCanonicalId,
    current: { franchise: currentFranchise, relationships: currentRelationships },
  });
}
