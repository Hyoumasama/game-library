import { normalize, uuid, versionCandidate } from "./planner.mjs";
export function buildEnrichmentPlan(canonical, metadata) {
  const byIgdb = new Map();
  for (const c of canonical) {
    if (!c.igdb_id) continue;
    const a = byIgdb.get(c.igdb_id) || [];
    a.push(c);
    byIgdb.set(c.igdb_id, a);
  }
  const external = new Map(metadata.map((g) => [g.id, g]));
  function trusted(c) {
    const g = external.get(c.igdb_id);
    if (!g) return false;
    const names = [
      g.name,
      ...(g.alternative_names || []).map((x) => x.name),
    ].map(normalize);
    const year = g.first_release_date
      ? new Date(g.first_release_date * 1000).getUTCFullYear()
      : null;
    return (
      (byIgdb.get(c.igdb_id) || []).length === 1 &&
      names.includes(c.normalized_title) &&
      (!c.release_date || !year || Number(c.release_date.slice(0, 4)) === year)
    );
  }
  const relationships = [],
    reviews = [],
    franchises = new Map(),
    series = new Map(),
    franchise_memberships = [],
    series_memberships = [];
  function edge(sourceId, targetId, type) {
    for (const source of byIgdb.get(sourceId) || [])
      for (const target of byIgdb.get(targetId) || []) {
        if (source.id === target.id) continue;
        const key = `relationship:${source.id}:${target.id}:${type}`;
        if (
          trusted(source) &&
          trusted(target) &&
          (type !== "edition_of" ||
            versionCandidate(source.title)?.base === target.normalized_title)
        )
          relationships.push({
            source_game_id: source.id,
            target_game_id: target.id,
            relation_type: type,
            notes: `Explicit IGDB ${type} metadata (${sourceId} -> ${targetId})`,
          });
        else
          reviews.push({
            candidate_key: key,
            source_game_id: source.id,
            target_game_id: target.id,
            proposed_relation: type,
            confidence: 0.85,
            reason:
              "IGDB explicitly links these identifiers, but a local title, release year, edition parent, or disputed identity requires verification.",
            identifiers: {
              source_igdb_id: sourceId,
              target_igdb_id: targetId,
              source_external: external.get(sourceId)?.name,
              target_external: external.get(targetId)?.name,
            },
          });
      }
  }
  for (const g of metadata) {
    for (const [field, type] of [
      ["remakes", "remake_of"],
      ["remasters", "remaster_of"],
      ["dlcs", "dlc_of"],
      ["expansions", "expansion_of"],
      ["standalone_expansions", "standalone_expansion_of"],
      ["expanded_games", "enhanced_edition_of"],
    ])
      for (const child of g[field] || []) edge(child, g.id, type);
    for (const bundle of g.bundles || [])
      edge(bundle, g.id, "collection_contains");
    if (g.version_parent) edge(g.id, g.version_parent, "edition_of");
    for (const c of byIgdb.get(g.id) || [])
      if (trusted(c)) {
        for (const f of [
          ...(g.franchises || []),
          ...(g.franchise ? [g.franchise] : []),
        ]) {
          if (!f.name) continue;
          const id = uuid(`igdb-franchise:${f.id}`);
          franchises.set(id, {
            id,
            name: f.name,
            slug: `${normalize(f.name).replaceAll(" ", "-")}-${f.id}`,
            igdb_franchise_id: f.id,
          });
          franchise_memberships.push({
            canonical_game_id: c.id,
            franchise_id: id,
          });
        }
        for (const s of g.collections || []) {
          if (!s.name) continue;
          const id = uuid(`igdb-series:${s.id}`);
          series.set(id, {
            id,
            name: s.name,
            slug: `${normalize(s.name).replaceAll(" ", "-")}-${s.id}`,
          });
          series_memberships.push({ canonical_game_id: c.id, series_id: id });
        }
      }
  }
  const uniqueRelationships = [
    ...new Map(
      relationships.map((r) => [
        `${r.source_game_id}:${r.target_game_id}:${r.relation_type}`,
        r,
      ]),
    ).values(),
  ];
  const uniqueReviews = [
    ...new Map(reviews.map((r) => [r.candidate_key, r])).values(),
  ];
  return {
    relationships: uniqueRelationships,
    reviews: uniqueReviews,
    franchises: [...franchises.values()],
    series: [...series.values()],
    franchise_memberships,
    series_memberships,
    report: {
      igdb_records: metadata.length,
      relationship_candidates:
        uniqueRelationships.length + uniqueReviews.length,
      automatically_accepted: uniqueRelationships.length,
      manual_review: uniqueReviews.length,
      franchises: franchises.size,
      series: series.size,
    },
  };
}
