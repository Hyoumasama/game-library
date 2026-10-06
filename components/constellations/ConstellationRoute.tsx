"use client";
import { useState, type CSSProperties } from "react";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";
import {
  constellationSlots,
  displayState,
  type PlayRoute,
  type RouteGame,
} from "@/lib/constellations";

export function ConstellationGameNode({
  entry,
  index,
  state,
  selected,
  onSelect,
  onHover,
}: {
  entry: RouteGame;
  index: number;
  state: string;
  selected: boolean;
  onSelect: () => void;
  onHover: (index: number | null) => void;
}) {
  const cover = getBestCover(entry.game);
  return (
    <button
      className={`star-node state-${state} ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      aria-label={`${index + 1}. ${entry.game.title}, ${state}`}
      aria-pressed={selected}
    >
      <span className="star-cover">
        {cover ? (
          <SafeImage
            src={cover}
            alt=""
            fill
            sizes="110px"
            className="object-cover"
          />
        ) : (
          <span>✦</span>
        )}
        <span className="star-position">
          {state === "completed" ? "✓ " : ""}
          {index + 1}
        </span>
      </span>
      <span className="star-title">{entry.game.title}</span>
      <span className="star-status">
        {state === "current"
          ? "NOW PLAYING"
          : state === "next"
            ? "NEXT"
            : state === "completed"
              ? "COMPLETED"
              : ""}
      </span>
    </button>
  );
}
export function ConstellationConnections({
  count,
  active,
  previous,
  next,
}: {
  count: number;
  active: number | null;
  previous: boolean;
  next: boolean;
}) {
  return (
    <svg
      className="constellation-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {previous && <path d="M 0 45 C 4 45, 4 30, 8 30" />}
      {next && <path d="M 92 60 C 96 60, 96 45, 100 45" />}
      {Array.from({ length: Math.max(0, count - 1) }, (_, i) => {
        const a = constellationSlots[i],
          b = constellationSlots[i + 1],
          middle = (a.x + b.x) / 2;
        return (
          <g key={i} className={active === i || active === i + 1 ? "lit" : ""}>
            <path
              d={`M ${a.x} ${a.y} C ${middle} ${a.y}, ${middle} ${b.y}, ${b.x} ${b.y}`}
            />
            <circle cx={middle} cy={(a.y + b.y) / 2} r=".35" />
          </g>
        );
      })}
    </svg>
  );
}
export default function ConstellationRoute({
  route,
  selected,
  isAdmin,
  disabled,
  onSelect,
  onEdit,
  onAdd,
}: {
  route: PlayRoute;
  selected: number | undefined;
  isAdmin: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
  onEdit: () => void;
  onAdd: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const pages = Math.max(1, Math.ceil(route.games.length / 6));
  return (
    <section
      className="constellation-route"
      style={{ "--accent": route.accent } as CSSProperties}
      aria-label={route.name}
    >
      <header>
        <div className="route-heading">
          <span className="route-symbol">{route.icon}</span>
          <div>
            <h2>{route.name}</h2>
            <p>
              {route.games.length} games ·{" "}
              {route.games.filter((g) => g.status === "completed").length}{" "}
              completed
            </p>
            {route.description && <p>{route.description}</p>}
          </div>
        </div>
        {isAdmin && (
          <div className="route-actions">
            <button disabled={disabled} onClick={onAdd}>
              + Add Games
            </button>
            <button disabled={disabled} onClick={onEdit}>
              Edit
            </button>
          </div>
        )}
      </header>
      {!route.games.length ? (
        <div className="route-empty">
          <span>✧</span>
          <h3>An adventure waiting to be charted</h3>
          <p>Add games from your library to connect your first stars.</p>
          {isAdmin && (
            <button disabled={disabled} onClick={onAdd}>
              + Add Games
            </button>
          )}
        </div>
      ) : (
        <div className="constellation-scroll">
          <div
            className="constellation-track"
            style={{ "--pages": pages } as CSSProperties}
          >
            {Array.from({ length: pages }, (_, page) => {
              const batch = route.games.slice(page * 6, page * 6 + 6);
              return (
                <div className="constellation-segment" key={page}>
                  <ConstellationConnections
                    count={batch.length}
                    active={active === null ? null : active - page * 6}
                    previous={page > 0}
                    next={page < pages - 1}
                  />
                  {page > 0 && (
                    <span className="route-continuation">
                      Continued from #{page * 6} →
                    </span>
                  )}
                  {batch.map((entry, i) => (
                    <div
                      className="star-slot"
                      key={entry.game_id}
                      style={
                        {
                          "--x": `${constellationSlots[i].x}%`,
                          "--y": `${constellationSlots[i].y}%`,
                        } as CSSProperties
                      }
                    >
                      <ConstellationGameNode
                        entry={entry}
                        index={page * 6 + i}
                        state={displayState(route.games, page * 6 + i)}
                        selected={selected === entry.game_id}
                        onSelect={() => onSelect(entry.game_id)}
                        onHover={setActive}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
