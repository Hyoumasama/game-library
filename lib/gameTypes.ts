export type AchievementBadge = "100completion" | "platinum" | null;

export type GameAchievement = {
  platinum?: boolean | number | string | null;
  completion_percentage?: number | string | null;
};

export type GameAchievementRelation =
  | GameAchievement
  | GameAchievement[]
  | null
  | undefined;

export type DbGame = {
  id?: number | string;
  slug?: string | null;
  title?: string | null;
  release?: string | null;
  date_started?: string | null;
  date_of_purchase?: string | null;
  completion_last_played?: string | null;
  score?: string | number | null;
  price?: string | number | null;
  hours_played?: string | number | null;
  status?: string | null;
  store?: string | null;
  platform?: string | null;
  hardware?: string | null;
  genre?: string | null;
  genres?: string[] | null;
  cover_url?: string | null;
  hero_url?: string | null;
  wide_cover_url?: string | null;
  steam_vertical_cover?: string | null;
  summary?: string | null;
  developer?: string | null;
  publisher?: string | null;
  igdb_id?: number | null;
  steam_appid?: number | null;
  screenshots?: string | null;
  game_achievements?: GameAchievementRelation;
};

export type UiGame = Omit<DbGame, "game_achievements"> & {
  Title: string;
  Store?: string | null;
  Platform?: string | null;
  Hardware?: string | null;
  "Hardware (1)"?: string | null;
  Genre?: string | null;
  Score?: string | number | null;
  Status?: string | null;
  Price?: string | number | null;
  "Hours Played"?: string | number | null;
  Release?: string | null;
  "Date of Purchase"?: string | null;
  "Completion Last Played"?: string | null;
  "Completion / Last Played"?: string | null;
  Cover?: string | null;
  "Wide Cover"?: string | null;
  achievement_badge?: AchievementBadge;
  home_tag?: "Upcoming" | "Available Now";
};
