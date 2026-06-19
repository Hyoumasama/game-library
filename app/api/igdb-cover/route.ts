import { getIgdbCoverUrl, getIgdbGame } from "@/lib/igdb";
import { getRawgGame } from "@/lib/rawg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const year = searchParams.get("year") || undefined;

  if (!title) {
    return Response.json({ coverUrl: null });
  }

  try {
    const igdbGame = await getIgdbGame(title, year);
    const igdbCoverUrl = getIgdbCoverUrl(igdbGame?.cover?.image_id);

    if (igdbCoverUrl) {
      return Response.json({
  coverUrl: igdbCoverUrl,
  genres: igdbGame?.genres?.map((genre) => genre.name) || [],
});
    }

    const rawgGame = await getRawgGame(title);

    return Response.json({
  coverUrl: rawgGame?.background_image || null,
  genres: [],
});
  } catch {
    return Response.json({ coverUrl: null });
  }
}