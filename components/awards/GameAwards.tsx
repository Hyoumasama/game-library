import Link from "next/link";
import type { Award } from "@/lib/awards";
import TrophyIcon from "./TrophyIcon";
export default function GameAwards({ awards }: { awards: Award[] }) {
  const entries = [...awards].sort((a,b) => Number(b.status === "winner")-Number(a.status === "winner") || b.year-a.year || a.display_order-b.display_order);
  if (!entries.length) return null;
  return <section className="my-6 rounded-2xl border border-amber-300/20 bg-zinc-950/80 p-5"><h2 className="mb-4 text-sm font-black tracking-[.2em] text-amber-200">AWARDS</h2><div className="space-y-2">{entries.map(e => <Link key={e.id} href={`/goty?year=${e.year}#${e.category_key}`} className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-900 ${e.status === "winner" ? "text-amber-200" : "text-zinc-400"}`}><TrophyIcon/><span>{e.category_name} <span className="text-zinc-500">—</span> {e.status === "winner" ? "Winner" : "Nominee"} · {e.year}<span className="block text-xs text-zinc-500">{e.organization === "tga" ? "The Game Awards" : e.organization}{e.nominee_type !== "game" ? ` · ${e.nominee_name}` : ""}</span></span></Link>)}</div></section>;
}
