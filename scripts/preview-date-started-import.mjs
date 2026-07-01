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

function toIsoDate(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

const csv = fs.readFileSync("date_started.csv", "utf8").replace(/^\uFEFF/, "");
const lines = csv.split(/\r?\n/).filter(Boolean);

const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

const igdbIndex = headers.indexOf("igdb");
const dateIndex = headers.indexOf("date_started");
const titleIndex = headers.indexOf("title");

if (igdbIndex === -1 || dateIndex === -1 || titleIndex === -1) {
  console.error("CSV must have igdb, date_started, title columns.");
  process.exit(1);
}

const rows = lines.slice(1).map((line) => {
  const cols = parseCsvLine(line);

  return {
    igdb_id: Number(cols[igdbIndex]),
    date_started: toIsoDate(cols[dateIndex]),
    raw_date: cols[dateIndex],
    title: cols[titleIndex],
  };
});

const invalidRows = rows.filter(
  (row) =>
    !row.igdb_id ||
    Number.isNaN(row.igdb_id) ||
    !row.date_started ||
    !row.title
);

const validRows = rows.filter((row) => !invalidRows.includes(row));

const igdbIds = [...new Set(validRows.map((row) => row.igdb_id))];

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

const matched = [];
const notFound = [];

for (const row of validRows) {
  const key = `${row.igdb_id}|${normalizeTitle(row.title)}`;
  const game = gamesByKey.get(key);

  if (!game) {
    notFound.push(row);
  } else {
    matched.push({ row, game });
  }
}

console.log("DATE STARTED IMPORT PREVIEW");
console.log("---------------------------");
console.log(`CSV rows: ${rows.length}`);
console.log(`Matched: ${matched.length}`);
console.log(`Not found: ${notFound.length}`);
console.log(`Invalid rows: ${invalidRows.length}`);

if (notFound.length) {
  console.log("\nNOT FOUND:");
  notFound.slice(0, 50).forEach((row) => {
    console.log(`- ${row.igdb_id} | ${row.title} | ${row.raw_date}`);
  });
}

if (invalidRows.length) {
  console.log("\nINVALID ROWS:");
  invalidRows.slice(0, 50).forEach((row) => {
    console.log(`- ${row.igdb_id} | ${row.title} | ${row.raw_date}`);
  });
}

console.log("\nSAMPLE MATCHES:");
matched.slice(0, 20).forEach(({ row, game }) => {
  console.log(`${game.id} | ${game.title} | ${row.date_started}`);
});