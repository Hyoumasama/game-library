"use client";

import AppNav from "@/components/AppNav";
import SafeImage from "@/components/SafeImage";
import EditGameModal from "@/components/games/EditGameModal";
import LongPressGameCard from "@/components/games/LongPressGameCard";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatHours,
  getIcon,
} from "@/lib/gameHelpers";
import type { UiGame } from "@/lib/gameTypes";

type Game = UiGame;

export type HomePageData = {
  wishlist: Game[];
  currentlyPlaying: Game[];
  recentlyAdded: Game[];
  recentlyCompleted: Game[];
};

export default function HomePageClient({
  initialData,
}: {
  initialData: HomePageData;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
const [wishlistGames, setWishlistGames] = useState<Game[]>(initialData.wishlist);
const [currentlyPlayingGames, setCurrentlyPlayingGames] = useState<Game[]>(
  initialData.currentlyPlaying
);
const [recentlyAddedGames, setRecentlyAddedGames] = useState<Game[]>(
  initialData.recentlyAdded
);
const [recentlyCompletedGames, setRecentlyCompletedGames] = useState<Game[]>(
  initialData.recentlyCompleted
);

const [editingGame, setEditingGame] = useState<Game | null>(null);
const [editSignal, setEditSignal] = useState(0);

function openEditGame(game: Game) {
  setEditingGame(game);
  setEditSignal((value) => value + 1);
}

const loadGames = useCallback(async () => {
  try {
    const response = await fetch("/api/home-games", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("HOME GAMES API ERROR:", data);
      return;
    }

    setWishlistGames(data.wishlist || []);
    setCurrentlyPlayingGames(data.currentlyPlaying || []);
    setRecentlyAddedGames(data.recentlyAdded || []);
    setRecentlyCompletedGames(data.recentlyCompleted || []);
  } catch (error) {
    console.error("HOME GAMES API ERROR:", error);
  }
}, []);

async function deleteGame(gameId: number) {
  const confirmed = confirm("Are you sure you want to delete this game?");

  if (!confirmed) return;

  const response = await fetch(`/api/admin/games/${gameId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    alert("Failed to delete game");
    return;
  }

  await loadGames();
}

useEffect(() => {
  async function checkAdmin() {
    const response = await fetch("/api/admin/me");
    const data = await response.json();

    setIsAdmin(data.isAdmin);
  }

  checkAdmin();
}, []);

    return (
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      <div className="relative mx-auto max-w-7xl">
        <AppNav onGameAdded={loadGames} />

                {isAdmin && editingGame && (
          <EditGameModal
            game={editingGame}
            onGameUpdated={() => {
              setEditingGame(null);
              loadGames();
            }}
            openSignal={editSignal}
            hideButton
          />
        )}

<WishlistReleaseCalendar
  games={wishlistGames}
  isAdmin={isAdmin}
  onEdit={openEditGame}
  onDelete={deleteGame}
/>

<section className="mb-8">
  <CurrentlyPlayingGrid
  games={currentlyPlayingGames}
  isAdmin={isAdmin}
  onEdit={openEditGame}
  onDelete={deleteGame}
/>
</section>

        <GameSection
  title="Recently Added"
  games={recentlyAddedGames}
  href="/all-games?sort=recently-added"
  isAdmin={isAdmin}
  onEdit={openEditGame}
  onDelete={deleteGame}
/>

        <GameSection
  title="Recently Completed"
  games={recentlyCompletedGames}
  href="/all-games?status=Completed&sort=completion-newest"
  isAdmin={isAdmin}
  onEdit={openEditGame}
  onDelete={deleteGame}
/>
      </div>
    </main>
  );
}

function getWishlistCountdown(release: string | null | undefined) {
  if (!release) return "TBA";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const releaseKey = String(release).slice(0, 10);
  const [year, month, day] = releaseKey.split("-").map(Number);

  if (!year || !month || !day) return "TBA";

  const releaseDate = new Date(year, month - 1, day);
  releaseDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (releaseDate.getTime() - today.getTime()) / 86400000
  );

  if (diffDays < 0) return "AVAILABLE NOW";

  if (diffDays === 0) return "TODAY";

  if (diffDays < 30) return `${diffDays} DAYS LEFT`;

  if (diffDays < 365) {
    const months = Math.ceil(diffDays / 30);
    return months === 1 ? "1 MONTH LEFT" : `${months} MONTHS LEFT`;
  }

  const years = Math.ceil(diffDays / 365);
  return years === 1 ? "1 YEAR LEFT" : `${years} YEARS LEFT`;
}

function hasGoldenAchievement(game: Game) {
  return (
    game.achievement_badge === "platinum" ||
    game.achievement_badge === "100completion"
  );
}

function CurrentlyPlayingGrid({
  games,
  isAdmin,
  onEdit,
  onDelete,
}: {
  games: Game[];
  isAdmin: boolean;
  onEdit: (game: Game) => void;
  onDelete: (gameId: number) => void;
}) {
  return (
    <GameSection
  title="Currently Playing"
  games={games}
  href="/all-games?status=Playing"
  isAdmin={isAdmin}
  onEdit={onEdit}
  onDelete={onDelete}
/>
  );
}

function getReleaseDateKey(game: Game) {
  return game.Release ? String(game.Release).slice(0, 10) : "TBA";
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReleaseColumnTitle(dateKey: string, todayKey?: string) {
  if (dateKey === "TBA") return "TBA";

  const date = new Date(`${dateKey}T00:00:00`);
  const formattedDate = date
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  return dateKey === todayKey ? `TODAY ${formattedDate}` : formattedDate;
}

function formatMobileReleaseColumnTitle(dateKey: string, todayKey?: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekday = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const numericDate = date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
  });

  return { weekday: dateKey === todayKey ? "TODAY" : weekday, numericDate };
}

function getWishlistCalendarWideImage(game: Game) {
  return game["Wide Cover"] || game.wide_cover_url || game.hero_url || game.Cover;
}

function getWishlistCalendarPortraitImage(game: Game) {
  return game.steam_vertical_cover || game.cover_url || game.Cover;
}

function formatPastReleaseDate(release: string | null | undefined) {
  const dateKey = release ? String(release).slice(0, 10) : null;

  if (!dateKey) return "";

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function WishlistReleaseCalendar({
  games,
  isAdmin,
  onEdit,
  onDelete,
}: {
  games: Game[];
  isAdmin: boolean;
  onEdit: (game: Game) => void;
  onDelete: (gameId: number) => void;
}) {
  const [expandedMobileDates, setExpandedMobileDates] = useState<
    Record<string, boolean>
  >({});
  const [expandedDesktopGroups, setExpandedDesktopGroups] = useState<
    Record<string, boolean>
  >({});
  const desktopCalendarScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileCalendarScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopInitialAnchorRef = useRef<HTMLDivElement | null>(null);
  const mobileInitialAnchorRef = useRef<HTMLDivElement | null>(null);
  const hasInitialScrolledRef = useRef(false);
  const todayKey = useMemo(() => getLocalDateKey(new Date()), []);
  const { groupedGames, initialAnchorKey, pastYears, releaseDates } = useMemo(() => {
    const groups = games.reduce<Record<string, Game[]>>((dateGroups, game) => {
      const releaseDate = getReleaseDateKey(game);

      if (releaseDate === "TBA") {
        return dateGroups;
      }

      dateGroups[releaseDate] = dateGroups[releaseDate] || [];
      dateGroups[releaseDate].push(game);
      return dateGroups;
    }, {});

    const groupedDates = Object.keys(groups).sort((first, second) =>
      first.localeCompare(second)
    );
    const pastDates = groupedDates.filter(
      (releaseDate) => releaseDate < todayKey
    );
    const futureDates = groupedDates
      .filter((releaseDate) => releaseDate > todayKey)
      .slice(0, 30);
    const todayGroup = groupedDates.includes(todayKey) ? todayKey : null;
    const years = new Map<string, Game[]>();

    for (const releaseDate of pastDates) {
      const year = releaseDate.slice(0, 4);
      years.set(year, [...(years.get(year) || []), ...groups[releaseDate]]);
    }

    const groupedPastYears = [...years.entries()].map(([year, yearGames]) => ({
      year,
      games: yearGames.sort((first, second) => {
        const releaseCompare = getReleaseDateKey(first).localeCompare(
          getReleaseDateKey(second)
        );

        return releaseCompare || first.Title.localeCompare(second.Title);
      }),
    }));
    const initialAnchor = todayGroup || futureDates[0] || null;
    const initialKey = initialAnchor
      ? `date-${initialAnchor}`
      : groupedPastYears.length
        ? `year-${groupedPastYears[groupedPastYears.length - 1].year}`
        : null;
    const calendarDates = [
      ...(todayGroup ? [todayGroup] : []),
      ...futureDates,
    ];

    for (const releaseDate of calendarDates) {
      groups[releaseDate].sort((first, second) =>
        first.Title.localeCompare(second.Title)
      );
    }

    return {
      groupedGames: groups,
      initialAnchorKey: initialKey,
      pastYears: groupedPastYears,
      releaseDates: calendarDates,
    };
  }, [games, todayKey]);

  useLayoutEffect(() => {
    if (hasInitialScrolledRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const scrollContainer =
        desktopCalendarScrollRef.current?.getClientRects().length
          ? desktopCalendarScrollRef.current
          : mobileCalendarScrollRef.current;
      const initialAnchorColumn =
        scrollContainer === desktopCalendarScrollRef.current
          ? desktopInitialAnchorRef.current
          : mobileInitialAnchorRef.current;

      if (!scrollContainer || !initialAnchorColumn) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const anchorRect = initialAnchorColumn.getBoundingClientRect();
      const paddingLeft = Number.parseFloat(
        window.getComputedStyle(scrollContainer).paddingLeft || "0"
      );
      const targetScrollLeft =
        scrollContainer.scrollLeft +
        anchorRect.left -
        containerRect.left -
        paddingLeft;

      scrollContainer.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: "auto",
      });

      hasInitialScrolledRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialAnchorKey]);

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-black text-white md:text-2xl">
        Upcoming Games Calendar
      </h2>

      <div
        ref={desktopCalendarScrollRef}
        className="hidden gap-3 overflow-x-auto pb-4 md:flex"
      >
        {pastYears.map(({ year, games: yearGames }) => {
          const groupKey = `year-${year}`;
          const expanded = !!expandedDesktopGroups[groupKey];
          const visibleGames = expanded ? yearGames : yearGames.slice(0, 4);
          const remainingCount = Math.max(yearGames.length - 4, 0);

          return (
          <div
            key={year}
            ref={
              `year-${year}` === initialAnchorKey
                ? desktopInitialAnchorRef
                : undefined
            }
            className="w-[220px] shrink-0"
          >
            <div className="px-1 pb-3 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              {year}
            </div>

            <div className="relative grid grid-cols-2 gap-2">
              {visibleGames.map((game) => {
                const image = getWishlistCalendarPortraitImage(game);

                return (
                  <Link
                    key={`${year}-${game.id || game.Title}`}
                    href={`/game/${game.id}`}
                    className="group relative block overflow-hidden rounded bg-zinc-950 shadow-lg"
                    aria-label={`${game.Title} — ${formatPastReleaseDate(game.Release)}`}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
                      {image ? (
                        <SafeImage
                          src={image}
                          alt={game.Title}
                          fill
                          sizes="110px"
                          loading="lazy"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-black text-zinc-500">
                          {game.Title}
                        </div>
                      )}

                      <span className="absolute inset-x-0 bottom-0 bg-emerald-400 px-1.5 py-1 text-center text-[9px] font-black uppercase text-black">
                        {formatPastReleaseDate(game.Release)}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {remainingCount > 0 && (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? `Show fewer games from ${year}`
                      : `Show ${remainingCount} more games from ${year}`
                  }
                  onClick={() =>
                    setExpandedDesktopGroups((currentGroups) => ({
                      ...currentGroups,
                      [groupKey]: !expanded,
                    }))
                  }
                  className="absolute bottom-1 left-1/2 z-10 flex min-h-9 min-w-9 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-300/60 bg-zinc-950/95 px-2 text-xs font-black text-cyan-200 shadow-lg transition hover:scale-110 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {expanded ? "−" : `+${remainingCount}`}
                </button>
              )}
            </div>
          </div>
          );
        })}

        {releaseDates.map((releaseDate, columnIndex) => {
          const dateGames = groupedGames[releaseDate];
          const expanded = !!expandedDesktopGroups[releaseDate];
          const visibleGames = expanded ? dateGames : dateGames.slice(0, 2);
          const remainingCount = Math.max(dateGames.length - 2, 0);

          return (
          <div
            key={releaseDate}
            ref={
              `date-${releaseDate}` === initialAnchorKey
                ? desktopInitialAnchorRef
                : undefined
            }
            className="w-[220px] shrink-0"
          >
            <div className="px-1 pb-3 text-sm font-black uppercase tracking-[0.18em] text-white">
              {formatReleaseColumnTitle(releaseDate, todayKey)}
            </div>

            <div className="relative space-y-2">
              {visibleGames.map((game) => {
                const image = getWishlistCalendarWideImage(game);
                const countdown = getWishlistCountdown(game.Release);
                const isPoster = image === game.Cover;

                return (
                  <Link
                    key={`${releaseDate}-${game.id || game.Title}`}
                    href={`/game/${game.id}`}
                    className="group relative block overflow-hidden rounded bg-zinc-950 shadow-lg"
                  >
                    <div
                      className={`relative w-full overflow-hidden bg-zinc-900 ${
                        isPoster ? "aspect-[2/3]" : "aspect-[16/9]"
                      }`}
                    >
                      {image ? (
                        <SafeImage
                          src={image}
                          alt={game.Title}
                          fill
                          sizes="(min-width: 1024px) 18vw, 200px"
                          loading={
                            columnIndex < 4 ? "eager" : "lazy"
                          }
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-black text-zinc-500">
                          {game.Title}
                        </div>
                      )}

                      {(countdown === "TODAY" ||
                        game.home_tag === "Available Now") && (
                        <span className="absolute left-2 top-2 rounded bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase text-black">
                          {countdown}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
              {remainingCount > 0 && (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? `Show fewer games for ${formatReleaseColumnTitle(releaseDate, todayKey)}`
                      : `Show ${remainingCount} more games for ${formatReleaseColumnTitle(releaseDate, todayKey)}`
                  }
                  onClick={() =>
                    setExpandedDesktopGroups((currentGroups) => ({
                      ...currentGroups,
                      [releaseDate]: !expanded,
                    }))
                  }
                  className="absolute bottom-2 right-2 z-10 flex min-h-9 min-w-9 items-center justify-center rounded-full border border-cyan-300/60 bg-zinc-950/95 px-2 text-xs font-black text-cyan-200 shadow-lg transition hover:scale-110 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {expanded ? "−" : `+${remainingCount}`}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl bg-zinc-950/70 p-2 md:hidden">
        <div
          ref={mobileCalendarScrollRef}
          className="flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pastYears.map(({ year, games: yearGames }) => (
            <div
              key={year}
              ref={
                `year-${year}` === initialAnchorKey
                  ? mobileInitialAnchorRef
                  : undefined
              }
              className="w-24 shrink-0 snap-start"
            >
              <div className="mb-2 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-center text-xs font-black tracking-[0.16em] text-zinc-400">
                {year}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {yearGames.map((game) => {
                  const image = getWishlistCalendarPortraitImage(game);

                  return (
                    <LongPressGameCard
                      key={`${year}-${game.id || game.Title}`}
                      disabled={!isAdmin || !game.id}
                      title={game.Title}
                      imageUrl={image}
                      onEdit={() => onEdit(game)}
                      onDelete={() => onDelete(Number(game.id))}
                    >
                      <Link
                        href={`/game/${game.id}`}
                        className="group relative block overflow-hidden rounded-lg"
                        aria-label={`${game.Title} — ${formatPastReleaseDate(game.Release)}`}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900">
                          {image ? (
                            <SafeImage
                              src={image}
                              alt={game.Title}
                              fill
                              sizes="44px"
                              loading="lazy"
                              className="object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-zinc-600">
                              No image
                            </div>
                          )}

                          <span className="absolute inset-x-0 bottom-0 bg-emerald-400 px-0.5 py-0.5 text-center text-[7px] font-black uppercase text-black">
                            {formatPastReleaseDate(game.Release)}
                          </span>
                        </div>
                      </Link>
                    </LongPressGameCard>
                  );
                })}
              </div>
            </div>
          ))}

          {releaseDates.map((releaseDate, columnIndex) => {
            const title = formatMobileReleaseColumnTitle(releaseDate, todayKey);
            const dateGames = groupedGames[releaseDate];
            const expanded = !!expandedMobileDates[releaseDate];
            const visibleGames = expanded ? dateGames : dateGames.slice(0, 2);
            const remainingCount = Math.max(dateGames.length - 2, 0);

            return (
              <div
                key={releaseDate}
                ref={
                  `date-${releaseDate}` === initialAnchorKey
                    ? mobileInitialAnchorRef
                    : undefined
                }
                className="w-24 shrink-0 snap-start"
              >
                <div className="mb-2 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-center">
                  <div className="text-[10px] font-black tracking-[0.16em] text-cyan-300">
                    {title.weekday}
                  </div>
                  <div className="mt-0.5 text-xs font-black text-white">
                    {title.numericDate}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {visibleGames.map((game) => {
                    const image = getWishlistCalendarPortraitImage(game);
                    const countdown = getWishlistCountdown(game.Release);

                    return (
                      <LongPressGameCard
                        key={`${releaseDate}-${game.id || game.Title}`}
                        disabled={!isAdmin || !game.id}
                        title={game.Title}
                        imageUrl={image}
                        onEdit={() => onEdit(game)}
                        onDelete={() => onDelete(Number(game.id))}
                      >
                        <Link
                          href={`/game/${game.id}`}
                          className="group block overflow-hidden rounded-lg"
                          aria-label={game.Title}
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900">
                            {image ? (
                              <SafeImage
                                src={image}
                                alt={game.Title}
                                fill
                                sizes="96px"
                                loading={columnIndex < 4 ? "eager" : "lazy"}
                                className="object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-zinc-600">
                                No image
                              </div>
                            )}

                            {countdown === "TODAY" && (
                              <span className="absolute left-1 top-1 rounded bg-emerald-400 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                                TODAY
                              </span>
                            )}
                          </div>
                        </Link>
                      </LongPressGameCard>
                    );
                  })}

                  {remainingCount > 0 && (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={
                        expanded
                          ? `Show fewer games for ${title.weekday} ${title.numericDate}`
                          : `Show ${remainingCount} more games for ${title.weekday} ${title.numericDate}`
                      }
                      onClick={() =>
                        setExpandedMobileDates((currentDates) => ({
                          ...currentDates,
                          [releaseDate]: !expanded,
                        }))
                      }
                      className="mx-auto mt-1 block rounded-full border border-cyan-400/25 bg-black/50 px-2.5 py-1 text-[10px] font-black text-cyan-300 backdrop-blur transition active:bg-zinc-800"
                    >
                      {expanded ? "Show less" : `+${remainingCount}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GameSection({
  title,
  games,
  href,
  variant = "default",
  isAdmin,
  onEdit,
  onDelete,
}: {
  title: string;
  games: Game[];
  href: string;
  variant?: "default" | "wishlist";
    isAdmin: boolean;
  onEdit: (game: Game) => void;
  onDelete: (gameId: number) => void;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>

        <Link href={href} className="text-xs font-black text-cyan-300 hover:text-white md:text-sm">
          {"All Games ->"}
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible lg:grid-cols-7">
        {games.map((game, index) => {
          const image = variant === "wishlist" ? game.Cover : game.Cover;
          const hasGoldenAchievementBadge = hasGoldenAchievement(game);
          const gameIcons = Array.from(
            new Set(
              [game.Store, game.Platform, game.Hardware]
                .filter((value): value is string => Boolean(value))
                .map((value) => {
                  const icon = getIcon(value);
                  return icon ? `${icon}|||${value}` : null;
                })
                .filter((item): item is string => Boolean(item))
            )
          );

          return (
            <LongPressGameCard
              key={`${title}-${game.id || game.Title}-${index}`}
              disabled={!isAdmin || !game.id}
              title={game.Title}
              imageUrl={image}
              footer={
                <>
                  {gameIcons.map((item) => {
                    const [icon, value] = item.split("|||");

                    return (
                      <Image
                        key={icon}
                        src={icon}
                        alt=""
                        width={20}
                        height={20}
                        sizes="20px"
                        className="h-5 w-5 object-contain"
                        title={value}
                      />
                    );
                  })}
                </>
              }
              onEdit={() => onEdit(game)}
              onDelete={() => onDelete(Number(game.id))}
            >
              <Link
                href={`/game/${game.id}`}
              className={`group w-[155px] shrink-0 overflow-hidden rounded-[1.5rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 md:w-auto ${
                variant !== "wishlist" && hasGoldenAchievementBadge
                  ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)] hover:border-yellow-300 hover:shadow-[0_0_42px_rgba(250,204,21,0.38)]"
                  : variant === "wishlist"
                    ? "border-zinc-800 hover:border-pink-400/70 hover:shadow-pink-950/40"
                    : "border-zinc-800 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
              }`}
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
                {image ? (
                  <SafeImage
                    src={image}
                    alt={game.Title}
                    fill
                    sizes="(min-width: 1024px) 14vw, (min-width: 768px) 20vw, 155px"
                    loading={index === 0 ? "eager" : "lazy"}
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    No Image
                  </div>
                )}

                {variant !== "wishlist" && Number(game.Score || 0) > 0 && (
                  <span
                    className={`absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${
                      Number(game.Score) >= 76
                        ? "bg-emerald-400 text-black"
                        : Number(game.Score) >= 60
                          ? "bg-yellow-400 text-black"
                          : "bg-red-400 text-black"
                    }`}
                  >
                    {game.Score}
                  </span>
                )}

                {variant !== "wishlist" && Number(game["Hours Played"] || 0) > 0 && (
                  <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
                    {formatHours(game["Hours Played"])}h
                  </span>
                )}
                {variant === "wishlist" && (
  <span
    className={`absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border min-w-[96px] px-3 py-1 text-center text-[10px] font-black uppercase tracking-wide whitespace-nowrap backdrop-blur-md ${
      getWishlistCountdown(game.Release) === "TODAY" ||
      game.home_tag === "Available Now"
  ? "border-emerald-500 bg-emerald-500 text-black"
  : "border-violet-500 bg-violet-500 text-black"
    }`}
  >
    {getWishlistCountdown(game.Release)}
  </span>
)}
              </div>

              <div className="p-3">
                <h3 className="line-clamp-2 h-10 text-sm font-black leading-5 text-white">
                  {game.Title}
                </h3>

                {variant === "wishlist" ? null : (
                  <div className="mt-2 flex h-5 items-center gap-2">
                    {gameIcons.map((item) => {
                      const [icon, value] = item.split("|||");

                      return (
                        <Image
                          key={icon}
                          src={icon}
                          alt=""
                          width={20}
                          height={20}
                          sizes="20px"
                          className="h-5 w-5 object-contain"
                          title={value}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

                          </Link>
            </LongPressGameCard>
          );
        })}
      </div>
    </section>
  );
}
