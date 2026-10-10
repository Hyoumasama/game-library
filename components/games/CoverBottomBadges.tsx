// Bottom overlay for cover-only game cards: a soft gradient, a pill of
// store/hardware icons on the left, and the hours pill on the right.
// Shared by the Home sections, All Games grid, and entity browsing pages.
import Image from "next/image";
import AwardBadge from "@/components/awards/AwardBadge";
import { formatHours, getIcon } from "@/lib/gameHelpers";
import { getIconBadgeWidth } from "@/lib/gameIcons";

type IconSource = {
  award_summary?: import("@/lib/awards").AwardSummary;
  Store?: string | null;
  Platform?: string | null;
  Hardware?: string | null;
  "Hours Played"?: string | number | null;
};

export function getGameIconItems(game: IconSource) {
  return Array.from(
    new Set(
      [game.Store, game.Hardware]
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
  }).filter((item, index, items) => items.findIndex(({ icon }) => icon === item.icon) === index);
}

export default function CoverBottomBadges({ game }: { game: IconSource }) {
  const icons = getGameIconItems(game);
  const hours = Number(game["Hours Played"] || 0);

  if (icons.length === 0 && hours <= 0 && !game.award_summary) return null;

  return (
    <>
      <AwardBadge summary={game.award_summary} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-1.5">
      {icons.length > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-black/70 px-2 py-1 backdrop-blur-sm">
          {icons.map(({ icon, value }) => (
            <Image
              key={icon}
              src={icon}
              alt=""
              width={getIconBadgeWidth(icon)}
              height={16}
              sizes={`${getIconBadgeWidth(icon)}px`}
              className="h-4 shrink-0 object-contain"
              style={{ width: getIconBadgeWidth(icon) }}
              title={value}
            />
          ))}
        </span>
      )}

      {hours > 0 && (
        <span className="ml-auto rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300 backdrop-blur-sm">
          {formatHours(game["Hours Played"])}h
        </span>
      )}
      </div>
    </>
  );
}
