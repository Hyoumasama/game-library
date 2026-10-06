import { pipelineSlots } from "@/lib/pipeline";

export default function NeuralConnections({ count, active }: { count: number; active: number | null }) {
  const edges = Array.from({ length: Math.max(0, count - 1) }, (_, i) => [i === 0 ? 0 : i, i + 1]);
  if (count > 3) edges.push([0, 3]);
  if (count > 4) edges.push([0, 4]);
  return <svg className="pipeline-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {edges.map(([a, b]) => {
      const from = pipelineSlots[a], to = pipelineSlots[b];
      const highlighted = active === a || active === b;
      return <g key={`${a}-${b}`} className={highlighted ? "connection-active" : ""}>
        <path d={`M ${from.x} ${from.y} C ${from.x + (to.x - from.x) * .2} ${to.y}, ${to.x - (to.x - from.x) * .2} ${from.y}, ${to.x} ${to.y}`} fill="none" stroke={highlighted ? "#a5f3fc" : "#38bdf8"} strokeWidth={highlighted ? ".24" : ".13"} opacity={highlighted ? .95 : .4} />
        <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r=".3" fill="#67e8f9" opacity={highlighted ? 1 : .5} />
      </g>;
    })}
  </svg>;
}
