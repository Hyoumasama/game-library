import {
  findHltbTimes,
  getHltbTimesById,
  HltbRateLimitError,
  parseHltbId,
} from "@/lib/server/hltb";

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// ?title=...&year=... searches HLTB by title; ?link=... (an HLTB game URL
// or id) reads that exact game instead.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link")?.trim();
  const title = searchParams.get("title")?.trim();

  try {
    if (link) {
      const hltbId = parseHltbId(link);

      if (!hltbId) {
        return Response.json(
          { error: "Paste a howlongtobeat.com/game/... link or a game id" },
          { status: 400 }
        );
      }

      return Response.json({ result: await getHltbTimesById(hltbId) });
    }

    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const result = await findHltbTimes({
      title,
      year: parsePositiveInteger(searchParams.get("year")),
    });

    return Response.json({ result });
  } catch (error) {
    if (error instanceof HltbRateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    const message = error instanceof Error ? error.message : "HLTB lookup failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
