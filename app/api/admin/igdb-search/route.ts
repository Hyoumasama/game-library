import { getIgdbCoverUrl } from "@/lib/igdb";

type IgdbImage = { image_id?: string };
type IgdbGenre = { name?: string };
type IgdbCompany = {
  developer?: boolean;
  publisher?: boolean;
  company?: { name?: string };
};
type IgdbWebsite = { url?: string };
type IgdbGame = {
  id?: number;
  name?: string;
  first_release_date?: number;
  cover?: IgdbImage;
  artworks?: IgdbImage[];
  screenshots?: IgdbImage[];
  summary?: string;
  genres?: IgdbGenre[];
  involved_companies?: IgdbCompany[];
  websites?: IgdbWebsite[];
};

let cachedToken: string | null = null;
let cachedTokenClientId: string | null = null;
let tokenExpiresAt = 0;

function escapeIgdbString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function parsePositiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractSteamAppId(websites?: IgdbWebsite[]) {
  const steamUrl = websites
    ?.map((site) => site.url)
    .find((url): url is string =>
      Boolean(url?.includes("store.steampowered.com/app/"))
    );

  const match = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/i);
  const appId = Number(match?.[1]);

  return Number.isFinite(appId) ? appId : null;
}

async function getIgdbToken(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing IGDB credentials");
  }

  if (
    cachedToken &&
    cachedTokenClientId === clientId &&
    Date.now() < tokenExpiresAt
  ) {
    return cachedToken;
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
  cachedTokenClientId = clientId;

  tokenExpiresAt =
    Date.now() + (Number(data.expires_in) - 60) * 1000;

  return cachedToken!;
}

function clearIgdbTokenCache() {
  cachedToken = null;
  cachedTokenClientId = null;
  tokenExpiresAt = 0;
}

async function fetchIgdbGames(body: string, clientId: string, token: string) {
  return fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
}

const igdbGameFields = `
  name,
  first_release_date,
  cover.image_id,
  summary,
  genres.name,
  artworks.image_id,
  screenshots.image_id,
  involved_companies.company.name,
  involved_companies.developer,
  involved_companies.publisher,
  websites.url
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return Response.json({ results: [] });
  }

  try {
    const clientId = process.env.IGDB_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing IGDB credentials");
    }

    let token = await getIgdbToken();
    const safeQuery = escapeIgdbString(query);
    const igdbId = parsePositiveInteger(query);
    const searchBody = igdbId
      ? `
      fields ${igdbGameFields};
      where id = ${igdbId};
      limit 1;
    `
      : `
      search "${safeQuery}";
      fields ${igdbGameFields};
      limit 15;
    `;

    let response = await fetchIgdbGames(searchBody, clientId, token);

    if (response.status === 401) {
      clearIgdbTokenCache();
      token = await getIgdbToken();
      response = await fetchIgdbGames(searchBody, clientId, token);
    }

    if (!response.ok) {
      throw new Error(
        `IGDB search failed with status ${response.status}: ${await response.text()}`
      );
    }

    const games = (await response.json()) as IgdbGame[];
    let finalGames = games;

    if (!Array.isArray(games)) {
      throw new Error("Invalid IGDB search response");
    }

    if (!igdbId && games.length === 0) {
      const exactBody = `
        fields ${igdbGameFields};
        where name = "${safeQuery}";
        limit 15;
      `;

      let exactResponse = await fetchIgdbGames(exactBody, clientId, token);

      if (exactResponse.status === 401) {
        clearIgdbTokenCache();
        token = await getIgdbToken();
        exactResponse = await fetchIgdbGames(exactBody, clientId, token);
      }

      if (!exactResponse.ok) {
        throw new Error(
          `IGDB exact search failed with status ${exactResponse.status}: ${await exactResponse.text()}`
        );
      }

      finalGames = (await exactResponse.json()) as IgdbGame[];

      if (!Array.isArray(finalGames)) {
        throw new Error("Invalid IGDB exact search response");
      }
    }

    const results = finalGames.map((game: IgdbGame) => ({
    source: "igdb" as const,
    igdbId: game.id,
    steamAppId: extractSteamAppId(game.websites),
    title: game.name,
    year: game.first_release_date
  ? new Date(game.first_release_date * 1000).getFullYear()
  : null,

releaseDate: game.first_release_date
  ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
  : "",
    coverUrl: getIgdbCoverUrl(game.cover?.image_id),

heroUrl:
  game.artworks?.[0]?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.artworks[0].image_id}.jpg`
    : game.screenshots?.[0]?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.screenshots[0].image_id}.jpg`
    : null,

summary: game.summary || "",

genre:
  game.genres?.map((genre) => genre.name).join(", ") || null,

screenshots:
  game.screenshots
    ?.slice(0, 8)
    .map(
      (screenshot) =>
        `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`
    )
    .join(",") || null,

developer:
  game.involved_companies?.find((company) => company.developer)?.company?.name ||
  null,

publisher:
  game.involved_companies?.find((company) => company.publisher)?.company?.name ||
  null,
  }));

    return Response.json({ results });
  } catch (error) {
    console.error("IGDB search error:", error);

    return Response.json(
      { results: [], error: "IGDB search failed" },
      { status: 500 }
    );
  }
}
