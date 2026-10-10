import "server-only";
import { supabase } from "@/lib/supabase";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { summarizeAwards, type Award } from "@/lib/awards";
import type { DbGame } from "@/lib/gameTypes";

export type AwardEvent = { id: string; year: number; ceremony_name: string; status: string; source_url: string; data_notes: string | null };
function missing(error: { code?: string } | null) { return error?.code === "42P01" || error?.code === "PGRST205"; }
export const getAwardEvents = unstable_cache(async () => {
  const { data, error } = await supabase.from("award_events").select("id,year,ceremony_name,status,source_url,data_notes").eq("award_organization", "tga").order("year", { ascending: false });
  if (missing(error)) return [];
  if (error) throw new Error(error.message);
  return data as AwardEvent[];
}, ["award-events", process.env.SUPABASE_URL || ""], { tags: [CACHE_TAGS.awards], revalidate: 300 });
export const getAwards = unstable_cache(async (year: number | null = null, gameIds: number[] | null = null, includeIncomplete = false) => {
  const rows: Award[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("award_details").select("*");
    if (!includeIncomplete) query = query.eq("event_status", "published");
    if (year != null) query = query.eq("year", year).eq("organization", "tga");
    if (gameIds != null) { if (!gameIds.length) return []; query = query.overlaps("library_game_ids", gameIds); }
    const { data, error } = await query.order("id").range(from, from + 999);
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    rows.push(...data as Award[]);
    if (data.length < 1000) break;
  }
  return rows;
}, ["award-details", process.env.SUPABASE_URL || ""], { tags: [CACHE_TAGS.awards, CACHE_TAGS.homeGames], revalidate: 300 });
export async function withAwardBadges<T extends DbGame>(games: T[]): Promise<T[]> {
  const ids = [...new Set(games.map(g => Number(g.id)).filter(Number.isFinite))];
  const awards: Award[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) awards.push(...await getAwards(null, ids.slice(offset, offset + 100)));
  const grouped = new Map<number, Award[]>();
  for (const award of awards) for (const id of award.library_game_ids || (award.game_id == null ? [] : [award.game_id])) grouped.set(Number(id), [...(grouped.get(Number(id)) || []), award]);
  return games.map(game => ({ ...game, award_summary: summarizeAwards(grouped.get(Number(game.id)) || []) }));
}
