import {
  labels,
  type MembershipRole,
  type RelationshipDetail,
  type RelatedGame,
  type RelationType,
} from "@/lib/relationships/model";
export const sectionTitles = {
  versions: "Versions & Editions",
  installments: "Sequels & Prequels",
  expansions: "DLC & Expansions",
  previews: "Demos & Previews",
  related: "Related Games",
} as const;
export type SectionKey = keyof typeof sectionTitles;
export type RelationshipCard = { game: RelatedGame; labels: string[] };
const versions: Partial<Record<RelationType, [string, string]>> = {
  edition_of: ["Edition of", "Other edition"],
  enhanced_edition_of: ["Enhanced edition of", "Enhanced edition"],
  remake_of: ["Remake of", "Remake"],
  remaster_of: ["Remaster of", "Remastered version"],
};
export function displayRelationship(type: RelationType, outgoing: boolean) {
  if (type === "sequel_of")
    return outgoing ? "Previous installment" : "Next installment";
  if (type === "prequel_of")
    return outgoing ? "Next installment" : "Previous installment";
  return (versions[type] || labels[type])[outgoing ? 0 : 1];
}
function section(type: RelationType): SectionKey {
  if (versions[type]) return "versions";
  if (type === "sequel_of" || type === "prequel_of") return "installments";
  if (
    [
      "dlc_of",
      "expansion_of",
      "standalone_expansion_of",
      "episode_of",
    ].includes(type)
  )
    return "expansions";
  if (["demo_of", "playtest_of", "beta_of"].includes(type))
    return "previews";
  return "related"; // Includes collections; never drop supported relationships.
}
export function groupRelationships(detail: RelationshipDetail) {
  const groups: Record<SectionKey, RelationshipCard[]> = {
    versions: [],
    installments: [],
    expansions: [],
    previews: [],
    related: [],
  };
  const cards = new Map<string, RelationshipCard>();
  const order = Object.keys(sectionTitles) as SectionKey[];
  const sorted = [...detail.relationships].sort(
    (a, b) =>
      order.indexOf(section(a.relation_type)) -
        order.indexOf(section(b.relation_type)) || a.id.localeCompare(b.id),
  );
  for (const r of sorted) {
    if (!r.other || r.other.id === detail.canonical.id) continue;
    const label = displayRelationship(
      r.relation_type,
      r.source_game_id === detail.canonical.id,
    );
    const existing = cards.get(r.other.id);
    if (existing) {
      if (!existing.labels.includes(label)) existing.labels.push(label);
      continue;
    }
    const card = { game: r.other, labels: [label] };
    cards.set(r.other.id, card);
    groups[section(r.relation_type)].push(card);
  }
  for (const group of Object.values(groups))
    group.sort(
      (a, b) =>
        (a.game.release_date || "9999").localeCompare(
          b.game.release_date || "9999",
        ) ||
        a.game.title.localeCompare(b.game.title, "en") ||
        a.game.id.localeCompare(b.game.id),
    );
  return groups;
}
export const membershipPriority = (role?: MembershipRole) =>
  ({ primary: 0, unspecified: 1, hierarchy: 2, crossover: 3, appearance: 4 })[
    role || "unspecified"
  ];
export function sortMemberships<
  T extends {
    id: string;
    name: string;
    membership_role?: MembershipRole;
    sort_order?: number | null;
  },
>(items: T[]) {
  return [...new Map(items.map((x) => [x.id, x])).values()].sort(
    (a, b) =>
      membershipPriority(a.membership_role) -
        membershipPriority(b.membership_role) ||
      (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
      a.name.localeCompare(b.name, "en") ||
      a.id.localeCompare(b.id),
  );
}
export const gameDestination = (game: RelatedGame) =>
  game.library_game_id
    ? `/game/${game.library_game_id}`
    : `/canonical/${game.id}`;
