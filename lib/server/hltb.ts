// HowLongToBeat has no public API. This uses the search endpoint that
// howlongtobeat.com itself calls (a short-lived token from /init, bound to
// the User-Agent that requested it), so it can change or break without
// notice - lookups return null on failure and the admin types times by hand.

import { supabase } from "@/lib/supabase";
import { normalizeTitle, stripEditionWords } from "@/lib/server/titleMatching";

const HLTB_ORIGIN = "https://howlongtobeat.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const REQUEST_TIMEOUT_MS = 8000;
// The site refreshes its token on a 403; refreshing a bit early saves the
// failed request in the common case.
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_YEAR_DIFF = 1;

type SearchMatchType = "exact" | "close" | "partial";
// "link": fetched by HLTB id (a link the admin pasted, or a stored match).
export type HltbMatchType = SearchMatchType | "link";

export type HltbResult = {
  hltbId: number;
  matchedTitle: string;
  year: number | null;
  url: string;
  // Hours, rounded to one decimal; null when HLTB has no submissions.
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
  mainCount: number;
  matchType: HltbMatchType;
};

type HltbSearchItem = {
  game_id?: number;
  game_name?: string;
  game_alias?: string;
  release_world?: number;
  comp_main?: number;
  comp_plus?: number;
  comp_100?: number;
  comp_main_count?: number;
};

export class HltbRateLimitError extends Error {
  constructor() {
    super("HowLongToBeat rate limit reached - try again in a few minutes");
  }
}

let cachedToken: { value: string; fetchedAt: number } | null = null;

function hltbHeaders(extra: Record<string, string> = {}) {
  return {
    "User-Agent": USER_AGENT,
    Referer: `${HLTB_ORIGIN}/`,
    ...extra,
  };
}

async function getToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    cachedToken &&
    Date.now() - cachedToken.fetchedAt < TOKEN_MAX_AGE_MS
  ) {
    return cachedToken.value;
  }

  const response = await fetch(
    `${HLTB_ORIGIN}/api/search/site/init?t=${Date.now()}`,
    {
      headers: hltbHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`HLTB token request failed (${response.status})`);
  }

  const data = (await response.json()) as { token?: string };

  if (!data.token) throw new Error("HLTB token missing from response");

  cachedToken = { value: data.token, fetchedAt: Date.now() };

  return data.token;
}

// Demos, playtests and season passes have no times of their own - matching
// them would copy the full game's times onto them.
const NON_MATCHABLE_PATTERN = /\b(demo|playtest|beta|season pass)\b/i;

// Packaging words store listings add that HLTB titles usually leave out.
const PACKAGING_WORDS =
  /\b(gold|deluxe|complete|premium|special|platinum|champion|celebration|goty|game of the year|redux|ce|collection|bundle only|row|online)\b/g;

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

