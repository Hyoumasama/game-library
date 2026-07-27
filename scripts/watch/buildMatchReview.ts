import { config as loadEnv } from "dotenv";
import { parse } from "csv-parse/sync";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { matchWatchTitle } from "@/lib/server/watch/matchWatchTitle";
import type {
  WatchLocalType,
  WatchMatchCandidate,
  WatchMatchInput,
  WatchMatchPreview,
  WatchReviewSuggestion,
} from "@/lib/server/watch/types";
import { WatchSourceError } from "@/lib/server/watch/types";

loadEnv({ path: ".env.local", quiet: true });

type LocalWatchRow = {
  title: string;
  type?: WatchLocalType;
  seasons?: number;
  episodes?: number;
  extra: number;
  nced: number;
  ncop: number;
  special: number;
};

type CacheEntry = {
  input: WatchMatchInput;
  preview?: WatchMatchPreview;
  sourceErrors?: string[];
  completedAt: string;
};

type CacheFile = {
  version: 1;
  entries: Record<string, CacheEntry>;
};

type ReviewDecision = WatchReviewSuggestion & {
  status: "Ready" | "Needs Review" | "No Match";
  notes: string[];
};

const inputPath = resolve("data/watch-import/watch_library_summary.csv");
const cachePath = resolve("data/watch-import/watch-match-cache.json");
const reviewCsvPath = resolve("data/watch-import/watch_match_review.csv");
const reviewJsonPath = resolve("data/watch-import/watch_match_review.json");
const defaultDelayMs = 2200;
const maxRetries = 3;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const delayArg = args.find((arg) => arg.startsWith("--delay="));

  return {
    limit: limitArg ? parsePositiveInteger(limitArg.split("=")[1]) : undefined,
    delayMs: Math.max(
      defaultDelayMs,
      delayArg ? parsePositiveInteger(delayArg.split("=")[1]) || defaultDelayMs : defaultDelayMs
    ),
    refresh: args.includes("--refresh"),
  };
}

