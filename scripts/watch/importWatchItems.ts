import { parse } from "csv-parse/sync";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type LocalType = "series" | "movie" | "ova";

type ImportPreviewRow = {
  source_key: string;
  local_title: string;
  local_type: LocalType | "";
  local_file_count: number;
  local_season_count: number;
  local_episode_count: number;
  local_summary: {
    primary: number;
    extra: number;
    nced: number;
    ncop: number;
    special: number;
  };
  status: "pending";
  validation_status: "valid" | "invalid";
  validation_notes: string[];
};

const inputPath = resolve("data/watch-import/watch_library_summary.csv");
const previewJsonPath = resolve("data/watch-import/watch_import_items_preview.json");
const previewCsvPath = resolve("data/watch-import/watch_import_items_preview.csv");
const batchSize = 50;

function parseArgs() {
  return {
    apply: process.argv.slice(2).includes("--apply"),
  };
}

function mapType(value: string): LocalType | "" {
  const clean = value.trim();

  if (clean === "Series") return "series";
  if (clean === "Movie") return "movie";
  if (clean === "OVA") return "ova";

  return "";
}

function toInteger(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) return 0;
  if (!/^\d+$/.test(text)) return NaN;

  const parsed = Number(text);

  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

function sourceKeyPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSourceKey(localType: LocalType | "", title: string) {
  return `watch-inventory:${localType || "unknown"}:${sourceKeyPart(title)}`;
}

