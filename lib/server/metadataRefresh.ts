import { supabase } from "@/lib/supabase";
import { getIgdbToken, getIgdbExactReleaseDate, getIgdbCoverUrl, getIgdbImageUrl, type IgdbReleaseDate } from "@/lib/igdb";
import { normalizeGenres } from "@/lib/genres";
import { hasAdultGenre, withAdultGenre } from "@/lib/adultContent";
import { findHltbTimes, getHltbTimesById, HltbRateLimitError } from "@/lib/server/hltb";
import { findMetacriticScore } from "@/lib/server/metacritic";
import { matchesRefreshScope, metadataPatch, needsRefresh, type RefreshGame, type RefreshOptions, type RefreshType } from "@/lib/metadataRefresh";

export const REFRESH_COLUMNS = "id,title,status,release,igdb_id,igdb_slug,steam_appid,summary,genres,developer,publisher,cover_url,hero_url,screenshots,score,hltb_id,hltb_main,hltb_main_extra,hltb_completionist,hltb_main_count,hltb_locked";

type IgdbMetadata = {
  id: number; slug?: string; summary?: string; first_release_date?: number; release_dates?: IgdbReleaseDate[];
  genres?: { name: string }[]; cover?: { image_id: string }; artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  involved_companies?: { developer?: boolean; publisher?: boolean; company?: { name: string } }[];
};

async function fetchMetadata(game: RefreshGame) {
  const id = Number(game.igdb_id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const token = await getIgdbToken();
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Client-ID": process.env.IGDB_CLIENT_ID!, Authorization: `Bearer ${token}` },
    body: `fields slug,summary,first_release_date,release_dates.date,release_dates.date_format,genres.name,cover.image_id,artworks.image_id,screenshots.image_id,involved_companies.developer,involved_companies.publisher,involved_companies.company.name; where id = ${id}; limit 1;`,
  });
  if (!response.ok) throw new Error(`IGDB request failed (${response.status})`);
  const rows = await response.json() as IgdbMetadata[];
  const source = rows.find(row => row.id === id);
  if (!source) return null;
  const images = source.screenshots?.map(image => getIgdbImageUrl(image.image_id)).filter(Boolean) || [];
  const adult = hasAdultGenre(Array.isArray(game.genres) ? game.genres as string[] : null);
  const genres = normalizeGenres(source.genres?.map(genre => genre.name));
  return {
    release: getIgdbExactReleaseDate(source), summary: source.summary, igdb_slug: source.slug,
    genres: genres.length ? withAdultGenre(genres, adult) : undefined,
    cover_url: getIgdbCoverUrl(source.cover?.image_id),
    hero_url: getIgdbImageUrl(source.artworks?.[0]?.image_id) || (adult ? undefined : images[0]),
    screenshots: adult ? undefined : images.join(","),
    developer: source.involved_companies?.filter(c => c.developer).map(c => c.company?.name).filter(Boolean).join(", "),
    publisher: source.involved_companies?.filter(c => c.publisher).map(c => c.company?.name).filter(Boolean).join(", "),
  };
}

export type RefreshResult = { type: RefreshType; status: "updated" | "skipped" | "failed"; message: string; url?: string | null };

export async function refreshMetadataGame(game: RefreshGame, options: RefreshOptions): Promise<{ results: RefreshResult[]; halt: boolean }> {
  const results: RefreshResult[] = [];
  if (!matchesRefreshScope(game, options)) return { results: options.types.map(type => ({ type, status: "skipped", message: "Outside selected scope" })), halt: false };
  for (const type of options.types) {
    if (!needsRefresh(game, type, options.mode)) {
      results.push({ type, status: "skipped", message: type === "hltb" && game.hltb_locked ? "HLTB is locked" : "Already filled" });
      continue;
    }
    try {
      let incoming: Record<string, unknown> | null = null;
      let url: string | null = null;
      const year = game.release ? Number(String(game.release).slice(0, 4)) || null : null;
      if (type === "metadata") incoming = await fetchMetadata(game);
      if (type === "hltb") {
        const source = game.hltb_id ? await getHltbTimesById(Number(game.hltb_id)) : await findHltbTimes({ title: game.title || "", year, throwOnError: true });
        if (source) {
          incoming = { hltb_id: source.hltbId, hltb_main: source.main, hltb_main_extra: source.mainExtra, hltb_completionist: source.completionist, hltb_main_count: source.mainCount };
          url = source.url;
        }
      }
      if (type === "metacritic") {
        const source = await findMetacriticScore({ title: game.title || "", year, steamAppId: Number(game.steam_appid) || null, throwOnError: true });
        if (source) { incoming = { score: source.score }; url = source.url; }
      }
      if (!incoming) {
        results.push({ type, status: "skipped", message: type === "metadata" && !game.igdb_id ? "No linked IGDB game" : "No source data found", url });
        continue;
      }
      const patch = metadataPatch(game, incoming, options.mode);
      if (!Object.keys(patch).length) {
        results.push({ type, status: "skipped", message: "No changes available", url });
        continue;
      }
      // Recheck the lock at write time, including changes made while lookup was running.
      let query = supabase.from("games").update(patch).eq("id", game.id);
      if (type === "hltb") query = query.eq("hltb_locked", false);
      if (options.mode === "missing") {
        for (const field of Object.keys(patch)) {
          query = game[field] == null ? query.is(field, null) :
            Array.isArray(game[field]) ? query.filter(field, "eq", "{}") : query.eq(field, game[field]);
        }
      }
      const { data, error } = await query.select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) {
        results.push({ type, status: "skipped", message: "Game changed, removed or locked during refresh" });
      } else {
        Object.assign(game, patch);
        results.push({ type, status: "updated", message: `Updated ${Object.keys(patch).join(", ")}`, url });
      }
    } catch (error) {
      results.push({ type, status: "failed", message: error instanceof Error ? error.message : "Refresh failed" });
      if (error instanceof HltbRateLimitError) return { results, halt: true };
    }
  }
  return { results, halt: false };
}
