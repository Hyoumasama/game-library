export type Relation = { source_game_id: string; target_game_id: string; relation_type: string };
export type RelatedGame = { id: string; title: string; release_date: string | null; cover_url: string | null; library_game_id: number | null };
export type RelatedEntry = RelatedGame & { key: string; label: string; priority: number };
const labels: Record<string, [string, string, number]> = {
  sequel_of: ["Previous Installment", "Next Installment", 0],
  remaster_of: ["Original Version", "Remastered Version", 2],
  remake_of: ["Original Version", "Remake", 2],
  edition_of: ["Base Game", "Other Edition", 3],
  enhanced_edition_of: ["Base Game", "Enhanced Edition", 3],
  dlc_of: ["Base Game", "DLC", 4],
  expansion_of: ["Base Game", "Expansion", 4],
  standalone_expansion_of: ["Base Game", "Standalone Expansion", 4],
  spinoff_of: ["Related Game", "Spin-off", 5],
  demo_of: ["Full Game", "Demo", 6],
  playtest_of: ["Full Game", "Playtest", 6],
  beta_of: ["Full Game", "Beta", 6],
  collection_contains: ["Included Game", "Included In Collection", 7],
  episode_of: ["Base Game", "Episode", 8],
  reboot_of: ["Original Series", "Reboot", 8],
};
export function buildRelatedEntries(currentId: string, relations: Relation[], games: RelatedGame[]): RelatedEntry[] {
  const byId = new Map(games.map(game => [game.id, game]));
  const entries = new Map<string, RelatedEntry>();
  for (const relation of relations) {
    if (relation.source_game_id !== currentId && relation.target_game_id !== currentId) continue;
    const outgoing = relation.source_game_id === currentId;
    const other = byId.get(outgoing ? relation.target_game_id : relation.source_game_id);
    const display = labels[relation.relation_type];
    if (!other || other.id === currentId || !display) continue;
    const label = display[outgoing ? 0 : 1];
    const priority = relation.relation_type === "sequel_of" ? (outgoing ? 0 : 1) : label === "Base Game" ? 3 : display[2];
    const key = `${other.id}:${label}`;
    entries.set(key, { ...other, key, label, priority });
  }
  return [...entries.values()].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label) || (a.release_date || "9999").localeCompare(b.release_date || "9999") || a.title.localeCompare(b.title));
}
