// Read-only poster grid for franchise/developer/publisher browsing pages.
// Visually this is the same card used by the All Games grid
// (components/AllGamesClient.tsx) and the Home page sections
// (components/HomePageClient.tsx's GameSection) - same borders, radius,
// score/hours badges, and status pill - just without the admin long-press/
// 3-dot edit-delete menu those pages layer on top, since this component is
// a plain Server Component with no admin wiring.
import Image from "next/image";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { formatHours, getIcon } from "@/lib/gameHelpers";
import type { UiGame } from "@/lib/gameTypes";

function hasGoldenAchievement(game: UiGame) {
  return (
    game.achievement_badge === "platinum" ||
    game.achievement_badge === "100completion"
  );
}

function scoreBadgeClass(score?: string | number | null) {
  const value = Number(score || 0);

  if (value >= 76) return "bg-emerald-400 text-black";
  if (value >= 60) return "bg-yellow-400 text-black";
  if (value > 0) return "bg-red-400 text-black";

  return "bg-zinc-800 text-zinc-400";
}

function statusBadgeClass(status?: string | null) {
  switch (status) {
    case "Playing":
      return "border-blue-400/40 bg-blue-400/10 text-blue-300";
    case "Skipped":
      return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
    case "Dropped":
      return "border-red-400/40 bg-red-400/10 text-red-300";
    case "Completed":
      return "border-cyan-400/40 bg-cyan-400/10 text-cyan-300";
    case "Unplayed":
      return "border-yellow-400/40 bg-yellow-400/10 text-yellow-300";
    case "Wishlist":
      return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    default:
      return "border-zinc-800 bg-black/60 text-zinc-400";
  }
}

function getGameIcons(game: UiGame) {
  return Array.from(
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
}

export default function GameCardGrid({ games }: { games: UiGame[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
      {games.map((game, index) => {
        const golden = hasGoldenAchievement(game);
        const icons = getGameIcons(game);

        return (
          <Link
            key={game.id}
            href={`/game/${game.id}`}
            className={`group relative overflow-hidden rounded-[1.6rem] border bg-zinc-950/90 shadow-xl transition duration-300 hover:-translate-y-1 ${
              golden
                ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)] hover:border-yellow-300 hover:shadow-[0_0_42px_rgba(250,204,21,0.38)]"
                : "border-zinc-800 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
            }`}
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
              {game.Cover ? (
                <SafeImage
                  src={game.Cover}
                  alt={game.Title}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
                  loading={index < 6 ? "eager" : "lazy"}
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  🎮
                </div>
              )}

              {Number(game.Score || 0) > 0 && (
                <span
                  className={`absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${scoreBadgeClass(
                    game.Score
                  )}`}
                >
                  {game.Score}
                </span>
              )}

              {Number(game["Hours Played"] || 0) > 0 && (
                <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
                  {formatHours(game["Hours Played"])}h
                </span>
              )}
            </div>

            <div className="p-4">
              <h3 className="line-clamp-2 h-12 text-sm font-black leading-5 text-white">
                {game.Title}
              </h3>

              <div className="mt-2 flex h-5 items-center gap-2">
                {icons.map((item) => {
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

              <div className="mt-3">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusBadgeClass(
                    game.Status
                  )}`}
                >
                  {game.Status || "-"}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
