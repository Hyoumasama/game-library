"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type ComponentProps, type ButtonHTMLAttributes } from "react";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";
import {
  verticalConstellationSlots,
  displayState,
  getConnectionState,
  type PlayRoute,
  type RouteGame,
} from "@/lib/constellations";

type VisualState = ReturnType<typeof displayState>;
function RouteActions({ name, disabled, onAdd, onEdit }: { name: string; disabled: boolean; onAdd: () => void; onEdit: () => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) ref.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function run(action: () => void) { if (ref.current) ref.current.open = false; action(); }
  return <details ref={ref} className="route-actions" onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }} onKeyDown={event => {
    if (event.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); }
  }}>
    <summary className="route-action-trigger" aria-label={`Actions for ${name}`}><span aria-hidden="true"><i /><i /><i /></span></summary>
    <div className="route-action-menu"><button disabled={disabled} onClick={() => run(onAdd)}>+ Add Games</button><button disabled={disabled} onClick={() => run(onEdit)}>Edit</button></div>
  </details>;
}
function connectionColor(state: VisualState) {
  return state === "current" ? "#f4f7ff" : state === "completed" ? "#f5c451" : stateColor(state);
}
function stateColor(state: VisualState) {
  if (state === "current") return "#edf4ff";
  if (state === "completed") return "#e9be70";
  return "var(--route-color)";
}

