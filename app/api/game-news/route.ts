import { getGameNewsPage } from "@/lib/server/gameSteamNews";

// "Load more" for the Steam news list on the game detail page.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appid = Number(searchParams.get("appid"));
  const before = Number(searchParams.get("before"));

  if (!Number.isInteger(appid) || appid <= 0 || !Number.isInteger(before) || before <= 0) {
    return Response.json({ error: "appid and before are required" }, { status: 400 });
  }

  try {
    return Response.json(await getGameNewsPage(appid, before));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
