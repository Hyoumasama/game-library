import csv
import requests
from pathlib import Path

STEAM_API_KEY = "27BBE2EFA63553EB74650DD08661CA7F"
STEAM_ID = "76561198849184945"

OUTPUT_FILE = "steam_achievements_import.csv"

base_dir = Path(__file__).resolve().parent
output_path = base_dir / OUTPUT_FILE

owned_url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"

owned_response = requests.get(owned_url, params={
    "key": STEAM_API_KEY,
    "steamid": STEAM_ID,
    "include_appinfo": 1,
    "include_played_free_games": 1,
}, timeout=30)

owned_response.raise_for_status()
owned_data = owned_response.json()

games = owned_data.get("response", {}).get("games", [])

rows = []

for game in games:
    appid = game.get("appid")
    title = game.get("name", "")
    playtime_minutes = game.get("playtime_forever", 0) or 0
    playtime_hours = round(playtime_minutes / 60, 2)

    earned = 0
    total = 0
    percent = 0

    try:
        schema_response = requests.get(
            "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
            params={
                "key": STEAM_API_KEY,
                "appid": appid,
            },
            timeout=15,
        )

        schema_data = schema_response.json()
        achievements_schema = (
            schema_data
            .get("game", {})
            .get("availableGameStats", {})
            .get("achievements", [])
        )

        total = len(achievements_schema)

        player_response = requests.get(
            "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
            params={
                "key": STEAM_API_KEY,
                "steamid": STEAM_ID,
                "appid": appid,
            },
            timeout=15,
        )

        player_data = player_response.json()
        achievements = player_data.get("playerstats", {}).get("achievements", [])

        earned = sum(1 for achievement in achievements if achievement.get("achieved") == 1)

        if total > 0:
            percent = round((earned / total) * 100, 2)

    except Exception:
        pass

    rows.append({
        "appid": appid,
        "title": title,
        "platform": "Steam",
        "source": "steam",
        "earned": earned,
        "total": total,
        "percent": percent,
        "playtime_hours": playtime_hours,
        "playtime_minutes": playtime_minutes,
    })

    print(f"{title}: {earned}/{total} - {playtime_hours}h")

with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "appid",
        "title",
        "platform",
        "source",
        "earned",
        "total",
        "percent",
        "playtime_hours",
        "playtime_minutes",
    ])
    writer.writeheader()
    writer.writerows(rows)

print("")
print(f"Done. Exported {len(rows)} Steam games to {output_path}")