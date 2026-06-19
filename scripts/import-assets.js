require("dotenv").config({ path: ".env.local" });

const fs = require("fs/promises");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

function cleanRow(row) {
  const cleaned = {};

  for (const key of Object.keys(row)) {
    const cleanKey = key
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();

    cleaned[cleanKey] = row[key];
  }

  return cleaned;
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const csvPath = path.join(process.cwd(), "assets.csv");
  const csv = await fs.readFile(csvPath, "utf8");

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }).map(cleanRow);

  const assets = records.map((row) => ({
    type: row.type || null,
    category: row.category || null,
    name: row.name || null,
    brand: row.brand || null,
    purchase_date: row["purchase date"] || row.purchase_date || null,
    price: row.price || null,
    market: row.market || null,
    image_url: row["image url"] || row.image_url || null,
    status: row.status || null,
    notes: row.notes || null,
  }));

  console.log("First asset preview:", assets[0]);
  console.log(`Importing ${assets.length} assets...`);

  const { error: deleteError } = await supabase
    .from("library_assets")
    .delete()
    .neq("id", 0);

  if (deleteError) {
    console.error(deleteError);
    process.exit(1);
  }

  const { error } = await supabase
    .from("library_assets")
    .insert(assets);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log("Done ✅");
}

main();