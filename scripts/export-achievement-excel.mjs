import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, "tools");
const OUTPUT_FILE = path.join(TOOLS_DIR, "achievement-data-export.xls");

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isNumberLike(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

function cell(value) {
  if (isNumberLike(value)) {
    return `<Cell><Data ss:Type="Number">${Number(value)}</Data></Cell>`;
  }

  return `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
}

function row(values) {
  return `<Row>${values.map(cell).join("")}</Row>`;
}

function worksheet(name, headers, rows) {
  return `
  <Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}">
    <Table>
      ${row(headers)}
      ${rows.map((item) => row(headers.map((header) => item[header]))).join("\n      ")}
    </Table>
  </Worksheet>`;
}

function getSteamRows() {
  const csv = readText("tools/steam_achievements_import.csv");
  return parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }).map((item) => {
    const percent = Number(item.percent || 0);

    return {
      appid: item.appid,
      title: item.title,
      platform: item.platform,
      source: item.source,
      earned: item.earned,
      total: item.total,
      percent: item.percent,
      playtime_hours: item.playtime_hours,
      playtime_minutes: item.playtime_minutes,
      badge_type: percent >= 100 ? "100completion" : "",
    };
  });
}

function getExophaseRows() {
  const files = fs
    .readdirSync(TOOLS_DIR)
    .filter((name) => /^games-page-\d+\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return files.flatMap((file) => {
    const payload = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, file), "utf8"));

    return (payload.games || []).map((game) => {
      const platforms = (game.meta?.platforms || [])
        .map((platform) => platform.name)
        .filter(Boolean)
        .join(", ");
      const percent = Number(game.percent || 0);
      const platinum = Number(game.earned_platinum || 0);

      return {
        source_file: file,
        master_id: game.master_id,
        title: game.meta?.title || "",
        environment: game.meta?.environment_slug || "",
        platforms,
        status: game.status,
        earned_awards: game.earned_awards,
        total_awards: game.total_awards,
        percent: game.percent,
        earned_platinum: game.earned_platinum,
        earned_gold: game.earned_gold,
        earned_silver: game.earned_silver,
        earned_bronze: game.earned_bronze,
        playtime: game.playtime,
        playtime_hours: game.playtimeUnits?.hours ?? "",
        playtime_minutes: game.playtimeUnits?.minutes ?? "",
        lastplayed_utc: game.lastplayed_utc,
        completion_date_utc: game.completion_date_utc,
        badge_type:
          percent >= 100 ? "100completion" : platinum > 0 ? "platinum" : "",
      };
    });
  });
}

const steamRows = getSteamRows();
const exophaseRows = getExophaseRows();

const summaryRows = [
  { metric: "Steam rows", value: steamRows.length },
  {
    metric: "Steam 100%",
    value: steamRows.filter((row) => Number(row.percent || 0) >= 100).length,
  },
  { metric: "Exophase rows", value: exophaseRows.length },
  {
    metric: "Exophase 100%",
    value: exophaseRows.filter((row) => Number(row.percent || 0) >= 100).length,
  },
  {
    metric: "Exophase platinum",
    value: exophaseRows.filter((row) => Number(row.earned_platinum || 0) > 0)
      .length,
  },
];

const steamHeaders = [
  "appid",
  "title",
  "platform",
  "source",
  "earned",
  "total",
  "percent",
  "playtime_hours",
  "playtime_minutes",
  "badge_type",
];

const exophaseHeaders = [
  "source_file",
  "master_id",
  "title",
  "environment",
  "platforms",
  "status",
  "earned_awards",
  "total_awards",
  "percent",
  "earned_platinum",
  "earned_gold",
  "earned_silver",
  "earned_bronze",
  "playtime",
  "playtime_hours",
  "playtime_minutes",
  "lastplayed_utc",
  "completion_date_utc",
  "badge_type",
];

const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>Achievement Data Export</Title>
  </DocumentProperties>
  ${worksheet("Summary", ["metric", "value"], summaryRows)}
  ${worksheet("Steam", steamHeaders, steamRows)}
  ${worksheet("Exophase", exophaseHeaders, exophaseRows)}
</Workbook>
`;

fs.writeFileSync(OUTPUT_FILE, workbook, "utf8");

console.log(`Wrote ${OUTPUT_FILE}`);
console.log(JSON.stringify(summaryRows, null, 2));
