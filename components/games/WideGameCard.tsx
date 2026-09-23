// Landscape game card for the /wishlist release calendar. Same border/
// radius/hover language as GameCardGrid, but built around the wide
// artwork the library already stores (wide_cover_url = Steam header,
// hero_url as fallback) instead of the portrait cover.
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { UiGame } from "@/lib/gameTypes";

export type WideGameCardTone = "released" | "upcoming" | "tba";

const TONE_CLASSES: Record<WideGameCardTone, string> = {
  released: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  upcoming: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  tba: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
};

function getWideImage(game: UiGame) {
  return game["Wide Cover"] || game.wide_cover_url || game.hero_url || game.Cover;
}

export default function WideGameCard({
  game,
  label,
  tone,
  compact = false,
  eager = false,
}: {
  game: UiGame;
  label: string;
  tone: WideGameCardTone;
  // Month columns stack several cards in a narrow column.
  compact?: boolean;
  eager?: boolean;
}) {
  const image = getWideImage(game);

  return (
    <Link
      href={`/game/${game.id}`}
      className={`group block overflow-hidden border border-zinc-800 bg-zinc-950/90 shadow-xl transition duration-300 hover:border-cyan-400/70 hover:shadow-cyan-950/40 ${
        compact ? "rounded-2xl" : "rounded-2xl hover:-translate-y-1 sm:rounded-[1.6rem]"
      }`}
    >
      <div className="relative aspect-[460/215] overflow-hidden bg-zinc-900">
        {image ? (
          <SafeImage
            src={image}
            alt={game.Title}
            fill
            sizes="(min-width: 1024px) 22vw, 48vw"
            loading={eager ? "eager" : "lazy"}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-black text-zinc-500">
            {game.Title}
          </div>
        )}
      </div>

      <div className={compact ? "p-2.5" : "p-2.5 sm:p-3"}>
        <h3 className="line-clamp-1 text-sm font-black text-white">
          {game.Title}
        </h3>

        <span
          className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${TONE_CLASSES[tone]}`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
