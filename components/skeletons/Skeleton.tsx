// Shared building blocks for route-level loading.tsx skeletons. Every page
// here is force-dynamic, so Next.js shows these while the server-rendered
// page (with its Supabase queries) is still in flight, instead of leaving
// the browser on a blank/frozen previous page during navigation.

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-zinc-800/60 ${className}`}
    />
  );
}

// Roughly matches AppNav's height/shape so the real nav doesn't cause a
// layout jump once it mounts.
export function NavBarSkeleton() {
  return (
    <div className="mb-5">
      <div className="hidden items-center gap-3 lg:flex">
        <SkeletonBlock className="h-[52px] flex-1 rounded-2xl" />
        <SkeletonBlock className="h-[52px] w-28 shrink-0" />
        <SkeletonBlock className="h-[52px] w-28 shrink-0" />
        <SkeletonBlock className="h-[52px] w-28 shrink-0" />
      </div>

      <div className="flex items-center gap-3 lg:hidden">
        <SkeletonBlock className="h-[52px] flex-1 rounded-2xl" />
        <SkeletonBlock className="h-[52px] w-[52px] shrink-0" />
      </div>
    </div>
  );
}

export function SectionHeaderSkeleton() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-4 w-20" />
    </div>
  );
}

// Matches the poster-card shape used across Home / All Games / Watch.
export function GameCardSkeleton({
  fixedWidth = true,
}: {
  fixedWidth?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950/90 ${
        fixedWidth ? "w-[155px] shrink-0 md:w-auto" : "w-full"
      }`}
    >
      <SkeletonBlock className="aspect-[2/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-2/5" />
      </div>
    </div>
  );
}

export function GameGridSkeleton({
  count = 7,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-7 ${className}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <GameCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function StatCardRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} className="h-24 rounded-[1.6rem]" />
      ))}
    </div>
  );
}
