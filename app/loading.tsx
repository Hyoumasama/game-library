import {
  GameGridSkeleton,
  NavBarSkeleton,
  SectionHeaderSkeleton,
  SkeletonBlock,
} from "@/components/skeletons/Skeleton";

export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      <div className="relative mx-auto max-w-7xl">
        <NavBarSkeleton />

        <section className="mb-10">
          <SkeletonBlock className="mb-4 h-7 w-64" />

          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="h-[280px] w-[220px] shrink-0 rounded-2xl"
              />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <SectionHeaderSkeleton />
          <GameGridSkeleton count={7} />
        </section>

        <section className="mb-12">
          <SectionHeaderSkeleton />
          <GameGridSkeleton count={7} />
        </section>

        <section className="mb-12">
          <SectionHeaderSkeleton />
          <GameGridSkeleton count={7} />
        </section>
      </div>
    </main>
  );
}
