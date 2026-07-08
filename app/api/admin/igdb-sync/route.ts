import { supabase } from "@/lib/supabase";

type IgdbWebsite = { url?: string };
type IgdbSyncGame = {
  id?: number;
  rating?: number | null;
  rating_count?: number | null;
  websites?: IgdbWebsite[];
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getIgdbToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST", cache: "no-store" }
  );

  const data = await response.json();

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) - 60) * 1000;

  return cachedToken;
}

function extractSteamAppId(url?: string | null) {
  if (!url) return null;
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/i);
  return match?.[1] ?? null;
}

export async function GET() {
  const batchSize = 100;
  const maxBatches = 25;

  let processed = 0;
  let updated = 0;
  let steamFound = 0;
  let noRating = 0;
  const errors: string[] = [];

  const token = await getIgdbToken();

  for (let batch = 0; batch < maxBatches; batch++) {
    const { data: localGames, error } = await supabase
      .from("games")
      .select("id, title, igdb_id")
      .not("igdb_id", "is", null)
      .is("igdb_score_updated_at", null)
      .limit(batchSize);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!localGames || localGames.length === 0) break;

    const ids = localGames.map((game) => game.igdb_id).filter(Boolean);

    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: `
        fields
          rating,
          rating_count,
          websites.url;
        where id = (${ids.join(",")});
        limit ${ids.length};
      `,
      cache: "no-store",
    });

    const igdbGames = (await igdbResponse.json()) as IgdbSyncGame[];

    if (!Array.isArray(igdbGames)) {
      return Response.json(
        { error: "Invalid IGDB response", details: igdbGames },
        { status: 500 }
      );
    }

    for (const localGame of localGames) {
      processed++;

      const igdbGame = igdbGames.find(
        (game) => Number(game.id) === Number(localGame.igdb_id)
      );

      if (!igdbGame) {
        errors.push(`${localGame.title}: IGDB not found`);
        continue;
      }

      const steamUrl =
        igdbGame.websites
          ?.map((site) => site.url)
          ?.find((url): url is string =>
            Boolean(url?.includes("store.steampowered.com/app/"))
          ) ?? null;

      const steamAppId = extractSteamAppId(steamUrl);

      if (steamAppId) steamFound++;
      if (igdbGame.rating == null) noRating++;

      const updatePayload: Record<string, string | number | null> = {
        igdb_score: igdbGame.rating ?? null,
        igdb_rating_count: igdbGame.rating_count ?? null,
        igdb_score_updated_at: new Date().toISOString(),
      };

      if (steamAppId) {
        updatePayload.steam_appid = steamAppId;
      }

      const { error: updateError } = await supabase
        .from("games")
        .update(updatePayload)
        .eq("id", localGame.id);

      if (updateError) {
        errors.push(`${localGame.title}: ${updateError.message}`);
      } else {
        updated++;
      }
    }
  }

  return Response.json({
    message: "IGDB sync completed",
    processed,
    updated,
    steamFound,
    noRating,
    errors,
  });
}
