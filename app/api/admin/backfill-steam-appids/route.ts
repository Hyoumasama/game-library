import { getIgdbToken } from "@/lib/igdb";
import { supabase } from "@/lib/supabase";

type LocalGame = {
  id: number;
  title: string | null;
  igdb_id: number | string;
};

type IgdbExternalGameSource = {
  id?: number;
  name?: string;
};

type IgdbExternalGame = {
  game?: number;
  uid?: string;
  external_game_source?: number;
  name?: string;
  url?: string;
};

type SteamCandidate = {
  steamAppId: number;
  uid: string;
  name: string | null;
  url: string | null;
};

async function throwIgdbResponseError(response: Response, context: string) {
  const body = await response.text();

  console.error(`${context}:`, {
    status: response.status,
    body,
  });

  throw new Error(`${context} with status ${response.status}`);
}

function clampLimit(value: string | null) {
  const parsed = Number(value || 50);

  if (!Number.isFinite(parsed)) return 50;

  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

function validateSteamAppId(uid?: string) {
  if (!uid || !/^\d+$/.test(uid)) return null;

  const appId = Number(uid);

  return Number.isSafeInteger(appId) && appId > 0 ? appId : null;
}

function hasExactSteamStoreUrl(candidate: SteamCandidate) {
  return new RegExp(`/app/${candidate.steamAppId}(?:/|$)`, "i").test(
    candidate.url || ""
  );
}

function uniqueCandidates(candidates: SteamCandidate[]) {
  const byAppId = new Map<number, SteamCandidate>();

  for (const candidate of candidates) {
    if (!byAppId.has(candidate.steamAppId)) {
      byAppId.set(candidate.steamAppId, candidate);
    }
  }

  return [...byAppId.values()];
}

function chooseSteamCandidate(candidates: SteamCandidate[]) {
  const unique = uniqueCandidates(candidates);

  if (unique.length === 1) {
    return { candidate: unique[0], ambiguous: false };
  }

  const exactUrlCandidates = uniqueCandidates(
    unique.filter(hasExactSteamStoreUrl)
  );

  if (exactUrlCandidates.length === 1) {
    return { candidate: exactUrlCandidates[0], ambiguous: false };
  }

  return { candidate: null, ambiguous: unique.length > 0 };
}

async function resolveSteamExternalGameSourceId(clientId: string, token: string) {
  const response = await fetch(
    "https://api.igdb.com/v4/external_game_sources",
    {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: `
        fields id,name;
        limit 500;
      `,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    await throwIgdbResponseError(response, "IGDB external_game_sources failed");
  }

  const sources = (await response.json()) as IgdbExternalGameSource[];

  if (!Array.isArray(sources)) {
    throw new Error("Malformed IGDB external_game_sources response");
  }

  const steamSource = sources.find(
    (source) => source.name?.trim().toLowerCase() === "steam"
  );

  if (!steamSource?.id) {
    throw new Error("Steam external_game_source not found");
  }

  return steamSource.id;
}

async function countRemaining() {
  const { count, error } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .not("igdb_id", "is", null)
    .is("steam_appid", null)
    .is("steam_lookup_status", null);

  if (error) {
    throw new Error(`Failed to count remaining games: ${error.message}`);
  }

  return count || 0;
}

async function markLookupFailed(game: LocalGame, error: string) {
  const { error: markError } = await supabase
    .from("games")
    .update({
      steam_lookup_status: "failed",
      steam_lookup_checked_at: new Date().toISOString(),
    })
    .eq("id", game.id)
    .is("steam_appid", null)
    .is("steam_lookup_status", null);

  if (markError) {
    console.error("Failed to mark Steam lookup failure:", {
      gameId: game.id,
      error: markError.message,
    });
  }

  return {
    id: game.id,
    title: game.title,
    error,
  };
}

export async function POST(request: Request) {
  const limit = clampLimit(new URL(request.url).searchParams.get("limit"));

  try {
    const clientId = process.env.IGDB_CLIENT_ID;

    if (!clientId) {
      throw new Error("Missing IGDB credentials");
    }

    const { data: localGames, error: gamesError } = await supabase
      .from("games")
      .select("id,title,igdb_id")
      .not("igdb_id", "is", null)
      .is("steam_appid", null)
      .is("steam_lookup_status", null)
      .order("id", { ascending: true })
      .limit(limit);

    if (gamesError) {
      throw new Error(`Failed to query games: ${gamesError.message}`);
    }

    if (!localGames || localGames.length === 0) {
      return Response.json({
        success: true,
        processed: 0,
        updated: 0,
        notFound: 0,
        remaining: 0,
        message: "No games remaining",
      });
    }

    const token = await getIgdbToken();
    const steamSourceId = await resolveSteamExternalGameSourceId(
      clientId,
      token
    );
    const igdbIds = localGames.map((game) => Number(game.igdb_id));

    const igdbResponse = await fetch(
      "https://api.igdb.com/v4/external_games",
      {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: `
          fields game,uid,external_game_source,name,url;
          where game = (${igdbIds.join(",")}) & external_game_source = ${steamSourceId};
          limit ${Math.min(500, Math.max(50, igdbIds.length * 10))};
        `,
        cache: "no-store",
      }
    );

    if (!igdbResponse.ok) {
      await throwIgdbResponseError(igdbResponse, "IGDB external_games failed");
    }

    const externalGames = (await igdbResponse.json()) as IgdbExternalGame[];

    if (!Array.isArray(externalGames)) {
      throw new Error("Malformed IGDB external_games response");
    }

    const candidatesByIgdbId = new Map<number, SteamCandidate[]>();

    for (const externalGame of externalGames) {
      if (externalGame.external_game_source !== steamSourceId) continue;

      const steamAppId = validateSteamAppId(externalGame.uid);

      if (!steamAppId || !externalGame.game) continue;

      const candidates = candidatesByIgdbId.get(externalGame.game) || [];
      candidates.push({
        steamAppId,
        uid: externalGame.uid!,
        name: externalGame.name || null,
        url: externalGame.url || null,
      });
      candidatesByIgdbId.set(externalGame.game, candidates);
    }

    const updatedGames: {
      id: number;
      title: string | null;
      igdbId: number;
      steamAppId: number;
      status: string;
    }[] = [];
    const notFoundGames: {
      id: number;
      title: string | null;
      igdbId: number;
      status: string;
    }[] = [];
    const ambiguousGames: {
      id: number;
      title: string | null;
      igdbId: number;
      candidates: SteamCandidate[];
      status: string;
    }[] = [];
    const failures: { id: number; title: string | null; error: string }[] = [];

    for (const game of localGames as LocalGame[]) {
      const igdbId = Number(game.igdb_id);
      const candidates = candidatesByIgdbId.get(igdbId) || [];
      const { candidate, ambiguous } = chooseSteamCandidate(candidates);

      if (!candidate) {
        if (ambiguous) {
          const { data: ambiguousRows, error: ambiguousError } = await supabase
            .from("games")
            .update({
              steam_lookup_status: "ambiguous",
              steam_lookup_checked_at: new Date().toISOString(),
            })
            .eq("id", game.id)
            .is("steam_appid", null)
            .is("steam_lookup_status", null)
            .select("id");

          if (ambiguousError) {
            failures.push(
              await markLookupFailed(game, ambiguousError.message)
            );
            continue;
          }

          if (!ambiguousRows || ambiguousRows.length === 0) {
            failures.push(await markLookupFailed(game, "No row updated"));
            continue;
          }

          ambiguousGames.push({
            id: game.id,
            title: game.title,
            igdbId,
            candidates,
            status: "ambiguous",
          });
        } else {
          const { data: notFoundRows, error: notFoundError } = await supabase
            .from("games")
            .update({
              steam_lookup_status: "not_found",
              steam_lookup_checked_at: new Date().toISOString(),
            })
            .eq("id", game.id)
            .is("steam_appid", null)
            .is("steam_lookup_status", null)
            .select("id");

          if (notFoundError) {
            failures.push(await markLookupFailed(game, notFoundError.message));
            continue;
          }

          if (!notFoundRows || notFoundRows.length === 0) {
            failures.push(await markLookupFailed(game, "No row updated"));
            continue;
          }

          notFoundGames.push({
            id: game.id,
            title: game.title,
            igdbId,
            status: "not_found",
          });
        }

        continue;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from("games")
        .update({
          steam_appid: candidate.steamAppId,
          steam_lookup_status: "matched",
          steam_lookup_checked_at: new Date().toISOString(),
        })
        .eq("id", game.id)
        .is("steam_appid", null)
        .is("steam_lookup_status", null)
        .select("id");

      if (updateError) {
        failures.push(await markLookupFailed(game, updateError.message));
        continue;
      }

      if (!updatedRows || updatedRows.length === 0) {
        failures.push(await markLookupFailed(game, "No row updated"));
        continue;
      }

      updatedGames.push({
        id: game.id,
        title: game.title,
        igdbId,
        steamAppId: candidate.steamAppId,
        status: "matched",
      });
    }

    return Response.json({
      success: true,
      processed: localGames.length,
      updated: updatedGames.length,
      notFound: notFoundGames.length,
      ambiguous: ambiguousGames.length,
      failed: failures.length,
      remaining: await countRemaining(),
      updatedGames,
      notFoundGames,
      ambiguousGames,
      failures,
    });
  } catch (error) {
    console.error("Steam App ID backfill failed:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Steam App ID backfill failed",
      },
      { status: 500 }
    );
  }
}
