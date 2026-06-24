import csv
import json
import time
import requests
from datetime import datetime, timezone
from pathlib import Path

PLAYER_ID = "151067"
OUTPUT_JSON = "exophase_all_games.json"
OUTPUT_CSV = "achievements_import.csv"

base_dir = Path(__file__).resolve().parent
json_path = base_dir / OUTPUT_JSON
csv_path = base_dir / OUTPUT_CSV

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Referer": "https://www.exophase.com/",
}

all_games = []
page = 1

while True:
    url = f"https://api.exophase.com/public/player/{PLAYER_ID}/games?page={page}&environment=&sort=1&showHidden=0"

    print(f"Loading page {page}...")

    response = requests.get(url, headers=headers, timeout=20)

    if response.status_code == 403:
        print("403 Forbidden. Exophase blocked this request.")
        break

    response.raise_for_status()
    data = response.json()

    games = data.get("games", [])

    if not games:
        print("No more games.")
        break

    all_games.extend(games)
    print(f"Loaded {len(games)} games from page {page}. Total: {len(all_games)}")

    page += 1
    time.sleep(1)

with open(json_path, "w", encoding="utf-8") as f:
    json.dump({"success": True, "games": all_games}, f, ensure_ascii=False, indent=2)

rows = []

for game in all_games:
    meta = game.get("meta") or {}
    title = meta.get("title", "")

    platforms = meta.get("platforms") or []
    platform_names = [
        platform.get("name", "")
        for platform in platforms
        if isinstance(platform, dict)
    ]

    last_played = ""
    ts = game.get("lastplayed_utc")
    if ts:
        last_played = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")

    playtime_units = game.get("playtimeUnits") or {}
    playtime_hours = playtime_units.get("hours", 0) or 0
    playtime_minutes = playtime_units.get("minutes", 0) or 0

    rows.append({
        "title": title,
        "platform": ", ".join(platform_names),
        "source": meta.get("environment_slug", ""),
        "earned": game.get("earned_awards", 0) or 0,
        "total": game.get("total_awards", 0) or 0,
        "percent": game.get("percent", 0) or 0,
        "platinum": game.get("earned_platinum", 0) or 0,
        "gold": game.get("earned_gold", 0) or 0,
        "silver": game.get("earned_silver", 0) or 0,
        "bronze": game.get("earned_bronze", 0) or 0,
        "gamerscore": game.get("earned_points", 0) or 0,
        "playtime": game.get("playtime", ""),
        "playtime_hours": playtime_hours,
        "playtime_minutes": playtime_minutes,
        "last_played": last_played,
    })

with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "title",
        "platform",
        "source",
        "earned",
        "total",
        "percent",
        "platinum",
        "gold",
        "silver",
        "bronze",
        "gamerscore",
        "playtime",
        "playtime_hours",
        "playtime_minutes",
        "last_played",
    ])
    writer.writeheader()
    writer.writerows(rows)

print("")
print(f"Done. Exported {len(rows)} games.")
print(f"JSON: {json_path}")
print(f"CSV: {csv_path}")