function parsePositiveInteger(value?: string) {
  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeLocalType(value: string): WatchLocalType | undefined {
  const clean = value.trim();

  if (clean === "Series" || clean === "Movie" || clean === "OVA") {
    return clean;
  }

  return undefined;
}

function toCount(value: unknown) {
  const text = String(value ?? "").trim();
  const parsed = Number(text || 0);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function buildKey(row: LocalWatchRow) {
  return [
    row.title.trim().toLowerCase().replace(/\s+/g, " "),
    row.type || "",
    row.seasons || "",
    row.episodes || "",
  ].join("|");
}

function buildInput(row: LocalWatchRow): WatchMatchInput {
  return {
    title: row.title,
    localType: row.type,
    localSeasons: row.seasons,
    localEpisodes: row.episodes,
  };
}

async function readRows() {
  const content = await readFile(inputPath, "utf8");
  const records = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records
    .map((record) => ({
      title: String(record.Title || "").trim(),
      type: normalizeLocalType(String(record.Type || "")),
      seasons: parsePositiveInteger(String(record.Seasons || "")),
      episodes: parsePositiveInteger(String(record.Episodes || "")),
      extra: toCount(record.Extra),
      nced: toCount(record.NCED),
      ncop: toCount(record.NCOP),
      special: toCount(record.Special),
    }))
    .filter((row) => row.title);
}

async function readCache(): Promise<CacheFile> {
  try {
    const content = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(content) as CacheFile;

    return parsed.version === 1 && parsed.entries
      ? parsed
      : { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

async function writeCache(cache: CacheFile) {
  const tempPath = `${cachePath}.tmp`;

  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  await rename(tempPath, cachePath);
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function getRetryAfterMs(error: WatchSourceError, fallbackMs: number) {
  const retryAfter = error.retryAfter?.trim();

  if (!retryAfter) return fallbackMs;
  if (/^\d+$/.test(retryAfter)) return Number(retryAfter) * 1000;

  const retryAt = Date.parse(retryAfter);

  return Number.isFinite(retryAt)
    ? Math.max(fallbackMs, retryAt - Date.now())
    : fallbackMs;
}

async function matchWithRetry(input: WatchMatchInput, delayMs: number) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await matchWatchTitle(input);
    } catch (error) {
      if (
        error instanceof WatchSourceError &&
        error.status === 429 &&
        attempt < maxRetries
      ) {
        const waitMs = getRetryAfterMs(error, delayMs * attempt);

        console.warn(
          `Rate limited by ${error.source}; waiting ${Math.ceil(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}.`
        );
        await sleep(waitMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unreachable retry state");
}

function isSeriesLike(format: string | null | undefined) {
  return ["tv", "series", "tv_short", "ona"].includes(
    format?.toLowerCase() || ""
  );
}

function isTypeCompatible(row: LocalWatchRow, candidate?: WatchMatchCandidate) {
  if (!candidate || !row.type) return false;

  const format = candidate.format?.toLowerCase() || "";

  if (row.type === "Movie") {
    return candidate.type === "movie" || format === "movie";
  }

  if (row.type === "Series") {
    return candidate.type === "tv" || isSeriesLike(format);
  }

  return ["ova", "special"].includes(format);
}

function isEpisodeCompatible(row: LocalWatchRow, candidate?: WatchMatchCandidate) {
  if (!candidate?.episodeCount || !row.episodes) return true;

  return Math.abs(candidate.episodeCount - row.episodes) <= 2;
}

function hasSignificantEpisodeDifference(
  row: LocalWatchRow,
  candidate?: WatchMatchCandidate
) {
  if (!candidate?.episodeCount || !row.episodes) return false;

  return Math.abs(candidate.episodeCount - row.episodes) > 2;
}

function hasCloseCandidates(candidates: WatchMatchCandidate[]) {
  if (candidates.length < 2) return false;

  return candidates[0].confidence - candidates[1].confidence <= 5
    && candidates[1].confidence >= 90;
}

function bestCandidate(candidates: WatchMatchCandidate[] = []) {
  return [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitleFamily(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\b(part|cour)\s*(\d+|ii|iii|iv)\b/gi, "")
    .replace(/\b(\d+|ii|iii|iv)(st|nd|rd|th)?\s+season\b/gi, "")
    .replace(/\b(final|second|third)\s+part\b/gi, "")
    .replace(/\bseason\s*(\d+|ii|iii|iv)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateTitles(candidate?: WatchMatchCandidate) {
  if (!candidate) return [];

  return [
    candidate.displayTitle,
    candidate.originalTitle,
    candidate.englishTitle,
    candidate.nativeTitle,
    ...candidate.alternativeTitles,
  ].filter((title): title is string => Boolean(title));
}

function titleFamilies(candidate?: WatchMatchCandidate) {
  return new Set(
    candidateTitles(candidate)
      .map(normalizeTitleFamily)
      .filter(Boolean)
  );
}

function sharesTitleFamily(
  first?: WatchMatchCandidate,
  second?: WatchMatchCandidate
) {
  const firstFamilies = titleFamilies(first);
  const secondFamilies = titleFamilies(second);

  for (const family of firstFamilies) {
    if (secondFamilies.has(family)) return true;
  }

  return false;
}

function rowSharesTitleFamily(row: LocalWatchRow, candidate?: WatchMatchCandidate) {
  const rowFamily = normalizeTitleFamily(row.title);

  if (!rowFamily || !candidate) return false;

  for (const family of titleFamilies(candidate)) {
    if (
      family === rowFamily
      || family.includes(rowFamily)
      || rowFamily.includes(family)
    ) {
      return true;
    }
  }

  return false;
}

function hasContinuationWording(candidate: WatchMatchCandidate) {
  return candidateTitles(candidate).some((title) =>
    /\b(part|cour)\s*(2|3|ii|iii)\b/i.test(title)
    || /\b(2nd|3rd|second|third)\s+season\b/i.test(title)
    || /\bfinal\s+part\b/i.test(title)
  );
}

function combinations<T>(items: T[], maxSize: number) {
  const output: T[][] = [];

  function walk(start: number, selected: T[]) {
    if (selected.length > 1) output.push([...selected]);
    if (selected.length === maxSize) return;

    for (let index = start; index < items.length; index += 1) {
      selected.push(items[index]);
      walk(index + 1, selected);
      selected.pop();
    }
  }

  walk(0, []);

  return output;
}

function findAniListSplit(
  row: LocalWatchRow,
  candidates: WatchMatchCandidate[]
) {
  if (!row.episodes || !row.type || !["Series", "OVA"].includes(row.type)) {
    return null;
  }

  const usable = candidates
    .slice(0, 5)
    .filter((candidate) =>
      candidate.episodeCount
      && isTypeCompatible(row, candidate)
      && (candidate.confidence >= 50 || rowSharesTitleFamily(row, candidate))
    );

  const validCombinations = combinations(usable, 3)
    .filter((group) =>
      group.every((candidate) => candidate.episodeCount)
      && group.reduce((sum, candidate) => sum + (candidate.episodeCount || 0), 0) === row.episodes
    )
    .filter((group) => {
      const years = group
        .map((candidate) => candidate.releaseYear)
        .filter((year): year is number => Boolean(year));

      if (years.length > 1 && Math.max(...years) - Math.min(...years) > 2) {
        return false;
      }

      return group.every((candidate) =>
        rowSharesTitleFamily(row, candidate)
        || sharesTitleFamily(group[0], candidate)
        || candidate.confidence >= 70
      );
    })
    .map((group) => ({
      group,
      continuationCount: group.filter(hasContinuationWording).length,
      totalConfidence: group.reduce((sum, candidate) => sum + candidate.confidence, 0),
    }))
    .filter((match) => match.continuationCount > 0 || match.group.length === 2)
    .sort((a, b) =>
      b.continuationCount - a.continuationCount
      || b.totalConfidence - a.totalConfidence
    );

  const best = validCombinations[0];

  if (!best) return null;

  return {
    candidates: best.group,
    ids: best.group.map((candidate) => candidate.sourceId),
    reasons: [
      "AniList split-part combination matches local episode total.",
      "Source title family agrees.",
    ],
  };
}

function normalizedTitleSet(candidate?: WatchMatchCandidate) {
  return new Set(candidateTitles(candidate).map(normalizeText).filter(Boolean));
}

function candidatesShareAnyTitle(
  first?: WatchMatchCandidate,
  second?: WatchMatchCandidate
) {
  const firstTitles = normalizedTitleSet(first);
  const secondTitles = normalizedTitleSet(second);

  for (const title of firstTitles) {
    if (secondTitles.has(title)) return true;
  }

  return false;
}

function isTmdbCorroborated(
  row: LocalWatchRow,
  tmdb: WatchMatchCandidate | undefined,
  anilist: WatchMatchCandidate | undefined,
  splitIds: number[]
) {
  if (!tmdb || !isTypeCompatible(row, tmdb)) {
    return { corroborated: false, reasons: [] as string[] };
  }

  const reasons: string[] = [];

  if (tmdb.episodeCount && row.episodes && tmdb.episodeCount === row.episodes) {
    reasons.push("TMDB complete-series episode count matches.");
  }

  if (
    tmdb.releaseYear
    && anilist?.releaseYear
    && Math.abs(tmdb.releaseYear - anilist.releaseYear) <= 1
  ) {
    reasons.push("Release year agrees across sources.");
  }

  if (candidatesShareAnyTitle(tmdb, anilist)) {
    reasons.push("TMDB corroborated by AniList native or alternative title.");
  }

  if (splitIds.length > 1 && tmdb.episodeCount === row.episodes) {
    reasons.push("TMDB complete-series result aligns with AniList split parts.");
  }

  return {
    corroborated: reasons.length >= 3 || (tmdb.confidence >= 80 && reasons.length >= 2),
    reasons,
  };
}

function decideReview(
  row: LocalWatchRow,
  preview?: WatchMatchPreview,
  sourceErrors: string[] = []
): ReviewDecision {
  const tmdbCandidates = preview?.tmdbCandidates || [];
  const anilistCandidates = preview?.anilistCandidates || [];
  const bestTmdb = bestCandidate(tmdbCandidates);
  const bestAniList = bestCandidate(anilistCandidates);
  const split = findAniListSplit(row, anilistCandidates);
  const splitIds = split?.ids || [];
  const notes: string[] = [...sourceErrors];

  if (!bestTmdb && !bestAniList) {
    return {
      status: "No Match",
      suggestedTmdbId: null,
      suggestedAniListId: null,
      suggestedAniListIds: [],
      notes: notes.length ? notes : ["No usable source result was found."],
    };
  }

  if (hasCloseCandidates(tmdbCandidates)) notes.push("Multiple TMDB candidates are close.");
  if (hasCloseCandidates(anilistCandidates)) notes.push("Multiple AniList candidates are close.");
  if (hasSignificantEpisodeDifference(row, bestTmdb)) notes.push("TMDB episode count differs significantly.");
  if (!split && hasSignificantEpisodeDifference(row, bestAniList)) {
    notes.push("AniList episode count differs significantly.");
  }
  if (split) {
    notes.push("AniList splits this work into multiple parts.");
    notes.push(...split.reasons);
  }

  const strongTmdb =
    bestTmdb
    && bestTmdb.confidence >= 95
    && isTypeCompatible(row, bestTmdb)
    && isEpisodeCompatible(row, bestTmdb);
  const strongAniList =
    bestAniList
    && bestAniList.confidence >= 95
    && isTypeCompatible(row, bestAniList)
    && isEpisodeCompatible(row, bestAniList);
  const corroboratedTmdb = isTmdbCorroborated(
    row,
    bestTmdb,
    bestAniList,
    splitIds
  );
  const suggestedTmdbId =
    strongTmdb || corroboratedTmdb.corroborated
      ? bestTmdb?.sourceId || null
      : null;
  const suggestedAniListIds = splitIds.length
    ? splitIds
    : strongAniList
    ? [bestAniList.sourceId]
    : [];

  if (corroboratedTmdb.corroborated) {
    notes.push(...corroboratedTmdb.reasons);
  }

  if (bestTmdb && bestAniList && strongTmdb && strongAniList) {
    if (
      bestTmdb.releaseYear
      && bestAniList.releaseYear
      && Math.abs(bestTmdb.releaseYear - bestAniList.releaseYear) > 1
    ) {
      notes.push("TMDB and AniList release years disagree.");
    }

    if (
      bestTmdb.episodeCount
      && bestAniList.episodeCount
      && Math.abs(bestTmdb.episodeCount - bestAniList.episodeCount) > 2
    ) {
      notes.push("TMDB and AniList episode counts disagree.");
    }
  }

  const hasStrongDisagreement = notes.some((note) =>
    note.includes("disagree")
    || note.includes("differs significantly")
    || note.includes("Multiple")
  );

  if (row.type === "Movie") {
    const ready = strongTmdb && bestTmdb?.type === "movie" && !hasStrongDisagreement;

    return {
      status: ready ? "Ready" : "Needs Review",
      suggestedTmdbId,
      suggestedAniListId: suggestedAniListIds[0] || null,
      suggestedAniListIds,
      notes: notes.length ? notes : [ready ? "Strong TMDB movie match." : "Movie requires a strong TMDB movie match."],
    };
  }

  const hasAniListSuggestion = suggestedAniListIds.length > 0;
  const ready = Boolean(
    hasAniListSuggestion
    && !hasStrongDisagreement
    && (suggestedTmdbId || split || strongAniList)
  );

  if (!bestTmdb) {
    notes.push("Missing TMDB candidate; later episode-name import will need TMDB review.");
  } else if (!suggestedTmdbId) {
    notes.push("TMDB candidate is not strong enough for automatic suggestion.");
  }

  return {
    status: ready ? "Ready" : "Needs Review",
    suggestedTmdbId,
    suggestedAniListId: suggestedAniListIds[0] || null,
    suggestedAniListIds,
    notes: notes.length
      ? notes
      : ["Strong AniList match."],
  };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function joinReasons(candidate?: WatchMatchCandidate) {
  return candidate?.confidenceReasons.join("; ") || "";
}

function topFive(candidates: WatchMatchCandidate[] = []) {
  return candidates.slice(0, 5);
}

function reviewCsvRows(
  rows: LocalWatchRow[],
  cache: CacheFile
) {
  const headers = [
    "Local Title",
    "Local Type",
    "Local Seasons",
    "Local Episodes",
    "Local Extra",
    "Local NCED",
    "Local NCOP",
    "Local Special",
    "TMDB ID",
    "TMDB Type",
    "TMDB Title",
    "TMDB Original Title",
    "TMDB Release Year",
    "TMDB Episodes",
    "TMDB Score",
    "TMDB Confidence",
    "TMDB Confidence Reasons",
    "TMDB Poster URL",
    "AniList ID",
    "MAL ID",
    "AniList Title",
    "AniList English Title",
    "AniList Native Title",
    "AniList Format",
    "AniList Release Year",
    "AniList Episodes",
    "AniList Score",
    "AniList Confidence",
    "AniList Confidence Reasons",
    "AniList Poster URL",
    "Suggested TMDB ID",
    "Suggested AniList IDs",
    "Match Status",
    "Review Notes",
  ];
  const lines = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    const entry = cache.entries[buildKey(row)];
    const bestTmdb = bestCandidate(entry?.preview?.tmdbCandidates || []);
    const bestAniList = bestCandidate(entry?.preview?.anilistCandidates || []);
    const decision = decideReview(row, entry?.preview, entry?.sourceErrors);

    lines.push([
      row.title,
      row.type || "",
      row.seasons || "",
      row.episodes || "",
      row.extra,
      row.nced,
      row.ncop,
      row.special,
      bestTmdb?.sourceId,
      bestTmdb?.tmdbType || bestTmdb?.type,
      bestTmdb?.displayTitle,
      bestTmdb?.originalTitle,
      bestTmdb?.releaseYear,
      bestTmdb?.episodeCount,
      bestTmdb?.score,
      bestTmdb?.confidence,
      joinReasons(bestTmdb),
      bestTmdb?.posterUrl,
      bestAniList?.sourceId,
      bestAniList?.malId,
      bestAniList?.displayTitle,
      bestAniList?.englishTitle,
      bestAniList?.nativeTitle,
      bestAniList?.format,
      bestAniList?.releaseYear,
      bestAniList?.episodeCount,
      bestAniList?.score,
      bestAniList?.confidence,
      joinReasons(bestAniList),
      bestAniList?.posterUrl,
      decision.suggestedTmdbId,
      decision.suggestedAniListIds.join("|"),
      decision.status,
      decision.notes.join(" "),
    ].map(csvCell).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function reviewJsonRows(rows: LocalWatchRow[], cache: CacheFile) {
  return rows.map((row) => {
    const entry = cache.entries[buildKey(row)];
    const decision = decideReview(row, entry?.preview, entry?.sourceErrors);

    return {
      local: row,
      tmdbCandidates: topFive(entry?.preview?.tmdbCandidates),
      anilistCandidates: topFive(entry?.preview?.anilistCandidates),
      sourceErrors: entry?.sourceErrors || [],
      suggestedTmdbId: decision.suggestedTmdbId,
      suggestedAniListId: decision.suggestedAniListId,
      suggestedAniListIds: decision.suggestedAniListIds,
      matchStatus: decision.status,
      reviewNotes: decision.notes,
    };
  });
}

async function writeReviewOutputs(rows: LocalWatchRow[], cache: CacheFile) {
  await mkdir(dirname(reviewCsvPath), { recursive: true });
  await writeFile(reviewCsvPath, reviewCsvRows(rows, cache), "utf8");
  await writeFile(
    reviewJsonPath,
    `${JSON.stringify(reviewJsonRows(rows, cache), null, 2)}\n`,
    "utf8"
  );
}

function formatSourceError(error: unknown) {
  if (error instanceof WatchSourceError) {
    return `${error.source} failed with status ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown source failure";
}

async function main() {
  const args = parseArgs();
  const allRows = await readRows();
  const rows = args.limit ? allRows.slice(0, args.limit) : allRows;
  const cache = await readCache();
  let reused = 0;
  let sourceFailures = 0;

  for (const [index, row] of rows.entries()) {
    const key = buildKey(row);

    if (!args.refresh && cache.entries[key]) {
      reused += 1;
      const decision = decideReview(
        row,
        cache.entries[key].preview,
        cache.entries[key].sourceErrors
      );
      console.log(`[${index + 1}/${rows.length}] ${row.title} - ${decision.status} (cached)`);
      continue;
    }

    const input = buildInput(row);
    const sourceErrors: string[] = [];

    try {
      const preview = await matchWithRetry(input, args.delayMs);

      cache.entries[key] = {
        input,
        preview,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      sourceFailures += 1;
      sourceErrors.push(formatSourceError(error));
      cache.entries[key] = {
        input,
        sourceErrors,
        completedAt: new Date().toISOString(),
      };
    }

    await writeCache(cache);

    const decision = decideReview(
      row,
      cache.entries[key].preview,
      cache.entries[key].sourceErrors
    );
    console.log(`[${index + 1}/${rows.length}] ${row.title} - ${decision.status}`);

    if (index < rows.length - 1) {
      await sleep(args.delayMs);
    }
  }

  await writeReviewOutputs(rows, cache);

  const decisions = rows.map((row) =>
    decideReview(
      row,
      cache.entries[buildKey(row)]?.preview,
      cache.entries[buildKey(row)]?.sourceErrors
    )
  );
  const ready = decisions.filter((decision) => decision.status === "Ready").length;
  const needsReview = decisions.filter((decision) => decision.status === "Needs Review").length;
  const noMatch = decisions.filter((decision) => decision.status === "No Match").length;

  console.log("");
  console.log(`Total processed rows: ${rows.length}`);
  console.log(`Ready count: ${ready}`);
  console.log(`Needs Review count: ${needsReview}`);
  console.log(`No Match count: ${noMatch}`);
  console.log(`Cached rows reused: ${reused}`);
  console.log(`Source failures: ${sourceFailures}`);
  console.log(`Review CSV: ${reviewCsvPath}`);
  console.log(`Review JSON: ${reviewJsonPath}`);
  console.log(`Match cache: ${cachePath}`);
  console.log("Supabase was not modified.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
