"use client";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";
import { pipelineSlots, type PipelineGame } from "@/lib/pipeline";
import type { CSSProperties } from "react";

export default function PipelineGameNode({ game, index, count, editing, busy, onRemove, onMove, onActive }: {
  game: PipelineGame; index: number; count: number; editing: boolean; busy: boolean;
  onRemove: () => void; onMove: (offset: number) => void; onActive: (index: number | null) => void;
}) {
  const { setNodeRef, setActivatorNodeRef, transform, isDragging, attributes, listeners } = useSortable({ id: game.id, disabled: !editing || busy });
  const slot = pipelineSlots[index];
  const cover = getBestCover(game);
  const style = { "--node-x": `${slot.x}%`, "--node-y": `${slot.y}%`,
    "--node-width": `${(count > 8 ? 11 : 15) * slot.scale}%`,
    transform: CSS.Transform.toString(transform), zIndex: isDragging ? 30 : index === 0 ? 5 : 3,
  } as CSSProperties;
  const content = <>
    <div className="pipeline-cover">{cover ? <SafeImage src={cover} alt="" fill sizes="(max-width: 640px) 100px, 220px" className="object-cover" /> : <span>No cover</span>}
      <span className="pipeline-priority">#{index + 1}</span>
    </div>
    <div className="pipeline-node-caption"><h2>{game.title || "Untitled game"}</h2><span>{index === 0 ? "PLAY NEXT" : game.status === "Playing" ? "Playing" : "Backlog"}</span></div>
  </>;
  return <div ref={setNodeRef} style={style} className={`pipeline-node ${index === 0 ? "pipeline-first" : ""} ${editing ? "pipeline-editing" : ""} ${isDragging ? "pipeline-dragging" : ""}`}
    onMouseEnter={() => onActive(index)} onMouseLeave={() => onActive(null)} onFocus={() => onActive(index)} onBlur={() => onActive(null)}>
    {editing ? <div className="pipeline-card">{content}</div> : <Link href={`/game/${game.id}`} className="pipeline-card" aria-label={`Priority ${index + 1}: ${game.title}`}>{content}</Link>}
    {editing && <div className="pipeline-node-controls">
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={busy} className="pipeline-drag-handle" aria-label={`Drag ${game.title} to reorder`}>⠿</button>
      <button disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={`Move ${game.title} earlier`}>↑</button>
      <button disabled={busy || index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${game.title} later`}>↓</button>
      <button disabled={busy} onClick={onRemove} aria-label={`Remove ${game.title} from pipeline`}>×</button>
    </div>}
  </div>;
}
