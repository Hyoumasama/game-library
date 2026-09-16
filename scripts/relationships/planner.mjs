import { referenceCandidates } from "./reference-candidates.mjs";
import { createHash } from "node:crypto";
export const normalize = (title) =>
  String(title || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const uuid = (key) => {
  const h = createHash("sha256").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const editionPattern =
  /(?:[ :\u2013\u2014-]+)?(remastered|remaster|remake|definitive edition|enhanced edition|director['\u2019]?s cut|ultimate edition|gold edition|goty(?: edition)?|game of the year(?: edition)?|complete edition|deluxe edition|special edition|anniversary edition|premium edition|platinum edition|celebration edition|eldritch edition|edition|unrated|redux|royal edition|spacer['\u2019]?s choice edition)$/i;
export function versionCandidate(title) {
  const m = title.match(editionPattern);
  if (!m) return null;
  const suffix = m[1].toLowerCase();
  const type = suffix.includes("remaster")
    ? "remaster_of"
    : suffix === "remake"
      ? "remake_of"
      : suffix.includes("enhanced") ||
          suffix.includes("director") ||
          suffix === "unrated" ||
          suffix === "eldritch edition"
        ? "enhanced_edition_of"
        : "edition_of";
  return { base: normalize(title.slice(0, m.index)), type, name: m[1] };
}
export function releaseMarkers(title) {
  return [
    ...new Set(
      normalize(title).match(
        /\b(?:edition|remastered|remaster|remake|redux|directors|director|goty|unrated|demo|playtest|beta|prologue)\b/g,
      ) || [],
    ),
  ]
    .sort()
    .join(",");
}
export function canReuseIdentity(game, canonical) {
  const aliases = canonical.metadata?.verified_ownership_aliases || [];
  if (aliases.some((a) => normalize(a.title) === normalize(game.title) &&
    String(a.release_year || "") === String(game.release || "").slice(0, 4) &&
    game.igdb_id > 0 && a.igdb_id === game.igdb_id && canonical.igdb_id === game.igdb_id &&
    (game.steam_appid || null) === (a.steam_appid || null))) return true;
  return (
    (normalize(game.title) === normalize(canonical.title) ||
      (canonical.metadata?.verified_identity_names || []).includes(normalize(game.title))) &&
    releaseMarkers(game.title) === releaseMarkers(canonical.title) &&
    String(game.release || "").slice(0, 4) ===
      String(canonical.release_date || "").slice(0, 4) &&
    (game.igdb_id > 0
      ? game.igdb_id === canonical.igdb_id
      : game.steam_appid > 0 &&
        game.steam_appid === canonical.steam_appid &&
        !(canonical.igdb_id > 0))
  );
}
export function buildPlan(games, existingLinks = [], existingCanonical = []) {
  const canonical = [],
    links = [],
    reviews = [],
    versions = [];
  const mapped = new Map(
    existingLinks.map((l) => [Number(l.game_id), l.canonical_game_id]),
  );
  const allCanonical = new Map(existingCanonical.map((c) => [c.id, c]));
  const groups = new Map();
  for (const g of games) {
    const key =
      g.igdb_id > 0
        ? `igdb:${g.igdb_id}`
        : g.steam_appid > 0
          ? `steam:${g.steam_appid}`
          : `copy:${g.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }
  const review = (
    kind,
    source,
    target,
    type,
    confidence,
    reason,
    identifiers,
  ) => {
    if (source === target) return;
    reviews.push({
      candidate_key: `${kind}:${source}:${target}:${type || "identity"}`,
      kind,
      source_game_id: source,
      target_game_id: target,
      proposed_relation: type,
      confidence,
      reason,
      identifiers,
    });
  };
  for (const [key, rows] of groups) {
    // Never merge conflicting titles, edition markers, or release years. Strong IDs can be bad metadata.
    const partitions = new Map();
    for (const g of rows) {
      const part = `${normalize(g.title)}:${String(g.release || "").slice(0, 4)}`;
      if (!partitions.has(part)) partitions.set(part, []);
      partitions.get(part).push(g);
    }
    const representatives = [];
    for (const copies of partitions.values()) {
      copies.sort((a, b) => Number(a.id) - Number(b.id));
      const first = copies[0];
      const existing = [
        ...new Set(copies.map((g) => mapped.get(Number(g.id))).filter(Boolean)),
      ];
      const unmapped = copies.find((g) => !mapped.has(Number(g.id)));
      const compatible = [...allCanonical.values()].filter((c) =>
        canReuseIdentity(first, c),
      );
      let cid =
        !unmapped && existing.length
          ? existing[0]
          : compatible.length === 1
            ? compatible[0].id
            : uuid(`library:${(unmapped || first).id}`);
      if (
        unmapped &&
        allCanonical.has(cid) &&
        !canReuseIdentity(first, allCanonical.get(cid))
      )
        cid = uuid(
          `isolated-release:${unmapped.id}:${normalize(first.title)}:${first.release || ""}`,
        );
      const identityKey = `library:${first.id}`;
      if (!allCanonical.has(cid)) {
        const c = {
          id: cid,
          identity_key: identityKey,
          title: first.title || `Untitled ${first.id}`,
          normalized_title: normalize(first.title),
          igdb_id: first.igdb_id || null,
          steam_appid: first.steam_appid || null,
          release_date: first.release || null,
          metadata: { backfill: "v1", ownership_ids: copies.map((g) => g.id) },
        };
        canonical.push(c);
        allCanonical.set(cid, c);
      }
      const v = versionCandidate(first.title || "");
      const vid = v ? uuid(`version:${cid}`) : null;
      if (v)
        versions.push({
          id: vid,
          canonical_game_id: cid,
          name: v.name,
          version_type: v.type.replace("_of", ""),
        });
      for (const g of copies)
        if (!mapped.has(Number(g.id))) {
          mapped.set(Number(g.id), cid);
          links.push({
            game_id: g.id,
            canonical_game_id: cid,
            version_id: vid,
            match_type: key.startsWith("igdb:")
              ? "igdb_exact"
              : key.startsWith("steam:")
                ? "steam_exact"
                : "import",
            confidence: 1,
          });
        }
      for (const other of existing.slice(1))
        review(
          "identity",
          other,
          cid,
          null,
          0.9,
          "Existing canonical identities share identifiers; manual consolidation required.",
          { key },
        );
      representatives.push({ id: cid, game: first });
    }
    for (const r of representatives.slice(1))
      review(
        "identity",
        r.id,
        representatives[0].id,
        null,
        0.6,
        "Same external identifier with conflicting title, edition, or release year. Keep separate until verified.",
        { key, source: r.game, target: representatives[0].game },
      );
  }
  // Cross-IGDB Steam matches are candidates only; never use Steam to override IGDB conflicts.
  const steamGroups = new Map();
  for (const g of games)
    if (g.steam_appid > 0) {
      const a = steamGroups.get(g.steam_appid) || [];
      a.push(g);
      steamGroups.set(g.steam_appid, a);
    }
  for (const [steam, rows] of steamGroups) {
    const ids = [...new Set(rows.map((g) => mapped.get(Number(g.id))))];
    for (const id of ids.slice(1))
      review(
        "identity",
        id,
        ids[0],
        null,
        0.8,
        "Shared Steam app ID across separately identified games; verify edition and IGDB metadata.",
        { steam_appid: steam, games: rows },
      );
  }
  const byTitle = new Map();
  for (const c of allCanonical.values()) {
    const arr = byTitle.get(c.normalized_title) || [];
    arr.push(c);
    byTitle.set(c.normalized_title, arr);
  }
  for (const c of allCanonical.values()) {
    const v = versionCandidate(c.title);
    if (v)
      for (const base of byTitle.get(v.base) || []) {
        if (c.metadata?.generation_key && base.metadata?.generation_key &&
          c.metadata.generation_key !== base.metadata.generation_key) continue;
        review(
          "relationship",
          c.id,
          base.id,
          v.type,
          0.8,
          "Edition suffix suggests a relationship; title alone cannot verify identity or remake vs edition.",
          { source_igdb_id: c.igdb_id, target_igdb_id: base.igdb_id },
        );
      }
    // Numbers, shared names and franchises never establish a direct sequel.
  }
  for (const [sourceTitle, targetTitle, type] of referenceCandidates) {
    for (const source of byTitle.get(normalize(sourceTitle)) || [])
      for (const target of byTitle.get(normalize(targetTitle)) || [])
        review(
          "relationship",
          source.id,
          target.id,
          type,
          0.9,
          "User-supplied example; verify the canonical endpoints before approving.",
          {
            source_igdb_id: source.igdb_id,
            target_igdb_id: target.igdb_id,
            evidence: "request_example",
          },
        );
  }
  const unique = [
    ...new Map(reviews.map((r) => [r.candidate_key, r])).values(),
  ];
  return {
    canonical,
    links,
    versions,
    reviews: unique,
    snapshots: games.map((g) => ({
      id: g.id,
      metadata: {
        title: g.title,
        igdb_id: g.igdb_id,
        steam_appid: g.steam_appid,
        release: g.release,
        platform: g.platform,
      },
    })),
    report: {
      existing_games: games.length,
      canonical_created: canonical.length,
      entries_linked: links.length,
      canonical_total: new Set(mapped.values()).size,
      duplicate_copies: games.length - new Set(mapped.values()).size,
      relationship_candidates: unique.filter((r) => r.kind === "relationship")
        .length,
      identity_candidates: unique.filter((r) => r.kind === "identity").length,
      automatically_accepted: 0,
      manual_review: unique.length,
    },
  };
}
