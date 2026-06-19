require("dotenv").config({ path: ".env.local" });

const fs = require("fs/promises");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const filePath = path.join(process.cwd(), "public", "games.csv");
  const csv = await fs.readFile(filePath, "utf8");

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  const games = records.map((game) => ({
    title: game.Title || "",
    slug: slugify(game.Title || ""),

    release: game.Release || null,
    date_of_purchase: game["Date of Purchase"] || null,
    completion_last_played: game["Completion Last Played"] || null,

    score: toNumber(game.Score),
    price: game.Price || null,
    hours_played: toNumber(game["Hours Played"] || game.Hours),

    status: game.Status || null,
    store: game.Store || null,
    platform: game.Platform || null,
    hardware: game["Hardware (1)"] || null,
  }));

  console.log(`Importing ${games.length} games...`);

  const { error: deleteError } = await supabase.from("games").delete().neq("id", 0);

  if (deleteError) {
    throw deleteError;
  }

  const chunkSize = 500;

  for (let i = 0; i < games.length; i += chunkSize) {
    const chunk = games.slice(i, i + chunkSize);

    const { error } = await supabase.from("games").insert(chunk);

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    console.log(`Imported ${Math.min(i + chunkSize, games.length)} / ${games.length}`);
  }

  console.log("Done ✅");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});