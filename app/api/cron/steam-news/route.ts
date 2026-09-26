import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import { CACHE_TAGS } from "@/lib/server/cacheTags";
import { syncSteamNews } from "@/lib/server/steamNews";

export const dynamic = "force-dynamic";
// ~2000 Steam apps at 8 concurrent requests takes roughly a minute.
export const maxDuration = 300;

// Called on a schedule with `Authorization: Bearer $CRON_SECRET` (the header
// Vercel Cron sends), or manually by a logged-in admin.
async function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (
    cronSecret &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  ) {
    return true;
  }

  const cookieStore = await cookies();
  return verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSteamNews();
    revalidateTag(CACHE_TAGS.steamNews, { expire: 0 });

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