export function ConstellationGameNode({
  entry,
  index,
  state,
  selected,
  onSelect,
  onHover,
  dragProps,
}: {
  entry: RouteGame;
  index: number;
  state: VisualState;
  selected: boolean;
  onSelect: () => void;
  onHover: (index: number | null) => void;
  dragProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const cover = getBestCover(entry.game);
  return (
    <button
      {...dragProps}
      className={`star-node state-${state} ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      aria-label={`${entry.game.title}, ${state}`}
      aria-pressed={selected}
      title={entry.game.title || undefined}
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
        {state === "completed" && <span className="star-completed" aria-label="Completed">✓</span>}
      </span>
      <span className="star-title">{entry.game.title}</span>
    </button>
  );
}
function SortableGameNode({enabled, ...props}: ComponentProps<typeof ConstellationGameNode> & {enabled: boolean}) {
  const {setNodeRef, attributes, listeners, transform, transition, isDragging} = useSortable({id: props.entry.game_id, disabled: !enabled});
  return <div ref={setNodeRef} className={`sortable-game ${enabled ? "can-drag" : ""} ${isDragging ? "dragging" : ""}`} style={{transform: CSS.Transform.toString(transform), transition}}>
    <ConstellationGameNode {...props} dragProps={enabled ? {...attributes, ...listeners} : undefined} />
  </div>;
}
export function ConstellationConnections({
  states,
  active,
  previousState,
  followingGroupState,
}: {
  states: VisualState[];
  active: number | null;
  previousState?: VisualState;
  followingGroupState?: VisualState;
}) {
  const id = useId().replace(/:/g, "_");
  const slots = verticalConstellationSlots(states.length);
  const segments = states.slice(0, -1).flatMap((state, i) => {
    const a = slots[i],
      b = slots[i + 1],
      middle = (a.y + b.y) / 2;
    const center = { x: (a.x + b.x) / 2, y: middle };
    return [{
      key: `pair-${i}`,
      start: state,
      end: state,
      fade: state !== states[i + 1],
      reverse: false,
      from: state, to: states[i + 1],
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      d: `M ${a.x} ${a.y} C ${a.x} ${(a.y + middle) / 2}, ${(3 * a.x + b.x) / 4} ${(a.y + 3 * middle) / 4}, ${center.x} ${center.y}`,
      lit: active === i || active === i + 1,
      star: center,
    }, {
      key: `pair-${i}-end`,
      start: states[i + 1], end: states[i + 1],
      fade: state !== states[i + 1], reverse: true,
      from: state, to: states[i + 1],
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      d: `M ${center.x} ${center.y} C ${(a.x + 3 * b.x) / 4} ${(3 * middle + b.y) / 4}, ${b.x} ${(middle + b.y) / 2}, ${b.x} ${b.y}`,
      lit: active === i || active === i + 1,
      star: center,
    }];
  });
  // Group boundaries are the midpoint: each side follows its nearest game.
  if (previousState)
    segments.unshift({
      key: "previous",
      start: states[0],
      end: states[0],
      fade: previousState !== states[0], reverse: true,
      from: previousState, to: states[0],
      x1: 50,
      y1: -slots[0].y,
      x2: slots[0].x,
      y2: slots[0].y,
      d: `M 50 0 C 50 0, ${slots[0].x} 0, ${slots[0].x} ${slots[0].y}`,
      lit: active === -1 || active === 0,
      star: { x: 50, y: 0 },
    });
  if (followingGroupState)
    segments.push({
      key: "following-group",
      start: states[states.length - 1],
      end: states[states.length - 1],
      fade: followingGroupState !== states[states.length - 1], reverse: false,
      from: states[states.length - 1], to: followingGroupState,
      x1: slots[slots.length - 1].x,
      y1: slots[slots.length - 1].y,
      x2: 50,
      y2: 200 - slots[slots.length - 1].y,
      d: `M ${slots[slots.length - 1].x} ${slots[slots.length - 1].y} C ${slots[slots.length - 1].x} 100, 50 100, 50 100`,
      lit: active === states.length - 1 || active === states.length,
      star: { x: 50, y: 100 },
    });
  return (
    <svg
      className="constellation-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {segments.filter(s => s.fade).map(segment => (
          <linearGradient key={segment.key} id={`${id}-${segment.key}-blend`} gradientUnits="userSpaceOnUse" x1="0" y1={segment.y1} x2="0" y2={segment.y2}>
            <stop offset="0%" stopColor={connectionColor(segment.from)} stopOpacity={segment.from === "normal" ? 0.28 : 0.95} />
            <stop offset="100%" stopColor={connectionColor(segment.to)} stopOpacity={segment.to === "normal" ? 0.28 : 0.95} />
          </linearGradient>
        ))}
        <filter
          id={`${id}-glow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.3" />
        </filter>
      </defs>
      {segments.map((segment) => {
        const state = getConnectionState(segment.start, segment.end);
        const color = segment.fade ? `url(#${id}-${segment.key}-blend)` : connectionColor(state);
        return (
          <g
            key={segment.key}
            className={`connection-segment connection-${state} ${segment.fade ? "connection-blended" : ""} ${segment.lit ? "lit" : ""} ${state === "current" ? "has-current" : ""}`}
          >
            <path
              className="connection-glow"
              d={segment.d}
              stroke={color}
              filter={`url(#${id}-glow)`}
            />
            <path className="connection-stroke" d={segment.d} stroke={color} />
            {state === "current" && (
              <path
                className="connection-energy"
                d={segment.d}
                stroke={segment.fade ? color : "#ffffff"}
                pathLength={100}
              />
            )}
            <circle
              cx={segment.star.x}
              cy={segment.star.y}
              r=".3"
              fill={color}
            />
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
  dragHandle,
  onReorder,
}: {
  route: PlayRoute;
  selected: number | undefined;
  isAdmin: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
  onEdit: () => void;
  onAdd: () => void;
  dragHandle?: ReactNode;
  onReorder?: (games: RouteGame[]) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));
  function reorder({active: dragged, over}: DragEndEvent) {
    setActive(null);
    if (!isAdmin || disabled || !over || dragged.id === over.id) return;
    const from = route.games.findIndex(g => g.game_id === dragged.id), to = route.games.findIndex(g => g.game_id === over.id);
    if (from >= 0 && to >= 0) onReorder?.(arrayMove(route.games, from, to));
  }
  const pages = Math.max(1, Math.ceil(route.games.length / 6));
  return (
    <section
      className="constellation-route"
      style={{ "--route-color": route.accent } as CSSProperties}
      aria-label={route.name}
    >
      <header>
        {dragHandle}
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
          <RouteActions name={route.name} disabled={disabled} onAdd={onAdd} onEdit={onEdit} />
        )}
      </header>
      {!route.games.length ? (
        <div className="route-empty">
          <span>✧</span>
          <h3>An adventure waiting to be charted</h3>
          <p>Add games from your library to connect your first stars.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder} onDragCancel={() => setActive(null)}>
        <SortableContext items={route.games.map(g => g.game_id)} strategy={verticalListSortingStrategy}>
        <div className="constellation-scroll">
          <div
            className="constellation-track"
            style={{ "--pages": pages } as CSSProperties}
          >
            {Array.from({ length: pages }, (_, page) => {
              const batch = route.games.slice(page * 6, page * 6 + 6);
              const slots = verticalConstellationSlots(batch.length);
              return (
                <div className="constellation-segment" key={page} style={{ "--segment-height": `${batch.length * 165}px` } as CSSProperties}>
                  <ConstellationConnections
                    states={batch.map((_, i) =>
                      displayState(route.games, page * 6 + i),
                    )}
                    active={active === null ? null : active - page * 6}
                    previousState={
                      page > 0
                        ? displayState(route.games, page * 6 - 1)
                        : undefined
                    }
                    followingGroupState={
                      page < pages - 1
                        ? displayState(route.games, page * 6 + 6)
                        : undefined
                    }
                  />
                  {batch.map((entry, i) => (
                    <div
                      className="star-slot"
                      key={entry.game_id}
                      style={
                        {
                          "--x": `${slots[i].x}%`,
                          "--y": `${slots[i].y}%`,
                          "--connection-color": connectionColor(displayState(route.games, page * 6 + i)),
                          "--connection-end-color": connectionColor(page * 6 + i + 1 < route.games.length ? displayState(route.games, page * 6 + i + 1) : "normal"),
                          "--connection-mid-color": page * 6 + i + 1 < route.games.length && displayState(route.games, page * 6 + i) === displayState(route.games, page * 6 + i + 1) ? connectionColor(displayState(route.games, page * 6 + i)) : "transparent",
                        } as CSSProperties
                      }
                    >
                      <SortableGameNode
                        enabled={isAdmin && !disabled && !!onReorder}
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
        </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
