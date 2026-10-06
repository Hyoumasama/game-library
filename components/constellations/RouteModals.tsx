"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  orderedGames,
  routeIcons,
  type PlayRoute,
  type RouteGame,
} from "@/lib/constellations";
import type { PipelineGame } from "@/lib/pipeline";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";

export function RouteDialog({
  title,
  busy,
  error,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="route-modal"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="route-dialog-title"
    >
      <header>
        <h2 id="route-dialog-title">{title}</h2>
        <button disabled={busy} onClick={onClose} aria-label="Close dialog">
          ×
        </button>
      </header>
      {error && (
        <p role="alert" className="route-error">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}
function SortableGame({
  entry,
  index,
  count,
  busy,
  onRemove,
  onMove,
}: {
  entry: RouteGame;
  index: number;
  count: number;
  busy: boolean;
  onRemove: () => void;
  onMove: (offset: number) => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: entry.game_id, disabled: busy });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="edit-game"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="drag-handle"
        disabled={busy}
        aria-label={`Drag ${entry.game.title}`}
      >
        ⠿
      </button>
      <span>
        {index + 1}. {entry.game.title}
      </span>
      <button
        type="button"
        disabled={busy || index === 0}
        onClick={() => onMove(-1)}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={busy || index === count - 1}
        onClick={() => onMove(1)}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        aria-label={`Remove ${entry.game.title}`}
      >
        ×
      </button>
    </li>
  );
}
export function EditRouteModal({
  route,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  route?: PlayRoute;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (
    data: Pick<PlayRoute, "name" | "icon" | "accent" | "description" | "games">,
  ) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}) {
  const [name, setName] = useState(route?.name || "");
  const [icon, setIcon] = useState(route?.icon || "✦");
  const [accent, setAccent] = useState(route?.accent || "#67e8f9");
  const [description, setDescription] = useState(route?.description || "");
  const [games, setGames] = useState(route?.games || []);
  const [confirm, setConfirm] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <RouteDialog
      title={route ? "Edit Route" : "Add Route"}
      busy={busy}
      error={error}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await onSave({
              name: name.trim(),
              icon,
              accent,
              description,
              games: orderedGames(games),
            })
          )
            onClose();
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Route Name
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Steam Deck Route"
            />
          </label>
          <div className="route-form-row">
            <label>
              Icon
              <select value={icon} onChange={(e) => setIcon(e.target.value)}>
                {routeIcons.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Accent
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </label>
          </div>
          <label>
            Description <small>(optional)</small>
            <textarea
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </fieldset>
        {route && (
          <>
            <h3>Game order</h3>
            <p className="muted">Drag to reorder, or use the arrow buttons.</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!busy && over && active.id !== over.id)
                  setGames(
                    arrayMove(
                      games,
                      games.findIndex((g) => g.game_id === active.id),
                      games.findIndex((g) => g.game_id === over.id),
                    ),
                  );
              }}
            >
              <SortableContext
                items={games.map((g) => g.game_id)}
                strategy={verticalListSortingStrategy}
              >
                <ol>
                  {games.map((entry, i) => (
                    <SortableGame
                      key={entry.game_id}
                      entry={entry}
                      index={i}
                      count={games.length}
                      busy={busy}
                      onRemove={() =>
                        setGames(
                          games.filter((g) => g.game_id !== entry.game_id),
                        )
                      }
                      onMove={(offset) =>
                        setGames(arrayMove(games, i, i + offset))
                      }
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </>
        )}
        <footer>
          {onDelete && (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm) setConfirm(true);
                else if (await onDelete()) onClose();
              }}
            >
              {confirm ? "Confirm delete route" : "Delete Route"}
            </button>
          )}
          <button
            type="submit"
            className="primary"
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving…" : "Save Route"}
          </button>
        </footer>
      </form>
    </RouteDialog>
  );
}
export function AddGamesToRouteModal({
  route,
  busy,
  error,
  onClose,
  onAdd,
}: {
  route: PlayRoute;
  busy: boolean;
  error: string;
  onClose: () => void;
  onAdd: (games: PipelineGame[]) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PipelineGame[]>([]);
  const [result, setResult] = useState<{
    games: PipelineGame[];
    hasMore: boolean;
    key: string;
  } | null>(null);
  const [searchError, setSearchError] = useState("");
  const key = `${search}:${page}`;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/pipeline/library?search=${encodeURIComponent(search)}&page=${page}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Unable to search library.");
        setResult({ ...(await response.json()), key: `${search}:${page}` });
        setSearchError("");
      } catch (err) {
        if (!controller.signal.aborted)
          setSearchError(err instanceof Error ? err.message : "Search failed.");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page]);
  const loading = result?.key !== key;
  return (
    <RouteDialog
      title={`Add Games · ${route.name}`}
      busy={busy}
      error={error || searchError}
      onClose={onClose}
    >
      <input
        autoFocus
        aria-label="Search library"
        placeholder="Search your library…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      <p className="muted">
        {selected.length} selected · added in selection order ·{" "}
        {100 - route.games.length} spaces available
      </p>
      <div className="library-results" aria-busy={loading}>
        {loading ? (
          <p role="status">Searching…</p>
        ) : !result?.games.length ? (
          <p>No games found.</p>
        ) : (
          result.games.map((game) => {
            const cover = getBestCover(game),
              existing = route.games.some((g) => g.game_id === game.id),
              checked = selected.some((g) => g.id === game.id);
            return (
              <button
                className={`library-game ${checked ? "checked" : ""}`}
                key={game.id}
                disabled={
                  busy ||
                  existing ||
                  (!checked && selected.length + route.games.length >= 100)
                }
                aria-pressed={checked}
                onClick={() =>
                  setSelected(
                    checked
                      ? selected.filter((g) => g.id !== game.id)
                      : [...selected, game],
                  )
                }
              >
                <span className="library-cover">
                  {cover && (
                    <SafeImage
                      src={cover}
                      alt=""
                      fill
                      sizes="42px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span>
                  {game.title}
                  <small>{game.platform || "Platform unavailable"}</small>
                </span>
                <span>{existing ? "Added" : checked ? "✓" : "+"}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="pagination">
        <button disabled={busy || page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={busy || loading || !result?.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      <footer>
        <button
          className="primary"
          disabled={busy || !selected.length}
          onClick={async () => {
            if (await onAdd(selected)) onClose();
          }}
        >
          Add {selected.length} Games
        </button>
      </footer>
    </RouteDialog>
  );
}
