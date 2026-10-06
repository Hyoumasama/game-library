"use client";
import { useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import AppNav from "@/components/AppNav";
import { useIsAdmin } from "@/lib/useAdminStatus";
import { orderedGames, type PlayRoute } from "@/lib/constellations";
import ConstellationRoute from "./ConstellationRoute";
import GameDetailsPanel from "./GameDetailsPanel";
import { AddGamesToRouteModal, EditRouteModal } from "./RouteModals";
import "./constellations.css";
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
  const selectedRoute = routes.find((r) => r.id === selection?.routeId),
    modalRoute = routes.find((r) => r.id === modal?.id);
  async function mutate(
    action: string,
    route?: PlayRoute,
    data?: Partial<PlayRoute>,
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
          action,
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
            <p>Chart your next adventures across curated game routes.</p>
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
            <span>◉ Next</span>
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
              <button
                key={r.id}
                aria-pressed={focus === r.id}
                onClick={() => setFocus(r.id)}
              >
                <span>
                  <i style={{ color: r.accent }}>{r.icon}</i> {r.name}
                </span>
                <span>{r.games.length}</span>
              </button>
            ))}
            <p className="sidebar-note">
              Each route is a constellation.
              <br />
              Every game, a new destination.
            </p>
          </nav>
          <div className="routes-area">
            {shown.map((route) => (
              <ConstellationRoute
                key={route.id}
                route={route}
                selected={
                  selection?.routeId === route.id ? selection.gameId : undefined
                }
                isAdmin={isAdmin}
                disabled={busy || blocked}
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
