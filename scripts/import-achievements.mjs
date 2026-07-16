import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });

const APPLY = process.argv.includes("--apply");
const CSV_PATH = path.join(process.cwd(), "tools", "achievements_refined.csv");
const CHUNK_SIZE = 100;

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function toText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function toTimestamp(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return text;

  const [, month, day, year, hour, minute, second = "00"] = match;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )} ${hour.padStart(2, "0")}:${minute}:${second}+00`;
}

function toPlaytimeHours(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const hours = Number(text.match(/(\d+(?:\.\d+)?)h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)m/)?.[1] || 0);
  const total = hours + minutes / 60;

  return total > 0 ? Number(total.toFixed(2)) : null;
}

function buildRow(row) {
  return {
    game_id: toInteger(row.game_id),
    source_title: toText(row.source_title),
    platform: toText(row.platform),
    playtime: toPlaytimeHours(row.playtime),
    bronze: toInteger(row.bronze),
    silver: toInteger(row.silver),
    gold: toInteger(row.gold),
    platinum: toInteger(row.platinum),
    earned_awards: toInteger(row.earned_awards),
    total_awards: toInteger(row.total_awards),
    earned_points: toInteger(row.earned_points),
    completion_percentage: toInteger(row.completion_percentage),
    last_played_utc: toTimestamp(row.last_played_utc),
  };
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function summarize(rows, payload) {
  const gameIds = new Set(payload.map((row) => row.game_id));
  const duplicateIds = rows.reduce((counts, row) => {
    const gameId = String(row.game_id || "").trim();
    counts.set(gameId, (counts.get(gameId) || 0) + 1);
    return counts;
  }, new Map());

  return {
    csvRows: rows.length,
    importRows: payload.length,
    uniqueGameIds: gameIds.size,
    duplicateGameIds: [...duplicateIds].filter(([, count]) => count > 1).length,
    nonNumericGameIds: rows.filter(
      (row) => !/^\d+$/.test(String(row.game_id || "").trim())
    ).length,
    completion100: payload.filter((row) => row.completion_percentage >= 100)
      .length,
    platinum: payload.filter((row) => row.platinum > 0).length,
  };
}

const csv = fs.readFileSync(CSV_PATH, "utf8");
const rows = parse(csv, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
});
const payload = rows
  .filter((row) => /^\d+$/.test(String(row.game_id || "").trim()))
  .map(buildRow);
const summary = summarize(rows, payload);

console.log(JSON.stringify(summary, null, 2));

if (summary.nonNumericGameIds > 0 || summary.duplicateGameIds > 0) {
  throw new Error("CSV still has non-numeric or duplicate game_id values.");
}

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to replace game_achievements.");
  process.exit(0);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { count: beforeCount, error: beforeError } = await supabase
  .from("game_achievements")
  .select("id", { count: "exact", head: true });

if (beforeError) throw beforeError;

const { error: deleteError } = await supabase
  .from("game_achievements")
  .delete()
  .not("id", "is", null);

if (deleteError) throw deleteError;

let inserted = 0;

for (const rowsChunk of chunk(payload, CHUNK_SIZE)) {
  const { error } = await supabase.from("game_achievements").insert(rowsChunk);

  if (error) throw error;

  inserted += rowsChunk.length;
}

const { count: afterCount, error: afterError } = await supabase
  .from("game_achievements")
  .select("id", { count: "exact", head: true });

if (afterError) throw afterError;

console.log(
  JSON.stringify(
    {
      deletedRows: beforeCount,
      insertedRows: inserted,
      finalRows: afterCount,
    },
    null,
    2
  )
);
