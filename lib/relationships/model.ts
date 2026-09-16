export const relationTypes = [
  "sequel_of",
  "prequel_of",
  "spinoff_of",
  "dlc_of",
  "expansion_of",
  "standalone_expansion_of",
  "remake_of",
  "remaster_of",
  "edition_of",
  "enhanced_edition_of",
  "collection_contains",
  "episode_of",
  "reboot_of",
  "successor_to",
  "related_to",
] as const;
export type RelationType = (typeof relationTypes)[number];
export type CanonicalGame = {
  id: string;
  identity_key: string | null;
  title: string;
  normalized_title: string;
  igdb_id: number | null;
  steam_appid: number | null;
  release_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
export type GameVersion = {
  id: string;
  canonical_game_id: string;
  name: string;
  version_type: "edition" | "enhanced_edition" | "remake" | "remaster";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
export type IdentityLink = {
  game_id: number;
  canonical_game_id: string;
  version_id: string | null;
  match_type: "igdb_exact" | "steam_exact" | "manual" | "heuristic" | "import";
  confidence: number;
  created_at: string;
  updated_at: string;
};
export type Relationship = {
  id: string;
  source_game_id: string;
  target_game_id: string;
  relation_type: RelationType;
  confidence: number;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type Franchise = {
  id: string;
  name: string;
  slug: string;
  igdb_franchise_id: number | null;
  created_at: string;
  updated_at: string;
};
export type Series = {
  id: string;
  franchise_id: string | null;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};
export type SeriesMembership = {
  canonical_game_id: string;
  series_id: string;
  sort_order: number | null;
  created_at: string;
};
export type FranchiseMembership = {
  canonical_game_id: string;
  franchise_id: string;
  created_at: string;
};
export type Review = {
  id: string;
  candidate_key: string;
  kind: "identity" | "relationship";
  source_game_id: string;
  target_game_id: string;
  proposed_relation: RelationType | null;
  confidence: number;
  reason: string;
  identifiers: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  decision_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};
export type OwnedCopy = {
  id: number;
  title: string;
  store: string | null;
  platform: string | null;
  status: string | null;
};
export type RelationshipDetail = {
  canonical: CanonicalGame;
  version: GameVersion | null;
  copies: OwnedCopy[];
  series: Series[];
  franchises: Franchise[];
  relationships: (Relationship & { other: CanonicalGame })[];
};
// Source is the derived title; target is the original. Incoming labels require no reverse DB rows.
export const labels: Record<RelationType, [string, string]> = {
  sequel_of: ["Sequel to", "Sequel"],
  prequel_of: ["Prequel to", "Prequel"],
  spinoff_of: ["Spin-off of", "Spin-off"],
  dlc_of: ["DLC for", "DLC"],
  expansion_of: ["Expansion for", "Expansion"],
  standalone_expansion_of: ["Standalone expansion for", "Standalone expansion"],
  remake_of: ["Remake of", "Remake"],
  remaster_of: ["Remaster of", "Remaster"],
  edition_of: ["Edition of", "Edition"],
  enhanced_edition_of: ["Enhanced edition of", "Enhanced edition"],
  collection_contains: ["Contains", "Included in collection"],
  episode_of: ["Episode of", "Episode"],
  reboot_of: ["Reboot of", "Reboot"],
  successor_to: ["Successor to", "Successor"],
  related_to: ["Related to", "Related to"],
};
export function relationshipLabel(
  r: Pick<Relationship, "source_game_id" | "relation_type">,
  currentId: string,
) {
  return labels[r.relation_type][r.source_game_id === currentId ? 0 : 1];
}
export function normalizeTitle(title: string) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type BackfillRun = {
  id: string;
  report: Record<string, number>;
  created_at: string;
};
