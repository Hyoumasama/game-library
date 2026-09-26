import GameSteamNewsView from "@/components/games/GameSteamNewsView";
import { SkeletonBlock } from "@/components/skeletons/Skeleton";
import { getGameNews } from "@/lib/server/gameSteamNews";

// Rendered inside <Suspense> on the game page, so the page never waits on
// Steam; the section streams in when the news arrives.
export default async function GameSteamNews({
  appid,
  fallbackImage,
}: {
  appid: number;
  fallbackImage: string | null;
}) {
  const news = await getGameNews(appid).catch((error) => {
    console.error("GAME NEWS ERROR:", error);
    return null;
  });

  if (!news || news.featured.length === 0) return null;

  return (
    <GameSteamNewsView
      appid={appid}
      featured={news.featured}
      initialList={news.list}
      initialNextBefore={news.nextBefore}
      fallbackImage={fallbackImage}
    />
  );
}

export function GameSteamNewsSkeleton() {
  return (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 lg:p-6">
      <SkeletonBlock className="mb-4 h-7 w-40 rounded" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="aspect-video rounded-xl" />
        ))}
      </div>
    </section>
  );
}
