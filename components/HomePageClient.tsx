"use client";

import AppNav from "@/components/AppNav";
import SteamNewsTicker from "@/components/SteamNewsTicker";
import SafeImage from "@/components/SafeImage";
import LongPressGameCard from "@/components/games/LongPressGameCard";
import CoverBottomBadges, { getGameIconItems } from "@/components/games/CoverBottomBadges";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { UiGame } from "@/lib/gameTypes";
import { useIsAdmin } from "@/lib/useAdminStatus";
import type { SteamNewsTickerItem } from "@/lib/server/steamNews";

// Only admins ever open this modal, so keep it out of everyone else's
// initial JS bundle.
const EditGameModal = dynamic(() => import("@/components/games/EditGameModal"), {
  ssr: false,
});

type Game = UiGame;

export type HomePageData = {
  wishlist: Game[];
  currentlyPlaying: Game[];
  recentlyAdded: Game[];
  recentlyCompleted: Game[];
};

export default function HomePageClient({
  initialData,
  steamNews,
}: {
  initialData: HomePageData;
  steamNews: SteamNewsTickerItem[];
}) {
  const isAdmin = useIsAdmin();
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
const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
const [metadataRefreshMessage, setMetadataRefreshMessage] = useState("");

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

async function refreshWishlistMetadata() {
  setIsRefreshingMetadata(true);
  setMetadataRefreshMessage("");

  try {
    const response = await fetch("/api/admin/wishlist-release-refresh", {
      method: "POST",
    });
    const data = await response.json();

    if (!response.ok) {
      setMetadataRefreshMessage(data.error || "Refresh failed");
      return;
    }

    await loadGames();
    setMetadataRefreshMessage(
      `Updated ${data.updated || 0}, Cleared ${data.cleared || 0}, TBA ${data.stillTba || 0}`
    );
  } catch (error) {
    console.error("Wishlist metadata refresh failed:", error);
    setMetadataRefreshMessage("Refresh failed");
  } finally {
    setIsRefreshingMetadata(false);
  }
}

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

<SteamNewsTicker items={steamNews} isAdmin={isAdmin} />

<WishlistReleaseCalendar
  games={wishlistGames}
  isAdmin={isAdmin}
  isRefreshingMetadata={isRefreshingMetadata}
  metadataRefreshMessage={metadataRefreshMessage}
  onRefreshMetadata={refreshWishlistMetadata}
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

const RECENT_RELEASE_DAYS = 7;

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

function WishlistReleaseCalendar({
  games,
  isAdmin,
  isRefreshingMetadata,
  metadataRefreshMessage,
  onRefreshMetadata,
  onEdit,
  onDelete,
}: {
  games: Game[];
  isAdmin: boolean;
  isRefreshingMetadata: boolean;
  metadataRefreshMessage: string;
  onRefreshMetadata: () => void;
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
  const { todayKey, recentCutoffKey } = useMemo(() => {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - RECENT_RELEASE_DAYS);

    return {
      todayKey: getLocalDateKey(today),
      recentCutoffKey: getLocalDateKey(cutoff),
    };
  }, []);
  const { groupedGames, initialAnchorKey, releaseDates, tbaGames } = useMemo(() => {
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
    // Upcoming only: released games stay for RECENT_RELEASE_DAYS after
    // their release date, then drop off the calendar.
    const recentDates = groupedDates.filter(
      (releaseDate) =>
        releaseDate >= recentCutoffKey && releaseDate < todayKey
    );
    const futureDates = groupedDates
      .filter((releaseDate) => releaseDate > todayKey)
      .slice(0, 30);
    const todayGroup = groupedDates.includes(todayKey) ? todayKey : null;
    const tba = games
      .filter((game) => getReleaseDateKey(game) === "TBA")
      .sort((first, second) => first.Title.localeCompare(second.Title));
    // Start at the first column so the just-released week stays in view.
    const initialAnchor =
      recentDates[0] || todayGroup || futureDates[0] || null;
    const initialKey = initialAnchor
      ? `date-${initialAnchor}`
      : tba.length
        ? "tba"
        : null;
    const calendarDates = [
      ...recentDates,
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
      releaseDates: calendarDates,
      tbaGames: tba,
    };
  }, [games, todayKey, recentCutoffKey]);

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-white md:text-2xl">
          Upcoming Games Calendar
        </h2>

        {isAdmin && (
          <button
            type="button"
            onClick={onRefreshMetadata}
            disabled={isRefreshingMetadata}
            aria-label="Refresh wishlist release dates"
            title="Refresh release dates"
            className="flex h-9 w-9 items-center justify-center rounded border border-cyan-300/40 bg-cyan-300 text-lg font-black leading-none text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshingMetadata ? "..." : "↻"}
          </button>
        )}

        {metadataRefreshMessage && (
          <span className="text-xs font-black uppercase text-zinc-400">
            {metadataRefreshMessage}
          </span>
        )}

        <Link
          href="/wishlist"
          className="ml-auto text-xs font-black text-cyan-300 hover:text-white md:text-sm"
        >
          {"Wishlist ->"}
        </Link>
      </div>

      <div
        ref={desktopCalendarScrollRef}
        className="hidden gap-3 overflow-x-auto pb-4 md:flex"
      >
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

        {tbaGames.length > 0 && (
          (() => {
            const expanded = !!expandedDesktopGroups.tba;
            const visibleGames = expanded ? tbaGames : tbaGames.slice(0, 4);
            const remainingCount = Math.max(tbaGames.length - 4, 0);

            return (
          <div
            ref={initialAnchorKey === "tba" ? desktopInitialAnchorRef : undefined}
            className="w-[220px] shrink-0"
          >
            <div className="px-1 pb-3 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              TBA
            </div>

            <div className="relative grid grid-cols-2 gap-2">
              {visibleGames.map((game) => {
                const image = getWishlistCalendarPortraitImage(game);

                return (
                  <Link
                    key={`tba-${game.id || game.Title}`}
                    href={`/game/${game.id}`}
                    className="group relative block overflow-hidden rounded bg-zinc-950 shadow-lg"
                    aria-label={`${game.Title} - TBA`}
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

                      <span className="absolute inset-x-0 bottom-0 bg-zinc-800 px-1.5 py-1 text-center text-[9px] font-black uppercase text-zinc-200">
                        TBA
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
                      ? "Show fewer TBA games"
                      : `Show ${remainingCount} more TBA games`
                  }
                  onClick={() =>
                    setExpandedDesktopGroups((currentGroups) => ({
                      ...currentGroups,
                      tba: !expanded,
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
          })()
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-zinc-950/70 p-2 md:hidden">
        <div
          ref={mobileCalendarScrollRef}
          className="flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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

                            {(countdown === "TODAY" ||
                              game.home_tag === "Available Now") && (
                              <span className="absolute left-1 top-1 rounded bg-emerald-400 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                                {countdown}
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

          {tbaGames.length > 0 && (
            (() => {
              // Same 4-then-expand cap as the desktop TBA column - showing
              // every TBA game here made this one column far taller than the
              // date columns and stretched the whole calendar row.
              const expanded = !!expandedMobileDates.tba;
              const visibleGames = expanded ? tbaGames : tbaGames.slice(0, 4);
              const remainingCount = Math.max(tbaGames.length - 4, 0);

              return (
            <div
              ref={initialAnchorKey === "tba" ? mobileInitialAnchorRef : undefined}
              className="w-24 shrink-0 snap-start"
            >
              <div className="mb-2 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-center text-xs font-black tracking-[0.16em] text-zinc-400">
                TBA
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {visibleGames.map((game) => {
                  const image = getWishlistCalendarPortraitImage(game);

                  return (
                    <LongPressGameCard
                      key={`tba-${game.id || game.Title}`}
                      disabled={!isAdmin || !game.id}
                      title={game.Title}
                      imageUrl={image}
                      onEdit={() => onEdit(game)}
                      onDelete={() => onDelete(Number(game.id))}
                    >
                      <Link
                        href={`/game/${game.id}`}
                        className="group relative block overflow-hidden rounded-lg"
                        aria-label={`${game.Title} - TBA`}
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

                          <span className="absolute inset-x-0 bottom-0 bg-zinc-800 px-0.5 py-0.5 text-center text-[7px] font-black uppercase text-zinc-200">
                            TBA
                          </span>
                        </div>
                      </Link>
                    </LongPressGameCard>
                  );
                })}
              </div>

              {remainingCount > 0 && (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? "Show fewer TBA games"
                      : `Show ${remainingCount} more TBA games`
                  }
                  onClick={() =>
                    setExpandedMobileDates((currentDates) => ({
                      ...currentDates,
                      tba: !expanded,
                    }))
                  }
                  className="mx-auto mt-1.5 block rounded-full border border-cyan-400/25 bg-black/50 px-2.5 py-1 text-[10px] font-black text-cyan-300 backdrop-blur transition active:bg-zinc-800"
                >
                  {expanded ? "Show less" : `+${remainingCount}`}
                </button>
              )}
            </div>
              );
            })()
          )}
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
          const gameIcons = getGameIconItems(game);

          return (
            <LongPressGameCard
              key={`${title}-${game.id || game.Title}-${index}`}
              disabled={!isAdmin || !game.id}
              title={game.Title}
              imageUrl={image}
              footer={
                <>
                  {gameIcons.map(({ icon, value }) => (
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
                  ))}
                </>
              }
              onEdit={() => onEdit(game)}
              onDelete={() => onDelete(Number(game.id))}
            >
              <Link
                href={`/game/${game.id}`}
                aria-label={game.Title}
                title={game.Title}
              className={`group block w-[155px] shrink-0 overflow-hidden rounded-[1.5rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 md:w-auto ${
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

                {variant !== "wishlist" && <CoverBottomBadges game={game} />}

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
                          </Link>
            </LongPressGameCard>
          );
        })}
      </div>
    </section>
  );
}
