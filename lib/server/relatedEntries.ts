import "server-only";
import { supabase } from "@/lib/supabase";
import { buildRelatedEntries, type Relation, type RelatedGame } from "@/lib/relatedEntries";
function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}
export async function getRelatedEntries(gameId: number) {
  try {
    return await fetchRelatedEntries(gameId);
  } catch (error) {
    // Optional relationship metadata must not prevent the library details from rendering.
    console.error("Unable to load related entries", error);
    return [];
  }
}
async function fetchRelatedEntries(gameId: number) {
  const identity = check(await supabase.from("game_identity_links").select("canonical_game_id").eq("game_id", gameId).maybeSingle());
  if (!identity) return [];
  const currentId: string = identity.canonical_game_id;
  const relations: Relation[] = [];
  for (let offset = 0; ; offset += 500) {
    const rows = check(await supabase.from("game_relationships").select("id,source_game_id,target_game_id,relation_type").or(`source_game_id.eq.${currentId},target_game_id.eq.${currentId}`).order("id").range(offset, offset + 499)) || [];
    relations.push(...rows);
    if (rows.length < 500) break;
  }
  const ids = [...new Set(relations.map(row => row.source_game_id === currentId ? row.target_game_id : row.source_game_id))];
  const games: RelatedGame[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const canonicals = check(await supabase.from("canonical_games").select("id,title,release_date,metadata").in("id", batch)) || [];
    const byId = new Map<string, RelatedGame>(canonicals.map(row => [row.id, { id: row.id, title: row.title, release_date: row.release_date, cover_url: typeof row.metadata?.cover_url === "string" ? row.metadata.cover_url : null, library_game_id: null }]));
    for (let start = 0; ; start += 500) {
      const copies = check(await supabase.from("game_identity_links").select("canonical_game_id,game:games!inner(id,cover_url,steam_vertical_cover)").in("canonical_game_id", batch).order("game_id").range(start, start + 499)) || [];
      for (const copy of copies) {
        const other = byId.get(copy.canonical_game_id);
        const game = copy.game as unknown as { id: number; cover_url: string | null; steam_vertical_cover: string | null };
        if (!other || !game) continue;
        other.library_game_id ??= game.id;
        other.cover_url ||= game.steam_vertical_cover || game.cover_url;
      }
      if (copies.length < 500) break;
    }
    games.push(...byId.values());
  }
  return buildRelatedEntries(currentId, relations, games);
}
