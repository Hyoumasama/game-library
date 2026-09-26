// Bottom overlay for cover-only game cards: a soft gradient, a pill of
// store/platform/hardware icons on the left, and the hours pill on the right.
// Shared by the Home sections, All Games grid, and entity browsing pages.
import Image from "next/image";
import { formatHours, getIcon } from "@/lib/gameHelpers";

type IconSource = {
  Store?: string | null;
  Platform?: string | null;
  Hardware?: string | null;
  "Hours Played"?: string | number | null;
};

export function getGameIconItems(game: IconSource) {
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
  ).map((item) => {
    const [icon, value] = item.split("|||");
    return { icon, value };
  });
}

export default function CoverBottomBadges({ game }: { game: IconSource }) {
  const icons = getGameIconItems(game);
  const hours = Number(game["Hours Played"] || 0);

  if (icons.length === 0 && hours <= 0) return null;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

      {icons.length > 0 && (
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-black/70 px-2 py-1 backdrop-blur-sm">
          {icons.map(({ icon, value }) => (
            <Image
              key={icon}
              src={icon}
              alt=""
              width={16}
              height={16}
              sizes="16px"
              className="h-4 w-4 object-contain"
              title={value}
            />
          ))}
        </span>
      )}

      {hours > 0 && (
        <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300 backdrop-blur-sm">
          {formatHours(game["Hours Played"])}h
        </span>
      )}
    </>
  );
}
