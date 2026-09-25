import { findMetacriticScore } from "@/lib/server/metacritic";

function parsePositiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const result = await findMetacriticScore({
    title,
    year: parsePositiveInteger(searchParams.get("year")),
    steamAppId: parsePositiveInteger(searchParams.get("steamAppId")),
  });

  return Response.json({ result });
}
