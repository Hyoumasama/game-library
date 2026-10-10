"use client";
import { useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDroppable, useSensor, useSensors, closestCenter, pointerWithin, type CollisionDetection, type DragEndEvent, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AppNav from "@/components/AppNav";
import { useIsAdmin } from "@/lib/useAdminStatus";
import { displayState, orderedGames, routeTransferError, type PlayRoute } from "@/lib/constellations";
import ConstellationRoute, { ConstellationGameNode } from "./ConstellationRoute";
import GameDetailsPanel from "./GameDetailsPanel";
import { AddGamesToRouteModal, EditRouteModal } from "./RouteModals";
import "./constellations.css";
function SortableRoute(props: ComponentProps<typeof ConstellationRoute>) {
  const {setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging} = useSortable({id: props.route.id, data: {kind: "route", routeId: props.route.id}, disabled: !props.isAdmin || props.disabled});
  return <div ref={setNodeRef} className={`sortable-route ${isDragging ? "dragging" : ""}`} style={{transform: CSS.Transform.toString(transform), transition}}>
    <ConstellationRoute {...props} dragHandle={props.isAdmin ? <button ref={setActivatorNodeRef} className="route-drag-handle" {...attributes} {...listeners} disabled={props.disabled} aria-label={`Drag to arrange ${props.route.name}`} title="Drag to arrange">⠿</button> : undefined} />
  </div>;
}
type DragItem = {kind: "game"; routeId: string; gameId: number} | {kind: "route"; routeId: string};
type DropTarget = {routeId: string; gameId?: number};
const routeCollision: CollisionDetection = args => {
  const isRoute = args.active.data.current?.kind === "route";
  const droppableContainers = args.droppableContainers.filter(container => isRoute
    ? container.data.current?.kind === "route"
    : ["game", "route-target"].includes(container.data.current?.kind));
  const filtered = {...args, droppableContainers};
  if (isRoute || !args.pointerCoordinates) return closestCenter(filtered);
  const hits = pointerWithin(filtered);
  // Game targets take precedence over the enclosing card; no nearest-card move
  // when the pointer is outside all valid targets.
  const gameHits = hits.filter(hit => droppableContainers.find(c => c.id === hit.id)?.data.current?.kind === "game");
  return gameHits.length ? gameHits : hits;
};
const routeKeyboardCoordinates: KeyboardCoordinateGetter = (event, {context, currentCoordinates}) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code) || !context.active || !context.collisionRect) return;
  event.preventDefault();
  const rect = context.collisionRect, center = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  const isRoute = context.active.data.current?.kind === "route";
  const horizontal = event.code === "ArrowLeft" || event.code === "ArrowRight";
  const currentRouteId = context.over?.data.current?.routeId || context.active.data.current?.routeId;
  const candidates = context.droppableContainers.getEnabled().flatMap(container => {
    const data = container.data.current, target = context.droppableRects.get(container.id);
    if (!target || container.id === context.active?.id || (isRoute ? data?.kind !== "route" : data?.kind !== "game" && !(data?.kind === "route-target" && data.keyboardTarget))) return [];
    // The path alternates left/right within a card. Horizontal arrows should
    // reach another route, rather than another star on that same zigzag.
    if (!isRoute && horizontal && data?.routeId === currentRouteId) return [];
    const x = target.left + target.width / 2, y = target.top + target.height / 2;
    const dx = x - center.x, dy = y - center.y;
    const forward = event.code === "ArrowRight" ? dx : event.code === "ArrowLeft" ? -dx : event.code === "ArrowDown" ? dy : -dy;
    if (forward <= 1) return [];
    return [{x, y, score: forward + Math.abs(horizontal ? dy : dx) * 3}];
  }).sort((a, b) => a.score - b.score);
  const next = candidates[0];
  return next ? {x: currentCoordinates.x + next.x - center.x, y: currentCoordinates.y + next.y - center.y} : undefined;
};
function RouteLink({route, focused, disabled, visible, dropState, onClick}: {route: PlayRoute; focused: boolean; disabled: boolean; visible: boolean; dropState?: "allowed" | "blocked"; onClick: () => void}) {
  const {setNodeRef} = useDroppable({id: `route-nav:${route.id}`, data: {kind: "route-target", routeId: route.id, keyboardTarget: !visible}, disabled});
  return <button ref={setNodeRef} aria-pressed={focused} className={dropState ? `drop-${dropState}` : undefined} onClick={onClick}>
    <span><i style={{color: route.accent}}>{route.icon}</i> {route.name}</span><span>{route.games.length}</span>
  </button>;
}
export default function PlayConstellationsPage({
  initialRoutes,
  initialError,
}: {
  initialRoutes: PlayRoute[];
  initialError: string;
}) {
  const [routes, setRoutes] = useState(initialRoutes),
    [focus, setFocus] = useState<string | null>(null),
    [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{
      routeId: string;
      gameId: number;
    } | null>(null),
    [modal, setModal] = useState<{
      kind: "add" | "edit" | "games";
      id?: string;
    } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError),
    [message, setMessage] = useState("");
  const saving = useRef(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const blocked = !!initialError || refreshRequired;
  const isAdmin = useIsAdmin();
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const draggedRoute = dragItem?.kind === "game" ? routes.find(r => r.id === dragItem.routeId) : undefined;
  const draggedIndex = draggedRoute && dragItem?.kind === "game" ? draggedRoute.games.findIndex(g => g.game_id === dragItem.gameId) : -1;
  const draggedEntry = draggedRoute?.games[draggedIndex];
  function dropState(route: PlayRoute) {
    if (dragItem?.kind !== "game" || !draggedRoute || dropTarget?.routeId !== route.id || route.id === draggedRoute.id) return undefined;
    return routeTransferError(draggedRoute, route, dragItem.gameId) ? "blocked" as const : "allowed" as const;
  }
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(KeyboardSensor, {coordinateGetter: routeKeyboardCoordinates}));
  async function reorderRoutes({active, over}: DragEndEvent) {
    if (!over || active.id === over.id || !isAdmin || saving.current || blocked) return;
    const from = routes.findIndex(r => r.id === active.id), to = routes.findIndex(r => r.id === over.id);
    if (from < 0 || to < 0) return;
    const before = routes, arranged = arrayMove(routes, from, to);
    setRoutes(arranged);
    if (!await mutate("reorder", undefined, undefined, arranged.map(r => ({id: r.id, revision: r.revision})))) setRoutes(before);
  }
  async function finishDrag(event: DragEndEvent) {
    setDragItem(null);
    setDropTarget(null);
    if (!isAdmin || saving.current || blocked || !event.over) return;
    const item = event.active.data.current;
    if (item?.kind === "route") return reorderRoutes(event);
    const target = event.over.data.current;
    if (item?.kind !== "game" || !target?.routeId) return;
    const source = routes.find(r => r.id === item.routeId), destination = routes.find(r => r.id === target.routeId);
    if (!source || !destination) return;
    if (source.id === destination.id) {
      const from = source.games.findIndex(g => g.game_id === item.gameId);
      const to = target.kind === "game" ? source.games.findIndex(g => g.game_id === target.gameId) : source.games.length - 1;
      if (from < 0 || to < 0 || from === to) return;
      const games = orderedGames(arrayMove(source.games, from, to)), before = routes;
      setRoutes(current => current.map(r => r.id === source.id ? {...r, games} : r));
      if (!await mutate("save", source, {games})) setRoutes(before);
      return;
    }
    const problem = routeTransferError(source, destination, item.gameId);
    if (problem) {setError(problem); setMessage(""); return;}
    const entry = source.games.find(g => g.game_id === item.gameId)!;
    const beforeGameId = target.kind === "game" ? target.gameId as number : undefined;
    const index = beforeGameId === undefined ? destination.games.length : destination.games.findIndex(g => g.game_id === beforeGameId);
    if (index < 0) return;
    const added = [...destination.games];
    added.splice(index, 0, entry);
    const before = routes, previousSelection = selection;
    setRoutes(current => current.map(r => r.id === source.id ? {...r, games: orderedGames(source.games.filter(g => g.game_id !== item.gameId))} : r.id === destination.id ? {...r, games: orderedGames(added)} : r));
    if (selection?.routeId === source.id && selection.gameId === item.gameId) setSelection({routeId: destination.id, gameId: item.gameId});
    if (!await mutate("move", undefined, undefined, undefined, {
      source_id: source.id, source_revision: source.revision,
      destination_id: destination.id, destination_revision: destination.revision,
      game_id: item.gameId, before_game_id: beforeGameId,
    })) {setRoutes(before); setSelection(previousSelection);}
  }
  const selectedRoute = routes.find((r) => r.id === selection?.routeId),
    modalRoute = routes.find((r) => r.id === modal?.id);
  async function mutate(
    action: string,
    route?: PlayRoute,
    data?: Partial<PlayRoute>,
    order?: {id: string; revision: number}[],
    transfer?: {source_id: string; source_revision: number; destination_id: string; destination_revision: number; game_id: number; before_game_id?: number},
  ) {
    if (saving.current || blocked) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("Saving…");
    try {
      const response = await fetch("/api/play-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...route,
          ...data,
          ...transfer,
          action,
          routes: order,
          games: (data?.games || route?.games)?.map((g) => ({
            game_id: g.game_id,
            status: g.status,
          })),
        }),
      });
      const result = await response.json();
      if (response.status === 409) setRefreshRequired(true);
      if (!response.ok)
        throw new Error(result.error || "Unable to save route.");
      // Read the persisted order and revision back, including server-normalized positions.
      setRefreshRequired(true);
      const reload = await fetch("/api/play-routes", { cache: "no-store" });
      if (!reload.ok)
        throw new Error(
          "Saved, but unable to reload routes. Refresh before editing.",
        );
      const fresh = await reload.json();
      setRoutes(fresh.routes);
      setRefreshRequired(false);
      setSelection((current) => current && fresh.routes.some((r: PlayRoute) => r.id === current.routeId && r.games.some(g => g.game_id === current.gameId)) ? current : null);
      setMessage("Routes saved");
      if (action === "delete") {
        setFocus(null);
        setSelection(null);
      }
      return true;
    } catch (err) {
      setMessage("");
      setError(err instanceof Error ? err.message : "Unable to save.");
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function updateSelected(games: PlayRoute["games"]) {
    if (selectedRoute)
      void mutate("save", selectedRoute, { games: orderedGames(games) });
  }
  function open(kind: "add" | "edit" | "games", id?: string) {
    setError("");
    setModal({ kind, id });
  }
  const shown = routes.filter(
    (r) =>
      (!focus || r.id === focus) &&
      (!search.trim() ||
        `${r.name} ${r.games.map((g) => g.game.title).join(" ")}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  return (
    <main className="constellations-page">
      <div className="constellations-shell">
        <AppNav />
        <header className="constellations-header">
          <div>
            <p className="eyebrow">YOUR PERSONAL STAR ATLAS</p>
            <h1>
              Play Constellations<span>✦</span>
            </h1>
            <p>Explore your game collections. Play whichever adventure you choose.</p>
          </div>
          <div className="header-actions">
            <span>
              {routes.length} routes ·{" "}
              {routes.reduce((n, r) => n + r.games.length, 0)} stars
            </span>
            {isAdmin && (
              <>
                <button
                  className="primary"
                  disabled={busy || blocked}
                  onClick={() => open("add")}
                >
                  + Add Route
                </button>
                <button
                  disabled={busy || blocked || !routes.length}
                  onClick={() => open("edit", focus || routes[0].id)}
                >
                  Edit Routes
                </button>
              </>
            )}
          </div>
        </header>
        <div className="constellations-tools">
          <input
            aria-label="Search routes and games"
            placeholder="Search routes or games…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="state-legend">
            <span>● Now playing</span>
            <span>◉ Normal</span>
            <span>✓ Completed</span>
          </div>
        </div>
        {error && (
          <p className="route-error" role="alert">
            {error}
          </p>
        )}
        <p className="save-message" role="status">
          {message}
        </p>
        <DndContext sensors={sensors} collisionDetection={routeCollision}
          onDragStart={({active}) => {setDragItem(active.data.current as DragItem); setError("");}}
          onDragOver={({over}) => setDropTarget(over?.data.current?.routeId ? {routeId: over.data.current.routeId, gameId: over.data.current.kind === "game" ? over.data.current.gameId : undefined} : null)}
          onDragEnd={finishDrag} onDragCancel={() => {setDragItem(null); setDropTarget(null);}}>
        <div
          className={`atlas-layout ${selectedRoute && selection ? "with-details" : ""}`}
        >
          <nav className="routes-sidebar" aria-label="Play routes">
            <p className="eyebrow">EXPLORE</p>
            <button aria-pressed={!focus} onClick={() => setFocus(null)}>
              <span>✧ All Routes</span>
              <span>{routes.length}</span>
            </button>
            {routes.map((r) => (
              <RouteLink
                key={r.id}
                route={r} focused={focus === r.id} disabled={!isAdmin || busy || blocked}
                visible={shown.some(route => route.id === r.id)}
                dropState={dropState(r)}
                onClick={() => setFocus(r.id)}
              />
            ))}
            <p className="sidebar-note">
              Each route is a constellation.
              <br />
              Every game, a new destination.
            </p>
          </nav>
          <SortableContext items={shown.map(r => r.id)} strategy={rectSortingStrategy}>
          <div className="routes-area">
            {shown.map((route) => (
              <SortableRoute
                key={route.id}
                route={route}
                selected={
                  selection?.routeId === route.id ? selection.gameId : undefined
                }
                isAdmin={isAdmin}
                disabled={busy || blocked}
                dropState={dropState(route)}
                dropBeforeGameId={dropTarget?.routeId === route.id ? dropTarget.gameId : undefined}
                onSelect={(gameId) =>
                  setSelection({ routeId: route.id, gameId })
                }
                onEdit={() => open("edit", route.id)}
                onAdd={() => open("games", route.id)}
              />
            ))}
            {!shown.length && (
              <div className="route-empty">
                <span>✧</span>
                <h2>
                  {routes.length
                    ? "No matching routes"
                    : "Chart your first constellation"}
                </h2>
                <p>
                  {routes.length
                    ? "Try another search or explore all routes."
                    : "Create a route and choose games from your library."}
                </p>
              </div>
            )}
          </div>
          </SortableContext>
          {selectedRoute && selection && (
            <GameDetailsPanel
              route={selectedRoute}
              gameId={selection.gameId}
              isAdmin={isAdmin}
              busy={busy || blocked}
              onClose={() => setSelection(null)}
              onSelect={(gameId) => setSelection({ ...selection, gameId })}
              onMove={(offset) => {
                const index = selectedRoute.games.findIndex(
                  (g) => g.game_id === selection.gameId,
                );
                updateSelected(
                  arrayMove(selectedRoute.games, index, index + offset),
                );
              }}
              onRemove={() =>
                updateSelected(
                  selectedRoute.games.filter(
                    (g) => g.game_id !== selection.gameId,
                  ),
                )
              }
              onStatus={(status) =>
                updateSelected(
                  selectedRoute.games.map((g) =>
                    g.game_id === selection.gameId
                      ? { ...g, status }
                      : status === "current" && g.status === "current"
                        ? { ...g, status: "upcoming" }
                        : g,
                  ),
                )
              }
            />
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedEntry && draggedRoute && <div className="constellation-drag-preview" style={{"--route-color": draggedRoute.accent} as CSSProperties}>
            <ConstellationGameNode entry={draggedEntry} index={draggedIndex} state={displayState(draggedRoute.games, draggedIndex)} selected={false} onSelect={() => {}} onHover={() => {}} />
          </div>}
        </DragOverlay>
        </DndContext>
        <footer className="atlas-footer">
          PLAY AT YOUR OWN PACE <span>✦</span> FOLLOW YOUR OWN STARS
        </footer>
      </div>
      {modal?.kind === "add" && (
        <EditRouteModal
          busy={busy}
          error={error}
          onClose={() => setModal(null)}
          onSave={(data) => mutate("create", undefined, data)}
        />
      )}{" "}
      {modal?.kind === "edit" && modalRoute && (
        <EditRouteModal
          key={modalRoute.id}
          route={modalRoute}
          busy={busy}
          error={error}
          onClose={() => setModal(null)}
          onSave={(data) => mutate("save", modalRoute, data)}
          onDelete={() => mutate("delete", modalRoute)}
        />
      )}{" "}
      {modal?.kind === "games" && modalRoute && (
        <AddGamesToRouteModal
          route={modalRoute}
          busy={busy}
          error={error}
          onClose={() => setModal(null)}
          onAdd={(games) =>
            mutate("save", modalRoute, {
              games: orderedGames([
                ...modalRoute.games,
                ...games.map((game) => ({
                  game_id: game.id,
                  game,
                  position: 0,
                  status: "upcoming" as const,
                })),
              ]),
            })
          }
        />
      )}
    </main>
  );
}
