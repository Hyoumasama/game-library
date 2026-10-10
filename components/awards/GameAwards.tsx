import Link from "next/link";
import type { Award } from "@/lib/awards";
import TrophyIcon from "./TrophyIcon";
export default function GameAwards({ awards }: { awards: Award[] }) {
  const entries = [...awards].sort((a,b) => Number(b.status === "winner")-Number(a.status === "winner") || b.year-a.year || a.display_order-b.display_order);
  if (!entries.length) return null;
  const wins = entries.filter(e => e.status === "winner").length;
  return <section aria-label="Awards and recognition" className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(211,166,71,.1),transparent_65%)]">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-7">
      <div><p className="text-[10px] font-bold uppercase tracking-[.3em] text-amber-200/60">The awards cabinet</p><h2 className="mt-2 text-xl font-bold text-white">Awards & recognition</h2></div>
      <div className="flex gap-6 text-xs"><span className="text-amber-200"><strong className="mr-2 text-2xl tabular-nums">{wins}</strong>{wins === 1 ? "Win" : "Wins"}</span><span className="text-zinc-400"><strong className="mr-2 text-2xl tabular-nums text-zinc-200">{entries.length}</strong>Nominations</span></div>
    </div>
    <div className="grid auto-cols-[85%] grid-flow-col snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 md:p-5 xl:grid-cols-3">{entries.map(e => {
      const winner = e.status === "winner";
      return <Link key={e.id} href={`/goty?year=${e.year}#${e.category_key}`} className={`group relative flex snap-start items-center gap-4 overflow-hidden rounded-xl border p-4 motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-amber-200 ${winner ? "border-amber-200/20 bg-amber-200/[.04] hover:border-amber-200/50" : "border-white/5 bg-white/[.02] hover:border-zinc-500"}`}>
        <TrophyIcon status={e.status} className="h-20 w-14 motion-safe:transition-transform motion-safe:group-hover:scale-110" />
        <div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-2"><span className={`text-[9px] font-black uppercase tracking-[.2em] ${winner ? "text-amber-200" : "text-zinc-400"}`}>{winner ? "Winner" : "Nominated"}</span><span className="text-xs tabular-nums text-zinc-500">{e.year}</span></div><h3 className="text-sm font-bold leading-snug text-zinc-100">{e.category_name}</h3><p className="mt-2 text-[11px] text-zinc-500">{e.organization === "tga" ? "The Game Awards" : e.organization}</p>{e.nominee_type !== "game" && <p className="mt-1 text-xs text-zinc-400">{e.nominee_name}</p>}</div><span aria-hidden="true" className="self-end text-zinc-500 group-hover:text-white">↗</span>
      </Link>;
    })}</div>
  </section>;
}
