import AppNav from "@/components/AppNav";
import SteamNewsFeed from "@/components/SteamNewsFeed";
import { parseNewsFilters } from "@/lib/newsFilters";
import { getSteamNewsFeed, STEAM_NEWS_RETENTION_DAYS } from "@/lib/server/steamNews";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [items, params] = await Promise.all([getSteamNewsFeed(), searchParams]);
  const gameCount = new Set(items.map((item) => item.gameId)).size;

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
            Steam
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            News &amp; Updates
          </h1>

          <p className="mt-3 text-sm font-medium text-zinc-400 md:text-base">
            {items.length} {items.length === 1 ? "post" : "posts"} from{" "}
            {gameCount} {gameCount === 1 ? "game" : "games"} in your library,
            last {STEAM_NEWS_RETENTION_DAYS} days
          </p>
        </section>

        <SteamNewsFeed
          items={items}
          initialFilters={parseNewsFilters(params)}
          nowIso={new Date().toISOString()}
        />
      </div>
    </main>
  );
}
