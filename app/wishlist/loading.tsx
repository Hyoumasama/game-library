import { NavBarSkeleton, SkeletonBlock } from "@/components/skeletons/Skeleton";

// Mirrors app/wishlist/page.tsx: header panel, a wide-card grid section,
// then the current year's month columns.
const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

function WideCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`overflow-hidden border border-zinc-800 bg-zinc-950/90 ${
        compact ? "rounded-2xl" : "rounded-[1.6rem]"
      }`}
    >
      <SkeletonBlock className="aspect-[460/215] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-1/3" />
      </div>
    </div>
  );
}

function HeadingSkeleton() {
  return (
    <div className="mb-5 flex items-baseline gap-3 border-b border-zinc-800 pb-3">
      <SkeletonBlock className="h-8 w-64 max-w-[70%]" />
      <SkeletonBlock className="ml-auto h-4 w-16" />
    </div>
  );
}

export default function WishlistLoading() {
  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <NavBarSkeleton />

        <section className="mb-10 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-12 w-72 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-48" />
        </section>

        <section className="mb-12">
          <HeadingSkeleton />
          <div className={GRID_CLASSES}>
            {Array.from({ length: 8 }).map((_, index) => (
              <WideCardSkeleton key={index} />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <HeadingSkeleton />
          <div className={`${GRID_CLASSES} items-start`}>
            {[3, 2, 2, 1].map((count, column) => (
              <div
                key={column}
                className="rounded-[1.6rem] border border-zinc-800 bg-zinc-950/70 p-3"
              >
                <SkeletonBlock className="mb-3 h-4 w-24" />
                <div className="space-y-3">
                  {Array.from({ length: count }).map((_, index) => (
                    <WideCardSkeleton key={index} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
