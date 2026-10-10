import type { AwardSummary } from "@/lib/awards";
import TrophyIcon from "./TrophyIcon";
export default function AwardBadge({ summary }: { summary?: AwardSummary }) {
  if (!summary) return null;
  return <span tabIndex={0} aria-label={summary.label} title={summary.label} className={`group/award absolute left-3 top-14 z-10 rounded-full border p-1.5 ${summary.goty ? "border-amber-200 bg-amber-950/95 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,.3)]" : summary.wins ? "border-amber-300/50 bg-black/85 text-amber-300" : "border-zinc-500 bg-black/85 text-zinc-300"}`}>
    <TrophyIcon status={summary.wins ? "winner" : "nominee"} className={summary.goty ? "h-5 w-5" : "h-4 w-4"}/><span role="tooltip" className="pointer-events-none absolute left-0 top-full mt-2 hidden w-40 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs font-medium group-hover/award:block group-focus/award:block">{summary.label}</span>
  </span>;
}
