import { NavBarSkeleton, SkeletonBlock } from "@/components/skeletons/Skeleton";

export default function MonthlyLogLoading() {
  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <NavBarSkeleton />

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBlock className="h-10 w-56" />
            <SkeletonBlock className="mt-2 h-4 w-64" />
          </div>

          <SkeletonBlock className="h-11 w-32 rounded-xl" />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20 rounded-2xl" />
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <SkeletonBlock className="mb-4 h-6 w-32" />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 6 }).map((_, cardIndex) => (
                  <SkeletonBlock key={cardIndex} className="aspect-[2/3] rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
