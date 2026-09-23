import AppNav from "@/components/AppNav";
import WideGameCard, { type WideGameCardTone } from "@/components/games/WideGameCard";
import type { UiGame } from "@/lib/gameTypes";
import { getWishlistGames } from "@/lib/server/wishlistGames";
import {
  buildWishlistTimeline,
  formatWishlistRelease,
  getMonthName,
  splitRecentlyReleased,
  type WishlistYearGroup,
} from "@/lib/wishlistTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Shared column count for both layouts, so the month columns line up with
// the wide grids above and below them.
const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";
// Flat game grids go two-up on phones (one full-width card per game made
// this page ~23k px tall on mobile); month columns keep GRID_CLASSES and
// go two-up inside each column instead.
const GAME_GRID_CLASSES = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";

function getTone(game: UiGame, todayKey: string): WideGameCardTone {
  if (!game.Release) return "tba";

  return String(game.Release).slice(0, 10) <= todayKey ? "released" : "upcoming";
}

function SectionHeading({
  title,
  count,
  isCurrent = false,
}: {
  title: string;
  count: number;
  isCurrent?: boolean;
}) {
  return (
    <div className="mb-5 flex items-baseline gap-3 border-b border-zinc-800 pb-3">
      <h2
        className={`text-2xl font-black uppercase tracking-tight md:text-3xl ${
          isCurrent ? "text-cyan-300" : "text-white"
        }`}
      >
        {title}
      </h2>
      <span className="ml-auto shrink-0 text-sm font-medium text-zinc-500">
        {count} {count === 1 ? "game" : "games"}
      </span>
    </div>
  );
}

function WideGameGrid({
  games,
  todayKey,
  eager = false,
}: {
  games: UiGame[];
  todayKey: string;
  eager?: boolean;
}) {
  return (
    <div className={GAME_GRID_CLASSES}>
      {games.map((game, index) => (
        <WideGameCard
          key={game.id}
          game={game}
          label={formatWishlistRelease(game.Release)}
          tone={getTone(game, todayKey)}
          eager={eager && index < 4}
        />
      ))}
    </div>
  );
}

function MonthColumn({
  title,
  games,
  todayKey,
}: {
  title: string;
  games: UiGame[];
  todayKey: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">
          {title}
        </h3>
        <span className="text-xs font-medium text-zinc-500">{games.length}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
        {games.map((game) => (
          <WideGameCard
            key={game.id}
            game={game}
            label={formatWishlistRelease(game.Release)}
            tone={getTone(game, todayKey)}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function YearSection({
  group,
  todayKey,
}: {
  group: Extract<WishlistYearGroup, { kind: "year" }>;
  todayKey: string;
}) {
  const count = group.games.length;

  // Native <details> toggle: collapsed by default, no client JS needed.
  return (
    <details className="group mb-8">
      <summary className="mb-5 flex cursor-pointer list-none items-center gap-3 border-b border-zinc-800 pb-3 transition hover:border-cyan-400/50 [&::-webkit-details-marker]:hidden">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          {group.year}
        </h2>
        <span className="ml-auto shrink-0 text-sm font-medium text-zinc-500">
          {count} {count === 1 ? "game" : "games"}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-xs text-zinc-500 transition duration-200 group-open:rotate-180 group-hover:text-cyan-300"
        >
          ▼
        </span>
      </summary>

      <div className="mb-4">
        <WideGameGrid games={group.games} todayKey={todayKey} />
      </div>
    </details>
  );
}

export default async function WishlistPage() {
  const games = await getWishlistGames();
  // Server clock decides "today" and the current year, so the recent
  // window and the month-split year move forward automatically.
  const today = new Date();
  const currentYear = today.getFullYear();
  const { recent, rest, todayKey } = splitRecentlyReleased(games, today);
  const timeline = buildWishlistTimeline(rest, currentYear);
  const pastYears = timeline.years.filter(
    (group): group is Extract<WishlistYearGroup, { kind: "year" }> =>
      group.kind === "year" && group.year < currentYear
  );
  const futureYears = timeline.years.filter(
    (group): group is Extract<WishlistYearGroup, { kind: "year" }> =>
      group.kind === "year" && group.year > currentYear
  );
  const currentYearGroup = timeline.years.find(
    (group): group is Extract<WishlistYearGroup, { kind: "current-year" }> =>
      group.kind === "current-year"
  );
  const currentYearCount = currentYearGroup
    ? currentYearGroup.months.reduce((sum, month) => sum + month.games.length, 0) +
      currentYearGroup.dateTba.length
    : 0;

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <AppNav />

        <section className="mb-10 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-300">
            Wishlist
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            Release Calendar
          </h1>

          <p className="mt-3 text-sm font-medium text-zinc-400 md:text-base">
            {games.length} {games.length === 1 ? "game" : "games"} on your
            wishlist
          </p>
        </section>

        {games.length === 0 && (
          <p className="text-sm font-medium text-zinc-500">
            Your wishlist is empty.
          </p>
        )}

        {recent.length > 0 && (
          <section className="mb-12">
            <SectionHeading title="Released in the Last Month" count={recent.length} />
            <WideGameGrid games={recent} todayKey={todayKey} eager />
          </section>
        )}

        {pastYears.map((group) => (
          <YearSection key={group.year} group={group} todayKey={todayKey} />
        ))}

        {currentYearGroup && currentYearCount > 0 && (
          <section className="mb-12">
            <SectionHeading
              title={`Upcoming — ${currentYearGroup.year}`}
              count={currentYearCount}
              isCurrent
            />

            <div className={`${GRID_CLASSES} items-start`}>
              {currentYearGroup.months.map(({ month, games: monthGames }) => (
                <MonthColumn
                  key={month}
                  title={getMonthName(month)}
                  games={monthGames}
                  todayKey={todayKey}
                />
              ))}

              {currentYearGroup.dateTba.length > 0 && (
                <MonthColumn
                  title="Date TBA"
                  games={currentYearGroup.dateTba}
                  todayKey={todayKey}
                />
              )}
            </div>
          </section>
        )}

        {futureYears.map((group) => (
          <YearSection key={group.year} group={group} todayKey={todayKey} />
        ))}

        {timeline.tba.length > 0 && (
          <section className="mb-12">
            <SectionHeading title="TBA" count={timeline.tba.length} />
            <WideGameGrid games={timeline.tba} todayKey={todayKey} />
          </section>
        )}
      </div>
    </main>
  );
}
