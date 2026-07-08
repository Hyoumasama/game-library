import { getHomeGames } from "@/lib/server/homeGames";

export async function GET() {
  try {
    return Response.json(await getHomeGames());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
