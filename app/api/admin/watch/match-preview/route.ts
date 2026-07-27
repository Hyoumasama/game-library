import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { matchWatchTitle } from "@/lib/server/watch/matchWatchTitle";
import type { WatchLocalType } from "@/lib/server/watch/types";
import { WatchSourceError } from "@/lib/server/watch/types";

const allowedTypes = new Set<WatchLocalType>(["Series", "Movie", "OVA"]);

function parseOptionalPositiveInteger(value: string | null, label: string) {
  if (!value) return { value: undefined };

  if (!/^\d+$/.test(value)) {
    return { error: `${label} must be a positive integer` };
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: `${label} must be a positive integer` };
  }

  return { value: parsed };
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return jsonError("Admin authorization required", 401);
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const type = searchParams.get("type")?.trim();
  const seasons = parseOptionalPositiveInteger(
    searchParams.get("seasons"),
    "seasons"
  );
  const episodes = parseOptionalPositiveInteger(
    searchParams.get("episodes"),
    "episodes"
  );

  if (!title) {
    return jsonError("title is required", 400);
  }

  if (title.length > 200) {
    return jsonError("title is too long", 400);
  }

  if (type && !allowedTypes.has(type as WatchLocalType)) {
    return jsonError("type must be Series, Movie, or OVA", 400);
  }

  if (seasons.error) return jsonError(seasons.error, 400);
  if (episodes.error) return jsonError(episodes.error, 400);

  try {
    const preview = await matchWatchTitle({
      title,
      localType: type as WatchLocalType | undefined,
      localSeasons: seasons.value,
      localEpisodes: episodes.value,
    });

    return Response.json(preview);
  } catch (error) {
    if (error instanceof WatchSourceError) {
      if (error.status === 429) {
        return Response.json(
          { error: `${error.source} rate limit reached` },
          {
            status: 429,
            headers: error.retryAfter
              ? { "Retry-After": error.retryAfter }
              : undefined,
          }
        );
      }

      if (error.status === 401 || error.status === 403) {
        return jsonError(`${error.source} authorization failed`, 500);
      }

      return jsonError(`${error.source} lookup failed`, 500);
    }

    console.error("Watch match preview failed:", error);

    return jsonError("Watch match preview failed", 500);
  }
}
