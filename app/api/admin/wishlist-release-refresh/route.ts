import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { getIgdbToken } from "@/lib/igdb";
import { supabase } from "@/lib/supabase";
import { CACHE_TAGS } from "@/lib/server/cacheTags";

type LocalWishlistGame = {
  id: number | string;
  title: string | null;
  release: string | null;
  igdb_id: number | string | null;
};

type IgdbReleaseGame = {
  id?: number;
  first_release_date?: number;
};

function toReleaseDate(value?: number) {
  if (!value) return null;

  return new Date(value * 1000).toISOString().slice(0, 10);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function POST() {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: wishlistGames, error } = await supabase
      .from("games")
      .select("id, title, release, igdb_id")
      .eq("status", "Wishlist")
      .not("igdb_id", "is", null)
      .order("title", { ascending: true })
      .limit(500);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const games = (wishlistGames || []) as LocalWishlistGame[];
    const token = await getIgdbToken();
    let updated = 0;
    let unchanged = 0;
    let stillTba = 0;
    const errors: string[] = [];

    for (const batch of chunk(games, 100)) {
      const ids = batch
        .map((game) => Number(game.igdb_id))
        .filter((id) => Number.isFinite(id));

      if (ids.length === 0) continue;

      const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": process.env.IGDB_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: `
          fields first_release_date;
          where id = (${ids.join(",")});
          limit ${ids.length};
        `,
        cache: "no-store",
      });

      if (!igdbResponse.ok) {
        throw new Error(
          `IGDB release refresh failed with status ${igdbResponse.status}: ${await igdbResponse.text()}`
        );
      }

      const igdbGames = (await igdbResponse.json()) as IgdbReleaseGame[];
      const releasesById = new Map(
        igdbGames.map((game) => [Number(game.id), toReleaseDate(game.first_release_date)])
      );

      for (const game of batch) {
        const nextRelease = releasesById.get(Number(game.igdb_id)) ?? null;
        const currentRelease = game.release
          ? String(game.release).slice(0, 10)
          : null;

        if (!nextRelease) {
          stillTba++;
          continue;
        }

        if (nextRelease === currentRelease) {
          unchanged++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("games")
          .update({ release: nextRelease })
          .eq("id", game.id);

        if (updateError) {
          errors.push(`${game.title || game.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    }

    // release drives the wishlist calendar's dates/countdowns on the home
    // page, and this route is what HomePageClient's refresh button calls
    // right before re-fetching /api/home-games - so this needs
    // { expire: 0 } (immediate), not "max" (stale-while-revalidate), or
    // the refresh button would appear to do nothing on the first click.
    revalidateTag(CACHE_TAGS.homeGames, { expire: 0 });

    return Response.json({
      message: "Wishlist release dates refreshed",
      processed: games.length,
      updated,
      unchanged,
      stillTba,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("Wishlist release refresh failed:", error);

    return Response.json({ error: message }, { status: 500 });
  }
}
