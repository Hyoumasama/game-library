import {
  GameCardSkeleton,
  NavBarSkeleton,
  SkeletonBlock,
} from "@/components/skeletons/Skeleton";

// Shared loading.tsx fallback for /franchise/[slug], /developer/[slug],
// /publisher/[slug] - mirrors app/all-games/loading.tsx's header + grid
// skeleton shape (see AGENTS.md/browsing-upgrade: every route here is
// force-dynamic, so this shows while the server-rendered page is in flight).
export default function EntityPageSkeleton() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <NavBarSkeleton />

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-12 w-72 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-48" />
        </section>

        <section className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[50px] rounded-2xl" />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <GameCardSkeleton key={index} fixedWidth={false} />
          ))}
        </div>
      </div>
    </main>
  );
}
