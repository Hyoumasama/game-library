import {
  GameCardSkeleton,
  NavBarSkeleton,
  SkeletonBlock,
} from "@/components/skeletons/Skeleton";

export default function WatchHomeLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <NavBarSkeleton />

        <section className="mb-10">
          <SkeletonBlock className="mb-4 h-7 w-40" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className={`aspect-video rounded ${index === 4 ? "hidden lg:block" : ""}`}
              />
            ))}
          </div>
        </section>

        {Array.from({ length: 2 }).map((_, section) => (
          <section key={section} className="mb-12">
            <SkeletonBlock className="mb-4 h-7 w-56" />
            <div className="flex gap-4 overflow-hidden md:grid md:grid-cols-5 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, index) => (
                <GameCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
