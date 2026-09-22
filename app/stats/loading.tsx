import {
  NavBarSkeleton,
  SkeletonBlock,
  StatCardRowSkeleton,
} from "@/components/skeletons/Skeleton";

export default function StatsLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-8">
        <NavBarSkeleton />

        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-28 rounded-xl" />
        </div>

        <SkeletonBlock className="mx-auto mt-4 h-16 w-full max-w-4xl" />

        <section className="mt-8">
          <StatCardRowSkeleton count={4} />
        </section>

        <section className="mt-8 space-y-4">
          <SkeletonBlock className="h-64 w-full rounded-2xl" />
          <SkeletonBlock className="h-64 w-full rounded-2xl" />
        </section>
      </div>
    </main>
  );
}
