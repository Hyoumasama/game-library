import { parse } from "csv-parse/sync";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type FileType = "Episode" | "Movie" | "OVA" | "Special" | "Extra" | "NCOP" | "NCED";

type SummaryRow = {
  title: string;
  type: string;
  seasons: number;
  episodes: number;
  extra: number;
  nced: number;
  ncop: number;
  special: number;
};

type InventoryRow = {
  title: string;
  season: number | null;
  episode: number | null;
  type: FileType;
  filePath: string;
  fileName: string;
};

const summaryPath = resolve("data/watch-import/watch_library_summary.csv");
const inventoryPath = resolve("data/watch-import/watch_episode_inventory.csv");
const holdingsJsonPath = resolve("data/watch-import/watch_local_holdings.json");
const holdingsCsvPath = resolve("data/watch-import/watch_local_holdings.csv");
const splitCandidatesPath = resolve("data/watch-import/watch_local_split_candidates.csv");
const fileTypes: FileType[] = ["Episode", "Movie", "OVA", "Special", "Extra", "NCOP", "NCED"];

function toCount(value: unknown) {
  const parsed = Number(String(value ?? "").trim() || 0);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function nullableNumber(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const parsed = Number(text);

  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function fileNameFromPath(filePath: string) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactTitle(value: string) {
  return normalize(value).replace(/\b(movie|ova|special|complete|series|bd|1080p|x264|x265|hevc|dual|audio|sub|subs)\b/g, "").replace(/\s+/g, " ").trim();
}

async function readCsv(path: string) {
  return parse(await readFile(path, "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

async function readSummaryRows(): Promise<SummaryRow[]> {
  return (await readCsv(summaryPath)).map((record) => ({
    title: String(record.Title || "").trim(),
    type: String(record.Type || "").trim(),
    seasons: toCount(record.Seasons),
    episodes: toCount(record.Episodes),
    extra: toCount(record.Extra),
    nced: toCount(record.NCED),
    ncop: toCount(record.NCOP),
    special: toCount(record.Special),
  })).filter((row) => row.title);
}

async function readInventoryRows(): Promise<InventoryRow[]> {
  return (await readCsv(inventoryPath)).map((record) => {
    const filePath = String(record["File Path"] || "").trim();

    return {
      title: String(record.Title || "").trim(),
      season: nullableNumber(record.Season),
      episode: nullableNumber(record.Episode),
      type: String(record.Type || "").trim() as FileType,
      filePath,
      fileName: fileNameFromPath(filePath),
    };
  }).filter((row) => row.title && fileTypes.includes(row.type));
}

function groupByTitle(rows: InventoryRow[]) {
  const groups = new Map<string, InventoryRow[]>();

  for (const row of rows) {
    if (!groups.has(row.title)) groups.set(row.title, []);
    groups.get(row.title)!.push(row);
  }

  return groups;
}

function findInventoryRows(summary: SummaryRow, groups: Map<string, InventoryRow[]>) {
  const exact = groups.get(summary.title);
  if (exact) return exact;

  const summaryKey = compactTitle(summary.title);
  const [bestTitle, bestRows] = [...groups.entries()].find(([title, rows]) => {
    const titleKey = compactTitle(title);

    return (
      summaryKey.includes(titleKey)
      && rows.some((row) => compactTitle(row.filePath).includes(summaryKey))
    );
  }) || [];

  return bestTitle && bestRows ? bestRows : [];
}

function fileEntry(row: InventoryRow) {
  return {
    "File Path": row.filePath,
    originalFileName: row.fileName,
    detectedSeason: row.season,
    detectedEpisode: row.episode,
    type: row.type,
  };
}

function makeRanges(numbers: number[]) {
  if (!numbers.length) return [];

  const ranges: string[] = [];
  let start = numbers[0];
  let previous = numbers[0];

  for (const number of numbers.slice(1)) {
    if (number === previous + 1) {
      previous = number;
      continue;
    }

    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = number;
    previous = number;
  }

  ranges.push(start === previous ? String(start) : `${start}-${previous}`);

  return ranges;
}

function gapsInside(numbers: number[]) {
  if (numbers.length < 2) return [];

  const owned = new Set(numbers);
  const gaps: number[] = [];

  for (let episode = numbers[0]; episode <= numbers[numbers.length - 1]; episode += 1) {
    if (!owned.has(episode)) gaps.push(episode);
  }

  return gaps;
}

function seasonSummary(seasonNumber: number | null, rows: InventoryRow[]) {
  const exactEpisodeNumbers = Array.from(
    new Set(
      rows
        .filter((row) => row.type === "Episode" && row.episode != null)
        .map((row) => row.episode!)
    )
  ).sort((a, b) => a - b);
  const gaps = gapsInside(exactEpisodeNumbers);

  return {
    localSeasonNumber: seasonNumber,
    exactEpisodeNumbers,
    episodeRanges: makeRanges(exactEpisodeNumbers),
    episodeCount: exactEpisodeNumbers.length,
    firstEpisode: exactEpisodeNumbers[0] ?? null,
    lastEpisode: exactEpisodeNumbers.at(-1) ?? null,
    gapsInsideOwnedRange: gaps,
  };
}

function buildHoldings(summaryRows: SummaryRow[], inventoryRows: InventoryRow[]) {
  const groups = groupByTitle(inventoryRows);

  return summaryRows.map((summary) => {
    const rows = findInventoryRows(summary, groups);
    const filesByType = Object.fromEntries(
      fileTypes.map((type) => [
        type,
        rows.filter((row) => row.type === type).map(fileEntry),
      ])
    ) as Record<FileType, ReturnType<typeof fileEntry>[]>;
    const seasonNumbers = Array.from(
      new Set(
        rows
          .filter((row) => row.type === "Episode")
          .map((row) => row.season)
      )
    ).sort((a, b) => (a ?? -1) - (b ?? -1));
    const seasons = seasonNumbers.length
      ? seasonNumbers.map((seasonNumber) =>
          seasonSummary(
            seasonNumber,
            rows.filter((row) => row.type === "Episode" && row.season === seasonNumber)
          )
        )
      : [seasonSummary(null, rows.filter((row) => row.type === "Episode"))];

    return {
      localTitle: summary.title,
      localType: summary.type,
      summary: {
        declaredSeasonCount: summary.seasons,
        primaryFileCount: summary.episodes,
        extraCount: summary.extra,
        ncedCount: summary.nced,
        ncopCount: summary.ncop,
        specialCount: summary.special,
      },
      seasons,
      filesByType,
    };
  });
}

function csvCell(value: unknown) {
  const text = value == null
    ? ""
    : Array.isArray(value)
    ? value.join("|")
    : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function holdingsCsv(holdings: ReturnType<typeof buildHoldings>) {
  const headers = [
    "Local Title",
    "Local Type",
    "Local Season Number",
    "Exact Episodes",
    "Episode Ranges",
    "Episode Count",
    "First Episode",
    "Last Episode",
    "Gaps Inside Owned Range",
    "Movie Files",
    "OVA Files",
    "Special Files",
    "Extra Files",
    "NCED Files",
    "NCOP Files",
  ];
  const lines = [headers.map(csvCell).join(",")];

  for (const item of holdings) {
    for (const season of item.seasons) {
      lines.push([
        item.localTitle,
        item.localType,
        season.localSeasonNumber,
        season.exactEpisodeNumbers,
        season.episodeRanges,
        season.episodeCount,
        season.firstEpisode,
        season.lastEpisode,
        season.gapsInsideOwnedRange,
        item.filesByType.Movie.length,
        item.filesByType.OVA.length,
        item.filesByType.Special.length,
        item.filesByType.Extra.length,
        item.filesByType.NCED.length,
        item.filesByType.NCOP.length,
      ].map(csvCell).join(","));
    }
  }

  return `${lines.join("\n")}\n`;
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function cleanFileTitle(fileName: string) {
  return removeExtension(fileName)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*(1080p|720p|x264|x265|hevc|flac|dual|audio|sub|bd|webrip)[^)]*\)/gi, " ")
    .replace(/\b(1080p|720p|x264|x265|hevc|flac|aac|bd|webrip|dual audio|multi sub|jpn|sub)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitReasons(groupTitle: string, groupType: string, rows: InventoryRow[]) {
  const primaryRows = rows.filter((row) => ["Movie", "OVA", "Special"].includes(row.type));
  const reasonsByPath = new Map<string, string[]>();
  const groupKey = compactTitle(groupTitle);
  const groupLooksCollection = /\b(collection|trilogy|complete|arc|movies?)\b/i.test(groupTitle)
    || primaryRows.length > 1 && groupType === "Movie";
  const movieNumbers = new Set<string>();
  const cleanTitles = new Set<string>();

  for (const row of primaryRows) {
    const reasons: string[] = [];
    const cleanTitle = cleanFileTitle(row.fileName);
    const cleanKey = compactTitle(cleanTitle);
    const movieNumber = cleanTitle.match(/\b(movie|film)?\s*(\d{1,2}|i{1,3}|iv|v)\b/i)?.[2];

    if (groupType === "Movie" && primaryRows.length > 1) {
      reasons.push("Movie group contains more than one primary movie file.");
    }

    if (groupType === "OVA" && primaryRows.length > 1 && cleanKey !== groupKey) {
      reasons.push("OVA group contains separately titled files.");
    }

    if (groupLooksCollection) {
      reasons.push("Group title appears to describe a collection or trilogy.");
    }

    if (movieNumber) movieNumbers.add(movieNumber.toLowerCase());
    if (cleanKey) cleanTitles.add(cleanKey);

    if (cleanKey && groupKey && cleanKey !== groupKey && !cleanKey.includes(groupKey) && !groupKey.includes(cleanKey)) {
      reasons.push("Filename title differs significantly from group title.");
    }

    if (/(.{8,})\1/i.test(cleanTitle) || /\b(.{5,})\s+\1\b/i.test(cleanTitle)) {
      reasons.push("Duplicated title text detected.");
    }

    if (/[._]{2,}|_/.test(row.fileName)) {
      reasons.push("Underscores or repeated separators used in filename.");
    }

    if (/\b[a-f0-9]{4,8}\b/i.test(cleanTitle)) {
      reasons.push("Release hash appears appended to title.");
    }

    if (/film zone piece/i.test(cleanTitle) || /\b(movie\s+\d+).*\1\b/i.test(cleanTitle)) {
      reasons.push("Duplicated movie number or name fragment detected.");
    }

    if (reasons.length) reasonsByPath.set(row.filePath, Array.from(new Set(reasons)));
  }

  if (movieNumbers.size > 1 || cleanTitles.size > 1 && primaryRows.length > 1) {
    for (const row of primaryRows) {
      const reasons = reasonsByPath.get(row.filePath) || [];
      reasons.push("Multiple files contain different numbered or titled movie entries.");
      reasonsByPath.set(row.filePath, Array.from(new Set(reasons)));
    }
  }

  return reasonsByPath;
}

function splitCandidates(summaryRows: SummaryRow[], inventoryRows: InventoryRow[]) {
  const groups = groupByTitle(inventoryRows);
  const output: {
    localGroupTitle: string;
    localType: string;
    primaryFileCount: number;
    originalFileName: string;
    suggestedCleanFileTitle: string;
    filePath: string;
    splitReason: string;
  }[] = [];

  for (const summary of summaryRows) {
    const rows = findInventoryRows(summary, groups);
    const primaryRows = rows.filter((row) => ["Movie", "OVA", "Special"].includes(row.type));
    const reasonsByPath = splitReasons(summary.title, summary.type, rows);

    for (const row of primaryRows) {
      const reasons = reasonsByPath.get(row.filePath);
      if (!reasons?.length) continue;

      output.push({
        localGroupTitle: summary.title,
        localType: summary.type,
        primaryFileCount: primaryRows.length,
        originalFileName: row.fileName,
        suggestedCleanFileTitle: cleanFileTitle(row.fileName),
        filePath: row.filePath,
        splitReason: reasons.join(" "),
      });
    }
  }

  return output;
}

function splitCandidatesCsv(rows: ReturnType<typeof splitCandidates>) {
  const headers = [
    "Local Group Title",
    "Local Type",
    "Primary File Count",
    "Original File Name",
    "Suggested Clean File Title",
    "File Path",
    "Split Reason",
  ];
  const lines = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push([
      row.localGroupTitle,
      row.localType,
      row.primaryFileCount,
      row.originalFileName,
      row.suggestedCleanFileTitle,
      row.filePath,
      row.splitReason,
    ].map(csvCell).join(","));
  }

  return `${lines.join("\n")}\n`;
}

async function writeOutputs(
  holdings: ReturnType<typeof buildHoldings>,
  candidates: ReturnType<typeof splitCandidates>
) {
  await mkdir(dirname(holdingsJsonPath), { recursive: true });
  await writeFile(holdingsJsonPath, `${JSON.stringify(holdings, null, 2)}\n`, "utf8");
  await writeFile(holdingsCsvPath, holdingsCsv(holdings), "utf8");
  await writeFile(splitCandidatesPath, splitCandidatesCsv(candidates), "utf8");
}

async function main() {
  const [summaryRows, inventoryRows] = await Promise.all([
    readSummaryRows(),
    readInventoryRows(),
  ]);
  const holdings = buildHoldings(summaryRows, inventoryRows);
  const candidates = splitCandidates(summaryRows, inventoryRows);
  const distinctSeasonGroups = holdings.reduce(
    (sum, item) => sum + item.seasons.length,
    0
  );

  await writeOutputs(holdings, candidates);

  console.log(`Local works processed: ${holdings.length}`);
  console.log(`Distinct local season groups: ${distinctSeasonGroups}`);
  console.log(`Split candidates: ${candidates.length}`);
  console.log(`Holdings JSON: ${holdingsJsonPath}`);
  console.log(`Holdings CSV: ${holdingsCsvPath}`);
  console.log(`Split candidates CSV: ${splitCandidatesPath}`);
  console.log("No external APIs were called.");
  console.log("Supabase was not modified.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
