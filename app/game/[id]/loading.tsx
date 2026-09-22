import { NavBarSkeleton, SkeletonBlock } from "@/components/skeletons/Skeleton";

export default function GameDetailLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="mx-auto hidden max-w-6xl px-6 py-12 lg:block">
        <NavBarSkeleton />

        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[264px_1fr]">
          <SkeletonBlock className="aspect-[2/3] w-[264px] rounded-xl" />

          <div>
            <SkeletonBlock className="h-6 w-32 rounded" />
            <SkeletonBlock className="mt-4 h-12 w-3/4" />
            <SkeletonBlock className="mt-4 h-24 w-full max-w-3xl" />

            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-7 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[430px] px-4 pb-10 pt-3 lg:hidden">
        <NavBarSkeleton />

        <SkeletonBlock className="aspect-video w-full rounded-2xl" />
        <SkeletonBlock className="mt-4 h-8 w-3/4" />
        <SkeletonBlock className="mt-3 h-20 w-full" />

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
