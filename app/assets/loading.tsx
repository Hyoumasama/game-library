import { NavBarSkeleton, SkeletonBlock } from "@/components/skeletons/Skeleton";

export default function AssetsLoading() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <NavBarSkeleton />

        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <SkeletonBlock className="h-10 w-48" />
            <SkeletonBlock className="mt-2 h-4 w-80 max-w-full" />
          </div>
        </div>

        <section className="mb-12">
          <SkeletonBlock className="mb-5 h-8 w-32" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        </section>

        <section>
          <SkeletonBlock className="mb-5 h-8 w-40" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
