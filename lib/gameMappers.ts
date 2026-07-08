import type {
  AchievementBadge,
  DbGame,
  GameAchievementRelation,
  UiGame,
} from "./gameTypes";

export function getBestCover(game: DbGame) {
  return game.steam_vertical_cover || game.cover_url || null;
}

export function getAchievementBadge(
  achievements: GameAchievementRelation
): AchievementBadge {
  const achievement = Array.isArray(achievements)
    ? achievements[0]
    : achievements;

  if (Number(achievement?.completion_percentage || 0) >= 100) {
    return "100completion";
  }

  if (Number(achievement?.platinum || 0) > 0) {
    return "platinum";
  }

  return null;
}

export function mapDbGameToUiGame(game: DbGame): UiGame {
  const { game_achievements: gameAchievements, ...cleanGame } = game;

  return {
    ...cleanGame,
    Title: game.title || "",
    Store: game.store,
    Platform: game.platform,
    Hardware: game.hardware,
    "Hardware (1)": game.hardware,
    Genre: game.genre,
    genres: game.genres || [],
    Score: game.score,
    Status: game.status,
    Price: game.price,
    "Hours Played": game.hours_played,
    Release: game.release,
    "Date of Purchase": game.date_of_purchase,
    "Completion Last Played": game.completion_last_played,
    "Completion / Last Played": game.completion_last_played,
    Cover: getBestCover(game),
    "Wide Cover": game.wide_cover_url,
    achievement_badge: getAchievementBadge(gameAchievements),
  };
}

export function stripGameAchievements(game: DbGame) {
  return Object.fromEntries(
    Object.entries(game).filter(([key]) => key !== "game_achievements")
  ) as Omit<DbGame, "game_achievements">;
}
