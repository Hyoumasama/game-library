type IgdbGame = {
  id: number;
  name: string;
  summary?: string;
  category?: number;

  cover?: {
    image_id: string;
  };

  genres?: {
    id: number;
    name: string;
  }[];

 involved_companies?: {
  publisher?: boolean;
  developer?: boolean;

  company: {
    name: string;
  };
}[];

  first_release_date?: number;

  screenshots?: {
    id: number;
    image_id: string;
  }[];
};

function cleanIgdbSearchTitle(title: string) {
  return title
  .replace(/\([^)]*\)/g, "")
    .replace(/\+.*$/g, "")
    .replace(/:/g, "")

    // Editions
.replace(/\bGOTY\b/gi, "")
.replace(/\bEdition\b/gi, "")
.replace(/\bComplete\b/gi, "")
.replace(/\bDefinitive\b/gi, "")
.replace(/\bUltimate\b/gi, "")
.replace(/\bDeluxe\b/gi, "")
.replace(/\bGold\b/gi, "")
.replace(/\bSpecial\b/gi, "")
.replace(/\bSpecial Edition\b/gi, "")
.replace(/\bSpecial Edition Steelbook\b/gi, "")
.replace(/\bDigital Deluxe\b/gi, "")
.replace(/\bDigital Deluxe Edition\b/gi, "")
.replace(/\bPremium\b/gi, "")
.replace(/\bPremium Edition\b/gi, "")

    // DLC / Passes
    .replace(/\bExpansion Pass\b/gi, "")
    .replace(/\bSeason Pass\b/gi, "")
    .replace(/\bDLC\b/gi, "")
    .replace(/\bDemo\b/gi, "")

    // Store tags
    .replace(/\bSteam\b/gi, "")
    .replace(/\bEpic\b/gi, "")
    .replace(/\bGOG\b/gi, "")
    .replace(/\bPSN\b/gi, "")
    .replace(/\bXbox\b/gi, "")

    // Add-ons / cosmetics
.replace(/\bSkin\b/gi, "")
.replace(/\bCostume\b/gi, "")
.replace(/\bPack\b/gi, "")
.replace(/\bAdd-on\b/gi, "")
.replace(/\bAddon\b/gi, "")
.replace(/\bMovie\b/gi, "")

    .replace(/\s+/g, " ")
    .trim();
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getIgdbToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing IGDB credentials");
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?${tokenParams.toString()}`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error("Failed to get IGDB token");
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) - 60) * 1000;

  return cachedToken!;
}

export async function getIgdbGame(
  title: string,
  releaseYear?: string
): Promise<IgdbGame | null> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const token = await getIgdbToken();
  const searchTitle = cleanIgdbSearchTitle(title);

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId!,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: `
      search "${searchTitle}";
      fields name,
summary,
genres.name,
cover.image_id,
involved_companies.publisher,
involved_companies.developer,
involved_companies.company.name,
first_release_date,
screenshots.image_id,
category;
limit 10;
    `,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`IGDB Error ${response.status}: ${await response.text()}`);
  }

  const data: IgdbGame[] = await response.json();

  const cleanOriginalTitle = title.trim().toLowerCase();
  const cleanSearchTitle = searchTitle.trim().toLowerCase();

  function getIgdbYear(game: IgdbGame) {
    if (!game.first_release_date) return "";
    return new Date(game.first_release_date * 1000).getFullYear().toString();
  }

  const exactMatches = data.filter(
    (game) => game.name?.trim().toLowerCase() === cleanOriginalTitle
  );

  const cleanMatches = data.filter(
    (game) => game.name?.trim().toLowerCase() === cleanSearchTitle
  );

  const nameMatches = [...exactMatches, ...cleanMatches];

  if (releaseYear) {
    const yearMatch = nameMatches.find(
      (game) => getIgdbYear(game) === releaseYear
    );

    if (yearMatch) return yearMatch;
  }

  function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/:/g, "")
    .replace(/\+.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const blockedResultWords = [
  "dlc",
  "demo",
  "bundle",
  "pack",
  "collection",
  "skin",
  "costume",
  "add-on",
  "addon",
  "season pass",
  "expansion pass",
  "soundtrack",
  "blood and wine",
  "hearts of stone",
  "songs of the past",
];

const safeMatches = data.filter((game) => {
  const name = game.name?.toLowerCase() || "";

  return blockedResultWords.every((word) => !name.includes(word));
});

const baseGames = safeMatches.filter((game) => game.category === 0);

const exactBaseMatch = baseGames.find(
  (game) => normalizeTitle(game.name) === normalizeTitle(searchTitle)
);

if (releaseYear) {
  const yearBaseMatch = baseGames.find(
    (game) => getIgdbYear(game) === releaseYear
  );

  if (yearBaseMatch) return yearBaseMatch;
}

const exactSafeMatch = safeMatches.find(
  (game) => normalizeTitle(game.name) === normalizeTitle(searchTitle)
);

const baseGame = baseGames[0];

return exactBaseMatch || baseGame || exactSafeMatch || safeMatches[0] || null;
}
export function getIgdbCoverUrl(imageId?: string) {
  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
}

export function getIgdbImageUrl(imageId?: string, size = "t_1080p") {
  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}
