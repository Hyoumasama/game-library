// Multi-select filters for the /news page. Options inside one group are ORed
// (Playing or Wishlist); groups are ANDed (Update + Playing + Adult). An
// empty group means "any". Mirrored to the URL as comma-separated params:
// /news?type=update&status=Playing,Wishlist&content=adult
export type NewsFilterGroup = "type" | "status" | "content";

export type NewsFilters = Record<NewsFilterGroup, string[]>;

export const NEWS_FILTER_GROUPS: {
  key: NewsFilterGroup;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "type",
    label: "Type",
    options: [
      { value: "update", label: "New Update" },
      { value: "news", label: "Dev News" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: ["Playing", "Completed", "Unplayed", "Wishlist", "Dropped", "Skipped"].map(
      (status) => ({ value: status, label: status })
    ),
  },
  {
    key: "content",
    label: "Content",
    options: [
      { value: "regular", label: "Regular" },
      { value: "adult", label: "Adult" },
    ],
  },
];

export const EMPTY_NEWS_FILTERS: NewsFilters = { type: [], status: [], content: [] };

export function parseNewsFilters(
  params: Partial<Record<string, string | string[] | undefined>>
): NewsFilters {
  const filters = { ...EMPTY_NEWS_FILTERS };

  for (const group of NEWS_FILTER_GROUPS) {
    const raw = params[group.key];
    const values = (Array.isArray(raw) ? raw.join(",") : raw || "").split(",");
    const allowed = new Set(group.options.map((option) => option.value));
    filters[group.key] = [...new Set(values.filter((value) => allowed.has(value)))];
  }

  return filters;
}

export type NewsFilterable = {
  kind: string;
  gameStatus: string | null;
  isAdult: boolean;
};

function getGroupValue(item: NewsFilterable, group: NewsFilterGroup) {
  if (group === "type") return item.kind;
  if (group === "status") return item.gameStatus || "";
  return item.isAdult ? "adult" : "regular";
}

// `ignoreGroup` lets a chip's count show how many posts it would match given
// the other groups' selections (faceted counts).
export function matchesNewsFilters(
  item: NewsFilterable,
  filters: NewsFilters,
  ignoreGroup?: NewsFilterGroup
) {
  return NEWS_FILTER_GROUPS.every(({ key }) => {
    if (key === ignoreGroup || filters[key].length === 0) return true;
    return filters[key].includes(getGroupValue(item, key));
  });
}

export function countNewsFilterOption(
  items: NewsFilterable[],
  filters: NewsFilters,
  group: NewsFilterGroup,
  value: string
) {
  return items.filter(
    (item) =>
      getGroupValue(item, group) === value &&
      matchesNewsFilters(item, filters, group)
  ).length;
}
