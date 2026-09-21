import { slugify } from "@/lib/gameHelpers";
import { normalizeGenres } from "@/lib/genres";

export type AdminGameBody = Record<string, unknown>;

export type AdminGameMetadataInput = {
  franchise: { id?: string; name: string } | { clear: true } | null;
  relationships: { id?: string; relationType: string; relatedGameId: string }[] | null;
};

export function parseAdminGameMetadata(body: AdminGameBody): AdminGameMetadataInput {
  const hasFranchise = Object.hasOwn(body, "franchise");
  const hasRelationships = Object.hasOwn(body, "relationships");
  const rawFranchise = body.franchise;
  const franchise = !hasFranchise
    ? null
    : rawFranchise === null
      ? { clear: true as const }
      : rawFranchise && typeof rawFranchise === "object" && (rawFranchise as { clear?: unknown }).clear === true
        ? { clear: true as const }
        : rawFranchise && typeof rawFranchise === "object"
    ? {
        id: typeof (rawFranchise as { id?: unknown }).id === "string" ? (rawFranchise as { id: string }).id : undefined,
        name: String((rawFranchise as { name?: unknown }).name || "").trim().replace(/\s+/g, " "),
      }
    : (() => { throw new Error("Invalid franchise update"); })();
  if (hasRelationships && !Array.isArray(body.relationships)) {
    throw new Error("Relationships must be an array");
  }
  const relationships = !hasRelationships ? null : (body.relationships as unknown[]).map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid relationship");
    const row = item as Record<string, unknown>;
    return {
      id: typeof row.id === "string" ? row.id : undefined,
      relationType: String(row.relationType || ""),
      relatedGameId: String(row.relatedGameId || ""),
    };
  });
  if (franchise && !("clear" in franchise) && !franchise.name) throw new Error("Franchise name is required");
  if (relationships?.some((row) => !row.relationType || !row.relatedGameId)) throw new Error("Every relationship needs a type and a related game");
  return { franchise, relationships };
}

export function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function toCompletion(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, Math.floor(number)));
}

export function toPlatinum(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

export function calculateCompletion(
  earnedAwards: number,
  totalAwards: number,
  manualCompletion: unknown
) {
  if (totalAwards > 0) {
    return Math.min(100, Math.floor((earnedAwards / totalAwards) * 100));
  }

  return toCompletion(manualCompletion);
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : value;
  return text || null;
}

export function buildGamePayload(body: AdminGameBody) {
  const title = String(body.title || "").trim();

  if (!Array.isArray(body.genres)) {
    throw new Error("Genres must be an array");
  }

  const genres = normalizeGenres(body.genres);

  return {
    title,
    slug: slugify(title),
    release: nullableText(body.release),
    date_started: nullableText(body.dateStarted),
    date_of_purchase: nullableText(body.dateOfPurchase),
    completion_last_played: nullableText(body.completionLastPlayed),
    status: nullableText(body.status),
    score: toNumber(body.score),
    hours_played: toNumber(body.hoursPlayed),
    price: nullableText(body.price),
    store: nullableText(body.store),
    platform: nullableText(body.platform),
    hardware: nullableText(body.hardware),
    igdb_id: nullableText(body.igdbId),
    steam_appid: nullableText(body.steamAppId),
    cover_url: nullableText(body.coverUrl),
    hero_url: nullableText(body.heroUrl),
    wide_cover_url: nullableText(body.wideCoverUrl),
    steam_vertical_cover: nullableText(body.steamVerticalCover),
    summary: nullableText(body.summary),
    genres: genres.length > 0 ? genres : null,
    screenshots: nullableText(body.screenshots),
    developer: nullableText(body.developer),
    publisher: nullableText(body.publisher),
  };
}

export function buildAchievementPayload(body: AdminGameBody, gameId: number) {
  const earnedAwards = toInteger(body.earnedAwards);
  const totalAwards = toInteger(body.totalAwards);

  return {
    game_id: gameId,
    bronze: toInteger(body.bronze),
    silver: toInteger(body.silver),
    gold: toInteger(body.gold),
    platinum: toPlatinum(body.platinum),
    earned_awards: earnedAwards,
    total_awards: totalAwards,
    completion_percentage: calculateCompletion(
      earnedAwards,
      totalAwards,
      body.completionPercentage
    ),
  };
}
