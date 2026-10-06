"use client";
import { useRef, useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import AppNav from "@/components/AppNav";
import { useIsAdmin } from "@/lib/useAdminStatus";
import { PIPELINE_LIMIT, type PipelineGame } from "@/lib/pipeline";
import PipelineBrain from "./PipelineBrain";
import NeuralConnections from "./NeuralConnections";
import PipelineGameNode from "./PipelineGameNode";
import PipelineToolbar from "./PipelineToolbar";
import AddPipelineGameModal from "./AddPipelineGameModal";
import "./pipeline.css";

export default function PlayPipelinePage({ initialGames, initialError = "" }: { initialGames: PipelineGame[]; initialError?: string }) {
  const [games, setGames] = useState(initialGames);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [active, setActive] = useState<number | null>(null);
  const saving = useRef(false);
  const isAdmin = useIsAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function save(next: PipelineGame[]) {
    if (saving.current || initialError) return false;
    saving.current = true; setBusy(true); setError(""); setMessage("Saving…");
    const previous = games; setGames(next);
    try {
      const response = await fetch("/api/pipeline", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameIds: next.map((game) => game.id), expectedIds: previous.map((game) => game.id) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save pipeline.");
      setMessage("Pipeline saved"); return true;
    } catch (err) {
      setGames(previous); setMessage(""); setError(err instanceof Error ? err.message : "Unable to save pipeline."); return false;
    } finally { saving.current = false; setBusy(false); }
  }
  function dragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    if (!over || dragged.id === over.id) return;
    const from = games.findIndex((game) => game.id === dragged.id), to = games.findIndex((game) => game.id === over.id);
    if (from >= 0 && to >= 0) void save(arrayMove(games, from, to));
  }
  return <main className="pipeline-page"><div className="pipeline-shell"><AppNav />
    <PipelineToolbar count={games.length} editing={editing} busy={busy || !!initialError} isAdmin={isAdmin} onAdd={() => setAdding(true)} onEdit={() => setEditing(!editing)} />
    <div className="pipeline-feedback" role={error ? "alert" : "status"}>{error ? <>{error} <button onClick={() => window.location.reload()}>Reload</button></> : editing ? `${message ? `${message} · ` : ""}Drag a handle to reorder, or use the arrow buttons.` : message}</div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd} onDragCancel={() => setActive(null)}>
      <section className={`pipeline-map ${games.length > 8 ? "pipeline-dense" : ""}`} aria-label="Games in priority order">
        <PipelineBrain /><NeuralConnections count={games.length} active={active} />
        {!initialError && games.length === 0 && <div className="pipeline-empty"><span aria-hidden="true">✦</span><h2>Your next adventure starts here.</h2><p>Add games to build your play pipeline.</p>{isAdmin ? <button className="pipeline-button pipeline-primary" onClick={() => setAdding(true)}>+ Add Game</button> : <p>Log in as admin to build your pipeline.</p>}</div>}
        <SortableContext items={games.map((game) => game.id)} strategy={rectSortingStrategy}>
          {games.map((game, index) => <PipelineGameNode key={game.id} game={game} index={index} count={games.length} editing={editing && isAdmin} busy={busy} onActive={setActive} onRemove={() => void save(games.filter((item) => item.id !== game.id))} onMove={(offset) => void save(arrayMove(games, index, index + offset))} />)}
        </SortableContext>
      </section>
    </DndContext>
    {adding && isAdmin && <AddPipelineGameModal selectedIds={games.map((game) => game.id)} busy={busy} saveError={error} onClose={() => setAdding(false)} onAdd={(game) => games.length < PIPELINE_LIMIT && !games.some((item) => item.id === game.id) ? save([...games, game]) : Promise.resolve(false)} />}
  </div></main>;
}
