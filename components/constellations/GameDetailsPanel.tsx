"use client";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";
import {
  displayState,
  type PlayRoute,
  type RouteStatus,
} from "@/lib/constellations";
export default function GameDetailsPanel({
  route,
  gameId,
  isAdmin,
  busy,
  onClose,
  onMove,
  onRemove,
  onStatus,
  onSelect,
}: {
  route: PlayRoute;
  gameId: number;
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
  onStatus: (status: RouteStatus) => void;
  onSelect: (id: number) => void;
}) {
  const index = route.games.findIndex((g) => g.game_id === gameId),
    entry = route.games[index];
  if (!entry) return null;
  const game = entry.game,
    cover = getBestCover(game);
  return (
    <aside className="game-details" aria-label="Game details">
      <header>
        <span>YOUR COLLECTION</span>
        <button onClick={onClose} aria-label="Close game details">
          ×
        </button>
      </header>
      <div className="details-cover">
        {cover && (
          <SafeImage
            src={cover}
            alt=""
            fill
            sizes="300px"
            className="object-cover"
          />
        )}
      </div>
      <p className="eyebrow">
        {route.name}
      </p>
      <h2>{game.title}</h2>
      <p className="details-state">
        {displayState(route.games, index).toUpperCase()}
      </p>
      <dl>
        <div>
          <dt>Platform</dt>
          <dd>{game.platform || "—"}</dd>
        </div>
        <div>
          <dt>Playtime</dt>
          <dd>{game.hours_played != null ? `${game.hours_played} h` : "—"}</dd>
        </div>
      </dl>
      <div className="details-tags">
        {game.genres?.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <Link className="details-link" href={`/game/${game.id}`}>
        Full game details ↗
      </Link>
      {isAdmin && (
        <div className="details-controls">
          <label>
            Route status
            <select
              disabled={busy}
              value={entry.status}
              onChange={(e) => onStatus(e.target.value as RouteStatus)}
            >
              <option value="upcoming">Unplayed / Normal</option>
              <option value="current">Now Playing</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            disabled={busy || entry.status === "completed"}
            onClick={() => onStatus("completed")}
          >
            Mark Completed
          </button>
          <div>
            <button disabled={busy || index === 0} onClick={() => onMove(-1)}>
              ↑ Move Visually Up
            </button>
            <button
              disabled={busy || index === route.games.length - 1}
              onClick={() => onMove(1)}
            >
              ↓ Move Visually Down
            </button>
          </div>
          <button className="danger" disabled={busy} onClick={onRemove}>
            Remove From Route
          </button>
        </div>
      )}
      <h3>In This Route</h3>
      <ul className="details-order">
        {route.games.map((g, i) => (
          <li key={g.game_id}>
            <button
              aria-current={g.game_id === gameId ? "true" : undefined}
              onClick={() => onSelect(g.game_id)}
            >
              <span>
                {g.game.title}
                <small>
                  {displayState(route.games, i) === "current"
                    ? "NOW PLAYING"
                    : displayState(route.games, i) === "completed"
                        ? "✓ COMPLETED"
                        : ""}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
