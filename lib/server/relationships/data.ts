import "server-only";
import { supabase } from "@/lib/supabase";
import type {
  CanonicalGame,
  Relationship,
  RelationshipDetail,
  Series,
  Franchise,
  OwnedCopy,
  GameVersion,
} from "@/lib/relationships/model";
function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
export async function getRelationshipDetail(
  canonicalId: string,
): Promise<RelationshipDetail | null> {
  const canonicalResult = await supabase
    .from("canonical_games")
    .select("*")
    .eq("id", canonicalId)
    .maybeSingle();
  const canonical = check(canonicalResult) as CanonicalGame | null;
  if (!canonical) return null;
  const results = await Promise.all([
    supabase
      .from("game_identity_links")
      .select("game:games(id,title,store,platform,status)")
      .eq("canonical_game_id", canonicalId)
      .order("game_id")
      .limit(500),
    supabase
      .from("canonical_game_series")
      .select("sort_order,series:game_series(*)")
      .eq("canonical_game_id", canonicalId)
      .order("sort_order"),
    supabase
      .from("canonical_game_franchises")
      .select("franchise:game_franchises(*)")
      .eq("canonical_game_id", canonicalId),
    supabase
      .from("game_relationships")
      .select("*")
      .or(`source_game_id.eq.${canonicalId},target_game_id.eq.${canonicalId}`)
      .order("relation_type")
      .limit(500),
    supabase
      .from("game_versions")
      .select("*")
      .eq("canonical_game_id", canonicalId)
      .maybeSingle(),
  ]);
  const [copyRows, seriesRows, franchiseRows, relationRows, version] =
    results.map((r) => check(r)) as unknown as [
      { game: OwnedCopy }[],
      { series: Series }[],
      { franchise: Franchise }[],
      Relationship[],
      GameVersion | null,
    ];
  const ids = [
    ...new Set(
      relationRows.map((r) =>
        r.source_game_id === canonicalId ? r.target_game_id : r.source_game_id,
      ),
    ),
  ];
  const others = ids.length
    ? (check(
        await supabase.from("canonical_games").select("*").in("id", ids),
      ) as CanonicalGame[])
    : [];
  const byId = new Map(others.map((g) => [g.id, g]));
  // Include franchises inherited through series membership without duplicate queries per series.
  const inheritedIds = seriesRows
    .map((r) => r.series.franchise_id)
    .filter((id): id is string => !!id);
  const inherited = inheritedIds.length
    ? (check(
        await supabase
          .from("game_franchises")
          .select("*")
          .in("id", [...new Set(inheritedIds)]),
      ) as Franchise[])
    : [];
  return {
    canonical,
    version,
    copies: copyRows.map((r) => r.game).filter(Boolean),
    series: seriesRows.map((r) => r.series),
    franchises: [
      ...new Map(
        [...franchiseRows.map((r) => r.franchise), ...inherited].map((f) => [
          f.id,
          f,
        ]),
      ).values(),
    ],
    relationships: relationRows
      .map((r) => ({
        ...r,
        other: byId.get(
          r.source_game_id === canonicalId
            ? r.target_game_id
            : r.source_game_id,
        )!,
      }))
      .filter((r) => r.other),
  };
}
export async function canonicalIdForCopy(gameId: number) {
  const result = await supabase
    .from("game_identity_links")
    .select("canonical_game_id")
    .eq("game_id", gameId)
    .maybeSingle();
  return check(result)?.canonical_game_id as string | undefined;
}
export { check };
