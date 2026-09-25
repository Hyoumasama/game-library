// Metacritic has no public API. This uses the JSON backend that
// metacritic.com itself calls, so it can change or break without notice -
// every failure path returns null and the admin types the score by hand.

const METACRITIC_BACKEND = "https://backend.metacritic.com";
const GAME_TYPE_ID = 13;
const REQUEST_TIMEOUT_MS = 8000;
// Metacritic parks unreleased games at premiereYear 2097.
const PLACEHOLDER_YEAR = 2097;
const MAX_YEAR_DIFF = 2;

// Demos, playtests, bundles and season passes never have their own critic
// score - matching them would copy the base game's score onto them.
const NON_SCORABLE_PATTERN =
  /\b(demo|playtest|beta|season pass|bundle|soundtrack)\b/i;

export type MetacriticMatchType = "exact" | "close" | "partial" | "steam";

export type MetacriticScoreResult = {
  score: number;
  matchedTitle: string;
  year: number | null;
  url: string | null;
  matchType: MetacriticMatchType;
};

type MetacriticSearchItem = {
  title?: string;
  slug?: string;
  premiereYear?: number | null;
  releaseDate?: string | null;
  criticScoreSummary?: { score?: number | null } | null;
};

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripEditionWords(value: string) {
  return normalizeTitle(value)
    .replace(/\b(the|a)\b/g, " ")
    .replace(
      /\b(tom clancy s|definitive|enhanced|ultimate|collector s|anniversary|remastered|remaster|hd|dx|edition)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function toSearchQuery(title: string) {
  return title
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[♪]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemYear(item: MetacriticSearchItem) {
  const year =
    item.premiereYear || Number((item.releaseDate || "").slice(0, 4)) || null;

  return year && year !== PLACEHOLDER_YEAR ? year : null;
}

function getItemScore(item: MetacriticSearchItem) {
  // 0/null means Metacritic hasn't collected enough reviews for a score.
  const score = item.criticScoreSummary?.score;

  return typeof score === "number" && score > 0 ? score : null;
}

async function searchMetacritic(query: string) {
  const response = await fetch(
    `${METACRITIC_BACKEND}/finder/metacritic/search/${encodeURIComponent(
      query
    )}/web?offset=0&limit=10&mcoTypeId=${GAME_TYPE_ID}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`Metacritic search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: { items?: MetacriticSearchItem[] };
  };

  return data.data?.items || [];
}

function classifyMatch(
  title: string,
  item: MetacriticSearchItem
): Exclude<MetacriticMatchType, "steam"> | null {
  if (!item.title) return null;

  const wanted = normalizeTitle(title);
  const found = normalizeTitle(item.title);

  if (found === wanted) return "exact";

  const wantedStripped = stripEditionWords(title);

  if (wantedStripped && stripEditionWords(item.title) === wantedStripped) {
    return "close";
  }

  // "Cat Quest II" -> "Cat Quest II: The Lupus Empire",
  // "S.T.A.L.K.E.R. 2: Cost of Hope" -> "... Heart of Chornobyl - Cost of Hope".
  if (
    wanted.length >= 5 &&
    (found.startsWith(`${wanted} `) || found.endsWith(` ${wanted}`))
  ) {
    return "partial";
  }

  return null;
}

const MATCH_RANK = { exact: 0, close: 1, partial: 2 } as const;

function pickBestMatch(
  title: string,
  year: number | null,
  items: MetacriticSearchItem[]
) {
  const candidates = items
    .map((item) => {
      const matchType = classifyMatch(title, item);
      const itemYear = getItemYear(item);
      const yearDiff = year && itemYear ? Math.abs(itemYear - year) : null;

      return { item, matchType, itemYear, yearDiff };
    })
    .filter(
      (candidate) =>
        candidate.matchType &&
        getItemScore(candidate.item) !== null &&
        (candidate.yearDiff === null || candidate.yearDiff <= MAX_YEAR_DIFF) &&
        // Loose matches must at least agree on the year.
        (candidate.matchType === "exact" || candidate.yearDiff !== null)
    )
    .sort(
      (a, b) =>
        MATCH_RANK[a.matchType!] - MATCH_RANK[b.matchType!] ||
        (a.yearDiff ?? MAX_YEAR_DIFF + 1) - (b.yearDiff ?? MAX_YEAR_DIFF + 1)
    );

  return candidates[0] || null;
}

async function getSteamMetacriticScore(
  steamAppId: number
): Promise<MetacriticScoreResult | null> {
  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&filters=basic,metacritic`,
    { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as Record<
    string,
    {
      data?: {
        name?: string;
        metacritic?: { score?: number; url?: string };
      };
    }
  >;
  const app = data?.[steamAppId]?.data;
  const score = app?.metacritic?.score;

  if (typeof score !== "number" || score <= 0) return null;

  return {
    score,
    matchedTitle: app?.name || "",
    year: null,
    url: app?.metacritic?.url || null,
    matchType: "steam",
  };
}

export async function findMetacriticScore({
  title,
  year,
  steamAppId,
}: {
  title: string;
  year: number | null;
  steamAppId: number | null;
}): Promise<MetacriticScoreResult | null> {
  const query = toSearchQuery(title);

  if (!query || NON_SCORABLE_PATTERN.test(title)) return null;

  try {
    let match = pickBestMatch(title, year, await searchMetacritic(query));

    // Metacritic search ranks "Splinter Cell" poorly with the prefix.
    const shortQuery = query.replace(/^Tom Clancy's\s*/i, "");

    if (!match && shortQuery !== query) {
      match = pickBestMatch(title, year, await searchMetacritic(shortQuery));
    }

    if (match) {
      return {
        score: getItemScore(match.item)!,
        matchedTitle: match.item.title || title,
        year: match.itemYear,
        url: match.item.slug
          ? `https://www.metacritic.com/game/${match.item.slug}/`
          : null,
        matchType: match.matchType!,
      };
    }
  } catch (error) {
    console.error("Metacritic lookup failed:", error);
  }

  if (!steamAppId) return null;

  try {
    return await getSteamMetacriticScore(steamAppId);
  } catch (error) {
    console.error("Steam Metacritic lookup failed:", error);
    return null;
  }
}
