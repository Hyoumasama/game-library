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

    .replace(/\s+/g, " ")
    .trim();
}

async function getIgdbToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  const data = await response.json();

  return data.access_token;
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

const safeMatches = data.filter((game) => {
  const name = game.name?.toLowerCase() || "";

  return (
    !name.includes("+") &&
    !name.includes("bundle") &&
    !name.includes("pack") &&
    !name.includes("collection") &&
    !name.includes("blood and wine") &&
    !name.includes("hearts of stone") &&
    !name.includes("songs of the past")
  );
});

const exactSafeMatch = safeMatches.find(
  (game) => normalizeTitle(game.name) === normalizeTitle(searchTitle)
);

const baseGame = safeMatches.find((game) => game.category === 0);

return exactSafeMatch || baseGame || safeMatches[0] || nameMatches[0] || data?.[0] || null;
}

export function getIgdbCoverUrl(imageId?: string) {
  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
}

export function getIgdbImageUrl(imageId?: string, size = "t_1080p") {
  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}