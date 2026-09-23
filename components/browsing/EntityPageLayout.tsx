// Shared shell for /franchise/[slug], /developer/[slug], /publisher/[slug].
// Header block reuses the exact hero-panel classes from the All Games page
// (components/AllGamesClient.tsx) so these new browsing pages don't
// introduce a new visual pattern.
import AppNav from "@/components/AppNav";
import GameCardGrid from "@/components/games/GameCardGrid";
import type { BrowsingEntityPageData } from "@/lib/server/browsingEntities";

const ENTITY_LABELS: Record<BrowsingEntityPageData["kind"], string> = {
  franchise: "Franchise",
  developer: "Developer",
  publisher: "Publisher",
};

export default function EntityPageLayout({
  data,
}: {
  data: BrowsingEntityPageData;
}) {
  const label = ENTITY_LABELS[data.kind];
  const count = data.games.length;

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
            {label}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            {data.name}
          </h1>

          <p className="mt-3 text-sm font-medium text-zinc-400 md:text-base">
            {count} {count === 1 ? "game" : "games"} in your library
          </p>
        </section>

        {count > 0 ? (
          <GameCardGrid games={data.games} />
        ) : (
          <p className="text-sm font-medium text-zinc-500">
            No games linked to this {label.toLowerCase()} are in your library yet.
          </p>
        )}
      </div>
    </main>
  );
}
