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
import type { MembershipRole, RelatedGame } from "@/lib/relationships/model";
async function paged<T>(
  query: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const data = check(await query(offset, offset + 499)) || [];
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
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
    paged((start, end) =>
      supabase
        .from("game_identity_links")
        .select(
          "game:games(id,title,store,platform,status,hardware,date_of_purchase,cover_url,steam_vertical_cover)",
        )
        .eq("canonical_game_id", canonicalId)
        .order("game_id")
        .range(start, end),
    ),
    supabase
      .from("canonical_game_series")
      .select("sort_order,series:game_series(*)")
      .eq("canonical_game_id", canonicalId)
      .order("sort_order"),
    supabase
      .from("canonical_game_franchises")
      .select("membership_role,franchise:game_franchises(*)")
      .eq("canonical_game_id", canonicalId),
    paged((start, end) =>
      supabase
        .from("game_relationships")
        .select("*")
        .or(`source_game_id.eq.${canonicalId},target_game_id.eq.${canonicalId}`)
        .order("id")
        .range(start, end),
    ),
    supabase
      .from("game_versions")
      .select("*")
      .eq("canonical_game_id", canonicalId)
      .maybeSingle(),
  ]);
  const [copyRows, seriesRows, franchiseRows, relationRows, version] =
    results.map((r) => (Array.isArray(r) ? r : check(r))) as unknown as [
      { game: OwnedCopy }[],
      { series: Series; sort_order: number | null }[],
      { franchise: Franchise; membership_role: MembershipRole }[],
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
  const others: CanonicalGame[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    others.push(
      ...(check(
        await supabase
          .from("canonical_games")
          .select("*")
          .in("id", ids.slice(offset, offset + 100)),
      ) as CanonicalGame[]),
    );
  }
  const byId = new Map<string, RelatedGame>(
    others.map((g) => [
      g.id,
      {
        ...g,
        owned_count: 0,
        library_game_id: null,
        cover_url:
          typeof g.metadata.cover_url === "string"
            ? g.metadata.cover_url
            : null,
      },
    ]),
  );
  // Batched joins fetch ownership and artwork only for related identities, never the full library.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const rows = await paged((start, end) =>
      supabase
        .from("game_identity_links")
        .select(
          "canonical_game_id,game:games(id,cover_url,steam_vertical_cover)",
        )
        .in("canonical_game_id", ids.slice(offset, offset + 100))
        .order("game_id")
        .range(start, end),
    );
    for (const row of rows as unknown as {
      canonical_game_id: string;
      game: Pick<OwnedCopy, "id" | "cover_url" | "steam_vertical_cover">;
    }[]) {
      const other = byId.get(row.canonical_game_id);
      if (!other || !row.game) continue;
      other.owned_count = (other.owned_count || 0) + 1;
      other.library_game_id ??= row.game.id;
      other.cover_url ||=
        row.game.steam_vertical_cover || row.game.cover_url || null;
    }
  }
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
    copies: copyRows
      .map((r) => ({ ...r.game, version_label: version?.name || null }))
      .filter((c) => c.id),
    series: seriesRows.map((r) => ({ ...r.series, sort_order: r.sort_order })),
    franchises: [
      ...new Map(
        [
          ...inherited.map((f) => ({
            ...f,
            membership_role: "hierarchy" as const,
          })),
          ...franchiseRows.map((r) => ({
            ...r.franchise,
            membership_role: r.membership_role,
          })),
        ].map((f) => [f.id, f]),
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
