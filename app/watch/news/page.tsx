import AppNav from "@/components/AppNav";
import WatchNewsFeed from "@/components/watch/WatchNewsFeed";
import {
  parseWatchNewsCategories,
  parseWatchNewsGroup,
} from "@/components/watch/watchNewsBadges";
import { getWatchNews } from "@/lib/server/watch/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WatchNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [items, params] = await Promise.all([getWatchNews(), searchParams]);
  const sources = [...new Set(items.map((item) => item.source))];

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
            Anime, TV &amp; Movies
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            News
          </h1>

          <p className="mt-3 text-sm font-medium text-zinc-400 md:text-base">
            {items.length} {items.length === 1 ? "story" : "stories"}
            {sources.length > 0 && <> from {sources.join(" and ")}</>}
          </p>
        </section>

        <WatchNewsFeed
          items={items}
          initialGroup={parseWatchNewsGroup(params.group)}
          initialCategories={parseWatchNewsCategories(params.type)}
          nowIso={new Date().toISOString()}
        />
      </div>
    </main>
  );
}
