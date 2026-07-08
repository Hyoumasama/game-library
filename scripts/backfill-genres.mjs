import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function toGenres(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasGenres(value) {
  return Array.isArray(value) && value.length > 0;
}

const pageSize = 1000;
let from = 0;
let scanned = 0;
let updated = 0;

while (true) {
  const { data, error } = await supabase
    .from("games")
    .select("id, genre, genres")
    .not("genre", "is", null)
    .range(from, from + pageSize - 1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    break;
  }

  scanned += data.length;

  for (const game of data) {
    if (hasGenres(game.genres)) {
      continue;
    }

    const genres = toGenres(game.genre);

    if (genres.length === 0) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("games")
      .update({ genres })
      .eq("id", game.id);

    if (updateError) {
      throw new Error(`Failed to update game ${game.id}: ${updateError.message}`);
    }

    updated += 1;
  }

  if (data.length < pageSize) {
    break;
  }

  from += pageSize;
}

console.log(`Backfilled genres for ${updated} games (${scanned} scanned).`);