// Raw-title cleanup shared by the exact and loose keys: HTML entities,
// dotted acronyms ("S.T.A.L.K.E.R." -> "STALKER") and apostrophes
// ("The Dragons Trap" vs "The Dragon's Trap").
function cleanTitle(value: string) {
  return decodeEntities(value)
    .replace(/(?<=\b[A-Za-z])\.(?=[A-Za-z]\b)/g, "")
    .replace(/['’]/g, "");
}

function exactKey(value: string) {
  return normalizeTitle(cleanTitle(value));
}

// "Resident Evil 3 (Remake)", "Metro Exodus - Gold Edition",
// "Horizon Forbidden West + Burning Shores" -> the base title.
function looseKey(value: string) {
  const withoutExtras = cleanTitle(value)
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s\+\s.*$/, " ")
    // "Ni no Kuni II: Revenant Kingdom - The Prince's Edition"
    .replace(/\s[-–:]\s[^-–:]*\b(edition|bundle)\s*$/i, " ");

  return stripEditionWords(withoutExtras)
    .replace(PACKAGING_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchHltb(query: string, retried = false): Promise<HltbSearchItem[]> {
  // HLTB matches plain lowercase words best; "-", "&" or ":" as a search
  // term makes it return nothing.
  // "and" is how normalizeTitle spells "&", which HLTB titles keep as "&".
  const terms = query.split(" ").filter((term) => term && term !== "and");

  if (terms.length === 0) return [];

  const token = await getToken(retried);
  const response = await fetch(`${HLTB_ORIGIN}/api/search/site`, {
    method: "POST",
    headers: hltbHeaders({
      "Content-Type": "application/json",
      "x-auth-token": token,
    }),
    body: JSON.stringify({
      searchType: "games",
      searchTerms: terms,
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: 0, max: 0 },
          gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          rangeYear: { min: "", max: "" },
          modifier: "",
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0,
      },
      useCache: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 403 && !retried) return searchHltb(query, true);
  if (response.status === 429) throw new HltbRateLimitError();

  if (!response.ok) {
    throw new Error(`HLTB search failed (${response.status})`);
  }

  const data = (await response.json()) as { data?: HltbSearchItem[] };

  return data.data || [];
}

function toHours(seconds: number | undefined) {
  return seconds && seconds > 0 ? Math.round((seconds / 3600) * 10) / 10 : null;
}

function getItemNames(item: HltbSearchItem) {
  const aliases = (item.game_alias || "")
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);

  return [item.game_name || "", ...aliases].filter(Boolean);
}

// "Monument Valley II" vs "Monument Valley 2". Only multi-letter numerals:
// a lone "X" or "V" is as often a name ("Mega Man X") as a number.
const ROMAN_NUMERALS: Record<string, string> = {
  ii: "2",
  iii: "3",
  iv: "4",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
};
const ARABIC_NUMERALS = Object.fromEntries(
  Object.entries(ROMAN_NUMERALS).map(([roman, digit]) => [digit, roman])
);

function toArabicNumerals(key: string) {
  return key.replace(/\b(ii|iii|iv|vi|vii|viii|ix)\b/g, (roman) => ROMAN_NUMERALS[roman]);
}

function toRomanNumerals(key: string) {
  return key.replace(/\b[2-46-9]\b/g, (digit) => ARABIC_NUMERALS[digit]);
}

function classifyName(title: string, name: string): SearchMatchType | null {
  const wanted = toArabicNumerals(exactKey(title));

  if (!wanted) return null;
  if (toArabicNumerals(exactKey(name)) === wanted) return "exact";

  const wantedLoose = toArabicNumerals(looseKey(title));
  const foundLoose = toArabicNumerals(looseKey(name));

  if (!wantedLoose || !foundLoose) return null;
  if (foundLoose === wantedLoose) return "close";

  if (
    wantedLoose.length >= 5 &&
    (foundLoose.startsWith(`${wantedLoose} `) ||
      wantedLoose.startsWith(`${foundLoose} `))
  ) {
    return "partial";
  }

  return null;
}

const MATCH_RANK = { exact: 0, close: 1, partial: 2 } as const;

function pickBestMatch(title: string, year: number | null, items: HltbSearchItem[]) {
  const candidates = items
    .map((item) => {
      const matchTypes = getItemNames(item)
        .map((name) => classifyName(title, name))
        .filter((type): type is SearchMatchType => type !== null)
        .sort((a, b) => MATCH_RANK[a] - MATCH_RANK[b]);
      const itemYear = item.release_world || null;
      const yearDiff = year && itemYear ? Math.abs(itemYear - year) : null;

      return { item, matchType: matchTypes[0] ?? null, itemYear, yearDiff };
    })
    .filter(
      (candidate) =>
        candidate.item.game_id &&
        candidate.matchType &&
        // The library's release date is often a port, remaster or early
        // access date years away from HLTB's (Chrono Trigger: 2018 on
        // Steam, 1995 on HLTB), so the year only breaks ties for exact and
        // close matches. Loose prefix matches must still agree on it.
        (candidate.matchType !== "partial" ||
          (candidate.yearDiff !== null && candidate.yearDiff <= MAX_YEAR_DIFF))
    )
    .sort(
      (a, b) =>
        MATCH_RANK[a.matchType!] - MATCH_RANK[b.matchType!] ||
        // Same-title remakes ("Tomb Raider" 1996 vs 2013): nearest year wins.
        (a.yearDiff ?? Infinity) - (b.yearDiff ?? Infinity) ||
        (b.item.comp_main_count || 0) - (a.item.comp_main_count || 0)
    );

  return candidates[0] || null;
}

// Throws on network/HLTB errors (HltbRateLimitError included) so batch jobs
// can tell "not on HLTB" apart from "lookup failed".
async function lookupHltb({
  title,
  year,
}: {
  title: string;
  year: number | null;
}): Promise<HltbResult | null> {
  if (NON_MATCHABLE_PATTERN.test(title)) return null;

  // HLTB's search sometimes needs the apostrophe as a word break ("luigi s
  // mansion") and sometimes dropped ("dragons trap"), so try both spellings
  // before the loose title, then the loose title with its numbering
  // spelled the other way.
  const queries = [
    ...new Set([
      normalizeTitle(decodeEntities(title)),
      exactKey(title),
      looseKey(title),
      toArabicNumerals(looseKey(title)),
      toRomanNumerals(looseKey(title)),
    ]),
  ].filter(Boolean);
  let match = null;

  for (const query of queries) {
    match = pickBestMatch(title, year, await searchHltb(query));
    if (match) break;
  }

  if (!match) return null;

  return toResult(match.item, match.matchType!, match.itemYear);
}

function toResult(
  item: HltbSearchItem,
  matchType: HltbMatchType,
  year: number | null
): HltbResult {
  return {
    hltbId: item.game_id!,
    matchedTitle: item.game_name || "",
    year,
    url: `${HLTB_ORIGIN}/game/${item.game_id}`,
    main: toHours(item.comp_main),
    mainExtra: toHours(item.comp_plus),
    completionist: toHours(item.comp_100),
    mainCount: item.comp_main_count || 0,
    matchType,
  };
}

// Accepts "https://howlongtobeat.com/game/12345" or just "12345".
export function parseHltbId(input: string) {
  const match = input.trim().match(/^(?:(?:https?:\/\/)?(?:www\.)?howlongtobeat\.com\/game\/)?(\d+)\/?(?:[?#].*)?$/i);
  const id = match ? Number(match[1]) : NaN;

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Reads the game straight from its HLTB page (the data the page is rendered
// from), so no title matching is involved. Returns null when HLTB has no
// such game; throws on other failures.
export async function getHltbTimesById(hltbId: number): Promise<HltbResult | null> {
  const response = await fetch(`${HLTB_ORIGIN}/game/${hltbId}`, {
    headers: hltbHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (response.status === 429) throw new HltbRateLimitError();

  if (!response.ok) {
    throw new Error(`HLTB game page failed (${response.status})`);
  }

  const html = await response.text();
  const json = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  )?.[1];

  if (!json) throw new Error("HLTB game page has no game data");

  const data = JSON.parse(json) as {
    props?: {
      pageProps?: {
        game?: {
          data?: {
            game?: (Omit<HltbSearchItem, "release_world"> & {
              release_world?: string;
            })[];
          };
        };
      };
    };
  };
  const game = data.props?.pageProps?.game?.data?.game?.[0];

  if (!game?.game_id) return null;

  // The page gives "1997-10-00"; the search API gives just the year.
  const year = Number(String(game.release_world || "").slice(0, 4)) || null;

  return toResult({ ...game, release_world: year ?? undefined }, "link", year);
}

// For the admin form: rate limits are rethrown (the route reports them),
// other failures are logged and return null.
export async function findHltbTimes(input: {
  title: string;
  year: number | null;
}): Promise<HltbResult | null> {
  try {
    return await lookupHltb(input);
  } catch (error) {
    if (error instanceof HltbRateLimitError) throw error;

    console.error("HLTB lookup failed:", error);
    return null;
  }
}

export type HltbGameRow = {
  id: number | string;
  title: string | null;
  release: string | null;
  hltb_id: number | null;
};

// Columns the refresh jobs need to pick and look up a game.
export const HLTB_GAME_ROW_COLUMNS = "id, title, release, hltb_id";

function getYear(release: string | null) {
  const year = Number(String(release || "").slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

// Looks one game up and stores the result. A game already tied to an HLTB
// id (matched before, or linked by the admin) is read from that page, so a
// corrected match stays corrected. A miss only stamps hltb_checked_at, so
// it never wipes stored times; a failed lookup throws and stamps nothing,
// so the game is tried again next time.
export async function refreshGameHltb(game: HltbGameRow) {
  const title = (game.title || "").trim();
  const result = game.hltb_id
    ? await getHltbTimesById(game.hltb_id)
    : title
      ? await lookupHltb({ title, year: getYear(game.release) })
      : null;
  const checkedAt = new Date().toISOString();

  const { error } = await supabase
    .from("games")
    .update(
      result
        ? {
            hltb_id: result.hltbId,
            hltb_main: result.main,
            hltb_main_extra: result.mainExtra,
            hltb_completionist: result.completionist,
            hltb_main_count: result.mainCount,
            hltb_checked_at: checkedAt,
          }
        : { hltb_checked_at: checkedAt }
    )
    .eq("id", game.id)
    // Never overwrite times the admin set by hand.
    .eq("hltb_locked", false);

  if (error) throw new Error(error.message);

  return result;
}

export function waitBetweenHltbRequests(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
