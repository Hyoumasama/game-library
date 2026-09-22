import {
  GameCardSkeleton,
  NavBarSkeleton,
  SkeletonBlock,
  StatCardRowSkeleton,
} from "@/components/skeletons/Skeleton";

export default function AllGamesLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <NavBarSkeleton />

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="mt-3 h-12 w-72 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
        </section>

        <section className="mb-6">
          <StatCardRowSkeleton count={4} />
        </section>

        <section className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[50px] rounded-2xl" />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 24 }).map((_, index) => (
            <GameCardSkeleton key={index} fixedWidth={false} />
          ))}
        </div>
      </div>
    </main>
  );
}
