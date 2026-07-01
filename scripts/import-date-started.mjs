import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

const csv = fs.readFileSync("date_started.csv", "utf8").replace(/^\uFEFF/, "");
const lines = csv.split(/\r?\n/).filter(Boolean);

const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

const titleIndex = headers.indexOf("title");
const dateIndex = headers.indexOf("date_started");
const igdbIndex = headers.indexOf("igdbid");

if (titleIndex === -1 || dateIndex === -1 || igdbIndex === -1) {
  console.error("CSV must have Title, date_started, igdbid columns.");
  process.exit(1);
}

const rows = lines.slice(1).map((line) => {
  const cols = parseCsvLine(line);

  return {
    title: cols[titleIndex],
    date_started: toIsoDate(cols[dateIndex]),
    raw_date: cols[dateIndex],
    igdb_id: Number(cols[igdbIndex]),
  };
});

const duplicateKeys = new Set();
const seenKeys = new Set();

for (const row of rows) {
  const key = `${row.igdb_id}|${normalizeTitle(row.title)}`;
  if (seenKeys.has(key)) duplicateKeys.add(key);
  seenKeys.add(key);
}

if (duplicateKeys.size > 0) {
  console.error("Import stopped. Duplicate rows found in CSV:");
  for (const key of duplicateKeys) console.error(key);
  process.exit(1);
}

const invalidRows = rows.filter(
  (row) =>
    !row.title ||
    !row.date_started ||
    !row.igdb_id ||
    Number.isNaN(row.igdb_id)
);

if (invalidRows.length > 0) {
  console.error("Import stopped. Invalid rows:");
  invalidRows.forEach((row) =>
    console.error(`${row.igdb_id} | ${row.title} | ${row.raw_date}`)
  );
  process.exit(1);
}

const igdbIds = [...new Set(rows.map((row) => row.igdb_id))];

const { data: games, error } = await supabase
  .from("games")
  .select("id,title,igdb_id,date_started")
  .in("igdb_id", igdbIds);

if (error) {
  console.error(error);
  process.exit(1);
}

const gamesByKey = new Map();

for (const game of games || []) {
  const key = `${Number(game.igdb_id)}|${normalizeTitle(game.title)}`;
  gamesByKey.set(key, game);
}

const updates = [];
const notFound = [];

for (const row of rows) {
  const key = `${row.igdb_id}|${normalizeTitle(row.title)}`;
  const game = gamesByKey.get(key);

  if (!game) {
    notFound.push(row);
  } else {
    updates.push({
      id: game.id,
      title: game.title,
      date_started: row.date_started,
    });
  }
}

if (notFound.length > 0) {
  console.error("Import stopped. Not found:");
  notFound.forEach((row) =>
    console.error(`${row.igdb_id} | ${row.title} | ${row.raw_date}`)
  );
  process.exit(1);
}

console.log(`Ready to update: ${updates.length}`);

for (const item of updates) {
  const { error: updateError } = await supabase
    .from("games")
    .update({ date_started: item.date_started })
    .eq("id", item.id);

  if (updateError) {
    console.error(`Failed: ${item.id} | ${item.title}`);
    console.error(updateError);
    process.exit(1);
  }

  console.log(`Updated ${item.id} | ${item.title} | ${item.date_started}`);
}

console.log("Import completed successfully.");