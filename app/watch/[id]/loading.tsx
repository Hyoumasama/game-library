import { NavBarSkeleton, SkeletonBlock } from "@/components/skeletons/Skeleton";

export default function WatchDetailLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <NavBarSkeleton />

        <div className="relative grid gap-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 md:grid-cols-[220px_1fr] md:p-8">
          <SkeletonBlock className="aspect-[2/3] rounded-lg" />

          <div>
            <SkeletonBlock className="h-10 w-2/3" />
            <SkeletonBlock className="mt-5 h-24 w-full max-w-4xl" />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
