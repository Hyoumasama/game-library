import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

export type Game = {
  Title: string;
  Release: string;
  "Date of Purchase": string;
  "Completion Last Played": string;
  Score: string;
  Price: string;
  Hours: string;
  "Hours Played": string;
  Status: string;
  Store: string;
  Platform: string;
  "Hardware (1)": string;
};

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getGames(): Promise<Game[]> {
  const filePath = path.join(process.cwd(), "public", "games.csv");

  const csv = await fs.readFile(filePath, "utf8");

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  return records;
}

export async function getGameBySlug(slug: string) {
  const games = await getGames();

  return games.find(
    (game) => slugify(game.Title) === slug
  );
}