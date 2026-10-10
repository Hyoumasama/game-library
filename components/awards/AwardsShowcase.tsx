"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { awardStats, type Award } from "@/lib/awards";
import type { AwardEvent } from "@/lib/server/awards";
import TrophyIcon from "./TrophyIcon";
import { useIsAdmin } from "@/lib/useAdminStatus";

function EntryCard({ entry, featured = false, published }: { entry: Award; featured?: boolean; published: boolean }) {
  const winner = entry.status === "winner";
  const body = <><div className={`relative overflow-hidden rounded-xl bg-zinc-900 ${featured ? "aspect-[16/10]" : "aspect-[3/4]"}`}>
    {entry.image_url ? <SafeImage src={entry.image_url} alt={entry.nominee_name} fill loading={featured ? "eager" : "lazy"} sizes={featured ? "(min-width: 768px) 45vw, 90vw" : "(min-width: 1024px) 15vw, 40vw"} className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"/> : <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,.12),transparent_70%)]"><TrophyIcon className={`${featured ? "h-20 w-20" : "h-10 w-10"} text-amber-200/40`}/></div>}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 pt-12"><span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${winner ? "text-amber-200" : "text-zinc-300"}`}><TrophyIcon className="h-3 w-3"/>{winner ? published ? "Winner" : "Reported winner" : "Nominee"}</span></div>
  </div><div className="px-1 pb-1 pt-3"><h3 className={`${featured ? "text-2xl" : "text-sm"} font-bold leading-snug`}>{entry.nominee_name}</h3>{entry.nominee_type !== "game" && <p className="mt-1 text-xs text-zinc-500">{entry.game_title || entry.nominee_type}</p>}<p className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${entry.owned ? "text-cyan-300" : "text-zinc-500"}`}>{entry.owned ? "In your library" : entry.game_id ? "On your wishlist" : entry.nominee_type === "game" ? "Outside your library" : ""}</p></div></>;
  const style = `group block min-w-0 rounded-2xl border p-2 ${winner ? "border-amber-300/35 bg-amber-300/[.04] shadow-[0_0_25px_rgba(251,191,36,.06)]" : "border-zinc-800 bg-zinc-950/60"} ${entry.game_id ? "hover:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-cyan-300" : ""}`;
  return entry.game_id ? <Link href={`/game/${entry.game_id}`} className={style}>{body}</Link> : <article className={style}>{body}</article>;
}
export default function AwardsShowcase({ events, event, entries }: { events: AwardEvent[]; event: AwardEvent; entries: Award[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const isAdmin = useIsAdmin();
  const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
  const stats = awardStats(entries); const published = event.status === "published";
  const categories = useMemo(() => [...new Map(entries.map(e => [e.category_key, { key: e.category_key, name: e.category_name, order: e.display_order }])).values()].sort((a,b) => a.order-b.order), [entries]);
  const visible = entries.filter(e => (filter !== "owned" || e.owned) && (filter !== "winners" || e.status === "winner") && `${e.nominee_name} ${e.game_title || ""} ${e.category_name}`.toLowerCase().includes(search.toLowerCase()));
  const goty = entries.find(e => e.category_key === "game-of-the-year" && e.status === "winner");
  return <div aria-busy={pending} className={`motion-safe:transition-opacity motion-safe:duration-200 ${pending ? "opacity-60" : ""}`}>
    <header className="relative my-8 overflow-hidden rounded-3xl border border-amber-200/20 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,.16),transparent_65%)] p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><a href={event.source_url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-[.25em] text-amber-200">The Game Awards</a><h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">GOTY <span className="text-amber-200">{event.year}</span></h1><p className="mt-4 max-w-xl text-sm text-zinc-400">Celebrating the worlds, stories, and people that defined a year in gaming.</p></div>
      <label className="text-xs text-zinc-400">Ceremony year<select aria-label="Ceremony year" value={event.year} onChange={e => startTransition(() => router.push(`/goty?year=${e.target.value}`))} className="mt-2 block rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-bold text-white">{events.map(e => <option key={e.id} value={e.year}>{e.year}{e.status !== "published" ? " · Under review" : ""}</option>)}</select></label></div>
      {!published && <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-900/10 p-3 text-xs text-amber-200"><p role="status">Historical data under review. Reported results are excluded from finalized library statistics and badges.</p>{event.data_notes && <details className="mt-2"><summary className="cursor-pointer text-amber-200/70">Verification notes</summary><p className="mt-2 text-zinc-400">{event.data_notes}</p></details>}</div>}
      {published && goty && <p className="mt-6 flex items-center gap-3 text-lg font-bold text-amber-200"><TrophyIcon/> Game of the Year: {goty.nominee_name}</p>}
      <div className="mt-8 grid grid-cols-2 gap-5 border-t border-white/10 pt-6 md:grid-cols-4">{[["Categories", stats.categories],["Nominated games",stats.games],["Library games nominated",stats.libraryGames],["Library games winning",stats.winningGames]].map(([label,n]) => <div key={label}><p className="text-3xl font-black text-amber-100">{n}</p><p className="mt-1 text-xs text-zinc-400">{label}{!published ? " · provisional" : ""}</p></div>)}</div>
    </header>
    <div className="mb-8 flex flex-wrap items-center gap-3"><div className="flex rounded-xl border border-zinc-800 p-1">{[["all","All nominees"],["owned","Owned games"],["winners","Winners"]].map(([value,label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? "bg-amber-200 text-black" : "text-zinc-400 hover:text-white"}`}>{label}</button>)}</div><input aria-label="Search nominees and categories" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the awards…" className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm"/><label className="ml-auto text-xs text-zinc-400">Jump to category<select aria-label="Jump to category" defaultValue="" onChange={e => { document.getElementById(e.target.value)?.scrollIntoView(); }} className="ml-2 max-w-48 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-white"><option value="" disabled>Select category</option>{categories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label></div>
    <p className="mb-8 text-xs text-zinc-500">Your library earned {stats.nominations} nominations and {stats.wins} wins{!published ? " in the reported data" : ""}. Winners are included in nomination totals.</p>
    <div className="space-y-10">{categories.map(c => {
      const nominees = visible.filter(e => e.category_key === c.key).sort((a,b) => Number(b.status === "winner")-Number(a.status === "winner") || a.nominee_name.localeCompare(b.nominee_name));
      if (!nominees.length) return null;
      const prestige = c.key === "game-of-the-year";
      return <section key={c.key} id={c.key} className="scroll-mt-8"><div className="mb-4 flex items-center gap-3"><TrophyIcon className={`${prestige ? "h-7 w-7 text-amber-200" : "h-5 w-5 text-zinc-500"}`}/><h2 className={`${prestige ? "text-2xl" : "text-lg"} font-bold`}>{c.name}</h2><span className="ml-auto text-xs text-zinc-500">{nominees.length} entries</span></div>
        {prestige && nominees[0]?.status === "winner" ? <div className="grid items-start gap-4 md:grid-cols-2"><EntryCard entry={nominees[0]} featured published={published}/><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">{nominees.slice(1).map(e => <EntryCard key={e.id} entry={e} published={published}/>)}</div></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{nominees.map(e => <EntryCard key={e.id} entry={e} published={published}/>)}</div>}
      </section>;
    })}{visible.length === 0 && <p className="py-12 text-center text-zinc-400">No entries match these filters.</p>}</div>
    <footer className="mt-14 border-t border-zinc-800 py-6 text-xs text-zinc-500">Independent personal archive · <a href={event.source_url} className="underline">Historical source</a> · <a href="https://thegameawards.com" className="underline">Official The Game Awards website</a>{isAdmin && <Link href="/goty/review" className="ml-4 text-amber-200 underline">Review library matches</Link>}</footer>
  </div>;
}
