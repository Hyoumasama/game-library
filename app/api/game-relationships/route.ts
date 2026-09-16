import {
  canonicalIdForCopy,
  getRelationshipDetail,
} from "@/lib/server/relationships/data";
import { uuid } from "@/lib/relationships/validation";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    let id = url.searchParams.get("canonical");
    const gameId = Number(url.searchParams.get("game"));
    if (!id) {
      if (!Number.isSafeInteger(gameId) || gameId < 1)
        return Response.json({ error: "Invalid game ID" }, { status: 400 });
      id = (await canonicalIdForCopy(gameId)) || null;
    }
    if (!id) return Response.json({ detail: null });
    const detail = await getRelationshipDetail(uuid(id));
    return Response.json({ detail });
  } catch (error) {
    console.error(
      "Relationship details:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "Could not load relationships. Try again later." },
      { status: 500 },
    );
  }
}