async function readInputRows() {
  const content = await readFile(inputPath, "utf8");

  return parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function buildPreviewRows(records: Record<string, string>[]) {
  return records.map((record): ImportPreviewRow => {
    const localTitle = String(record.Title || "").trim();
    const localType = mapType(String(record.Type || ""));
    const primary = toInteger(record.Episodes);
    const extra = toInteger(record.Extra);
    const nced = toInteger(record.NCED);
    const ncop = toInteger(record.NCOP);
    const special = toInteger(record.Special);
    const seasons = toInteger(record.Seasons);
    const counts = [primary, extra, nced, ncop, special, seasons];
    const notes: string[] = [];

    if (!localTitle) notes.push("Title is required.");
    if (!localType) notes.push(`Unknown Type value: ${record.Type || ""}`);
    if (counts.some((count) => !Number.isInteger(count) || count < 0)) {
      notes.push("All count columns must be non-negative integers.");
    }

    const safePrimary = Number.isInteger(primary) && primary >= 0 ? primary : 0;
    const safeExtra = Number.isInteger(extra) && extra >= 0 ? extra : 0;
    const safeNced = Number.isInteger(nced) && nced >= 0 ? nced : 0;
    const safeNcop = Number.isInteger(ncop) && ncop >= 0 ? ncop : 0;
    const safeSpecial = Number.isInteger(special) && special >= 0 ? special : 0;
    const safeSeasons = Number.isInteger(seasons) && seasons >= 0 ? seasons : 0;

    return {
      source_key: buildSourceKey(localType, localTitle),
      local_title: localTitle,
      local_type: localType,
      local_file_count: safePrimary + safeExtra + safeNced + safeNcop + safeSpecial,
      local_season_count: safeSeasons,
      local_episode_count: localType === "series" ? safePrimary : 0,
      local_summary: {
        primary: safePrimary,
        extra: safeExtra,
        nced: safeNced,
        ncop: safeNcop,
        special: safeSpecial,
      },
      status: "pending",
      validation_status: notes.length ? "invalid" : "valid",
      validation_notes: notes,
    };
  });
}

function findDuplicateKeys(rows: ImportPreviewRow[]) {
  const byKey = new Map<string, ImportPreviewRow[]>();

  for (const row of rows) {
    if (!byKey.has(row.source_key)) byKey.set(row.source_key, []);
    byKey.get(row.source_key)!.push(row);
  }

  return [...byKey.entries()]
    .filter(([, rowsForKey]) => rowsForKey.length > 1)
    .map(([sourceKey, rowsForKey]) => ({
      sourceKey,
      titles: rowsForKey.map((row) => row.local_title),
    }));
}

function markDuplicateRows(rows: ImportPreviewRow[], duplicateKeys: ReturnType<typeof findDuplicateKeys>) {
  const duplicateSet = new Set(duplicateKeys.map((duplicate) => duplicate.sourceKey));

  for (const row of rows) {
    if (!duplicateSet.has(row.source_key)) continue;

    row.validation_status = "invalid";
    row.validation_notes.push("Duplicate source_key.");
  }
}

function csvCell(value: unknown) {
  const text = Array.isArray(value)
    ? value.join("; ")
    : value == null
    ? ""
    : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function previewCsv(rows: ImportPreviewRow[]) {
  const headers = [
    "Source Key",
    "Local Title",
    "Local Type",
    "Local File Count",
    "Local Season Count",
    "Local Episode Count",
    "Primary",
    "Extra",
    "NCED",
    "NCOP",
    "Special",
    "Validation Status",
    "Validation Notes",
  ];
  const lines = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push([
      row.source_key,
      row.local_title,
      row.local_type,
      row.local_file_count,
      row.local_season_count,
      row.local_episode_count,
      row.local_summary.primary,
      row.local_summary.extra,
      row.local_summary.nced,
      row.local_summary.ncop,
      row.local_summary.special,
      row.validation_status,
      row.validation_notes,
    ].map(csvCell).join(","));
  }

  return `${lines.join("\n")}\n`;
}

async function writePreview(rows: ImportPreviewRow[], duplicateKeys: ReturnType<typeof findDuplicateKeys>) {
  await mkdir(dirname(previewJsonPath), { recursive: true });
  await writeFile(
    previewJsonPath,
    `${JSON.stringify({ rows, duplicateSourceKeys: duplicateKeys }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(previewCsvPath, previewCsv(rows), "utf8");
}

function summarize(rows: ImportPreviewRow[]) {
  const countsByType = rows.reduce<Record<string, number>>((counts, row) => {
    const key = row.local_type || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  return {
    inputRows: rows.length,
    validRows: rows.filter((row) => row.validation_status === "valid").length,
    invalidRows: rows.filter((row) => row.validation_status === "invalid").length,
    uniqueSourceKeys: new Set(rows.map((row) => row.source_key)).size,
    countsByType,
    totalLocalFiles: rows.reduce((sum, row) => sum + row.local_file_count, 0),
  };
}

async function createSupabaseClient() {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: ".env.local", quiet: true });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
  }

  const { createClient } = await import("@supabase/supabase-js");

  return createClient(supabaseUrl, serviceRoleKey);
}

function toApplyPayload(row: ImportPreviewRow) {
  return {
    source_key: row.source_key,
    local_title: row.local_title,
    local_type: row.local_type,
    local_file_count: row.local_file_count,
    local_season_count: row.local_season_count,
    local_episode_count: row.local_episode_count,
    local_summary: row.local_summary,
  };
}

async function applyRows(rows: ImportPreviewRow[]) {
  const supabase = await createSupabaseClient();

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize).map(toApplyPayload);
    const { error } = await supabase
      .from("watch_import_items")
      .upsert(batch, {
        onConflict: "source_key",
      });

    if (error) {
      throw new Error(`Batch ${Math.floor(index / batchSize) + 1} failed: ${error.message}`);
    }
  }
}

function printSummary(summary: ReturnType<typeof summarize>, duplicateKeys: ReturnType<typeof findDuplicateKeys>, apply: boolean) {
  console.log(`Input rows: ${summary.inputRows}`);
  console.log(`Valid rows: ${summary.validRows}`);
  console.log(`Invalid rows: ${summary.invalidRows}`);
  console.log(`Unique source keys: ${summary.uniqueSourceKeys}`);
  console.log(`Duplicate source keys: ${duplicateKeys.length}`);
  console.log(`Counts by local type: ${JSON.stringify(summary.countsByType)}`);
  console.log(`Total local files represented: ${summary.totalLocalFiles}`);
  console.log(`Preview JSON: ${previewJsonPath}`);
  console.log(`Preview CSV: ${previewCsvPath}`);
  console.log(
    apply
      ? "Apply mode requested."
      : "Dry-run mode: Supabase was not contacted."
  );
}

async function main() {
  const args = parseArgs();
  const records = await readInputRows();
  const rows = buildPreviewRows(records);
  const duplicateKeys = findDuplicateKeys(rows);
  markDuplicateRows(rows, duplicateKeys);
  const summary = summarize(rows);

  await writePreview(rows, duplicateKeys);
  printSummary(summary, duplicateKeys, args.apply);

  if (duplicateKeys.length) {
    console.error("Duplicate source_key values detected:");
    for (const duplicate of duplicateKeys) {
      console.error(`- ${duplicate.sourceKey}: ${duplicate.titles.join(" | ")}`);
    }
    process.exit(1);
  }

  if (summary.invalidRows > 0) {
    console.error("Invalid rows detected. See preview outputs for details.");
    process.exit(1);
  }

  if (!args.apply) return;

  await applyRows(rows);
  console.log(`Applied ${rows.length} rows to watch_import_items.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
