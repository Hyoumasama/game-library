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
  const body = <><div className={`relative overflow-hidden rounded-xl bg-zinc-900 ${featured ? "aspect-[16/11]" : "aspect-[4/3]"}`}>
    {entry.image_url ? <SafeImage src={entry.image_url} alt={entry.nominee_name} fill loading={featured ? "eager" : "lazy"} sizes={featured ? "(min-width: 768px) 45vw, 90vw" : "(min-width: 1024px) 15vw, 40vw"} className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"/> : <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,.12),transparent_70%)]"><TrophyIcon status={entry.status} className={`${featured ? "h-20 w-20" : "h-10 w-10"} text-amber-200/40`}/></div>}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 pt-12"><span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${winner ? "text-amber-200" : "text-zinc-300"}`}><TrophyIcon status={entry.status} className="h-6 w-5"/>{winner ? published ? "Winner" : "Reported winner" : "Nominee"}</span></div>
  </div><div className="px-1 pb-1 pt-3"><h3 className={`${featured ? "text-2xl" : "text-sm"} font-bold leading-snug`}>{entry.nominee_name}</h3>{entry.nominee_type !== "game" && <p className="mt-1 text-xs text-zinc-500">{entry.game_title || entry.nominee_type}</p>}<p className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${entry.owned ? "text-cyan-300" : "text-zinc-500"}`}>{entry.owned ? "In your library" : entry.game_id ? "On your wishlist" : entry.nominee_type === "game" ? "Outside your library" : ""}</p></div></>;
  const style = `group block min-w-0 overflow-hidden rounded-2xl border p-2 motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 ${winner ? "border-amber-300/35 bg-amber-300/[.04] shadow-[0_0_25px_rgba(251,191,36,.06)]" : "border-zinc-800 bg-zinc-950/60"} ${entry.game_id ? "hover:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-cyan-300" : ""}`;
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
    <header className="relative my-8 isolate overflow-hidden rounded-[2rem] border border-amber-200/15 bg-[#101116]">
      {goty?.image_url && <div className="pointer-events-none absolute inset-0 -z-10 opacity-20"><SafeImage src={goty.image_url} alt="" fill sizes="100vw" className="object-cover blur-sm"/><div className="absolute inset-0 bg-gradient-to-r from-[#101116] via-[#101116]/80 to-transparent"/></div>}
      <div className="pointer-events-none absolute -right-12 top-10 -z-10 select-none text-[180px] font-black leading-none text-white/[.03] md:text-[320px]">{event.year}</div>
      <div className="grid items-center gap-4 px-6 pt-8 md:grid-cols-[1.4fr_1fr] md:px-10 md:pt-12">
        <div className="relative z-10">
          <a href={event.source_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-[.35em] text-amber-200/80">The Game Awards / The archive</a>
          <h1 className="mt-6 text-6xl font-black leading-[.9] tracking-tighter sm:text-8xl">A year.<br/>A legacy.<br/><span className="text-amber-200">GOTY {event.year}</span></h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">The worlds we escaped to. The stories that stayed.<br/>Explore the games that defined {event.year}.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#awards-stage" className="rounded-full bg-amber-200 px-6 py-3 text-xs font-bold text-black transition-colors hover:bg-amber-100">Explore the awards <span aria-hidden="true">↓</span></a>
            <label className="sr-only" htmlFor="ceremony-year">Ceremony year</label><select id="ceremony-year" value={event.year} onChange={e => startTransition(() => router.push(`/goty?year=${e.target.value}`))} className="rounded-full border border-white/15 bg-zinc-950 px-5 py-3 text-xs font-bold text-white">{events.map(e => <option key={e.id} value={e.year}>{e.year}{e.status !== "published" ? " · Under review" : ""}</option>)}</select>
          </div>
        </div>
        <div className="relative flex h-64 items-center justify-center sm:h-80 md:h-[440px]">
          <div className="absolute h-56 w-56 rounded-full bg-amber-300/10 blur-[70px]"/>
          <TrophyIcon status="winner" className="relative h-full w-full max-w-[360px] -rotate-6 drop-shadow-[0_20px_30px_rgba(0,0,0,.5)]"/>
          <span className="absolute bottom-2 right-0 text-[9px] uppercase tracking-[.3em] text-amber-200/50">Excellence, immortalized</span>
        </div>
      </div>
      {!published && <div className="mx-6 mt-6 rounded-xl border border-amber-400/30 bg-amber-900/10 p-4 text-xs text-amber-200 md:mx-10"><p role="status">Historical data under review. Reported results are excluded from finalized library statistics and badges.</p>{event.data_notes && <details className="mt-2"><summary className="cursor-pointer">Verification notes</summary><p className="mt-2 text-zinc-400">{event.data_notes}</p></details>}</div>}
      <div className="mt-8 grid grid-cols-2 border-t border-white/10 bg-black/20 md:grid-cols-4">{[["Award categories", stats.categories],["Nominated games",stats.games],["In your library",stats.libraryGames],["Library winners",stats.winningGames]].map(([label,n]) => <div key={label} className="border-white/5 px-6 py-6 odd:border-r md:border-r md:px-10"><p className="text-3xl font-light tabular-nums text-amber-100">{String(n).padStart(2, "0")}</p><p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">{label}{!published ? " · provisional" : ""}</p></div>)}</div>
    </header>
    <nav aria-label="Award editions" className="mb-8 flex gap-2 overflow-x-auto pb-3">{events.map(e => <Link key={e.id} href={`/goty?year=${e.year}`} aria-current={e.year === event.year ? "page" : undefined} className={`shrink-0 rounded-full border px-5 py-2 text-xs font-bold transition-colors ${e.year === event.year ? "border-amber-200/40 bg-amber-200/10 text-amber-200" : "border-white/5 text-zinc-500 hover:border-white/20 hover:text-white"}`}>{e.year}</Link>)}</nav>
    {goty && <section aria-label="Game of the Year spotlight" className="relative mb-10 isolate overflow-hidden rounded-3xl border border-amber-200/25 bg-zinc-900">
      {goty.image_url && <div className="absolute inset-0 -z-10"><SafeImage src={goty.image_url} alt="" fill sizes="100vw" className="object-cover object-[center_35%]"/><div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20"/></div>}
      <div className="relative max-w-2xl p-6 sm:p-10 md:py-16"><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-amber-200"><TrophyIcon status="winner" className="h-9 w-7"/>{published ? "The highest honor" : "Reported result · under review"}</span><p className="mt-5 text-xs uppercase tracking-[.3em] text-zinc-400">Game of the Year / {event.year}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{goty.nominee_name}</h2>{goty.game_id && <Link href={`/game/${goty.game_id}`} className="mt-6 inline-flex rounded-full border border-white/25 bg-black/25 px-5 py-3 text-xs font-bold hover:bg-white/10">Explore game <span aria-hidden="true" className="ml-6">↗</span></Link>}</div>
    </section>}
    <div id="awards-stage" className="mb-6 flex items-end justify-between gap-4 scroll-mt-6"><div><p className="text-[10px] uppercase tracking-[.3em] text-amber-200/60">The selection</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Every category. Every contender.</h2></div><span className="hidden text-xs text-zinc-500 sm:block">{stats.categories} categories / {event.year}</span></div>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/90 p-3"><div className="flex rounded-xl border border-zinc-800 p-1">{[["all","All nominees"],["owned","Owned games"],["winners","Winners"]].map(([value,label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? "bg-amber-200 text-black" : "text-zinc-400 hover:text-white"}`}>{label}</button>)}</div><input aria-label="Search nominees and categories" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the awards…" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm"/><label className="ml-auto text-xs text-zinc-400">Jump to category<select aria-label="Jump to category" defaultValue="" onChange={e => { document.getElementById(e.target.value)?.scrollIntoView(); }} className="ml-2 max-w-48 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-white"><option value="" disabled>Select category</option>{categories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label></div>
    <p className="mb-8 text-xs text-zinc-500">Your library earned {stats.nominations} nominations and {stats.wins} wins{!published ? " in the reported data" : ""}. Winners are included in nomination totals.</p>
    <div className="space-y-6">{categories.map((c, index) => {
      const nominees = visible.filter(e => e.category_key === c.key).sort((a,b) => Number(b.status === "winner")-Number(a.status === "winner") || a.nominee_name.localeCompare(b.nominee_name));
      if (!nominees.length) return null;
      const prestige = c.key === "game-of-the-year";
      return <section key={c.key} id={c.key} className={`scroll-mt-6 rounded-3xl border p-4 md:p-6 ${prestige ? "border-amber-200/20 bg-amber-200/[.025]" : "border-white/[.07] bg-white/[.015]"}`}><div className="mb-4 flex items-center gap-3"><span className="text-xs font-mono text-zinc-600">{String(index + 1).padStart(2, "0")}</span><TrophyIcon status={prestige ? "winner" : "nominee"} className={`${prestige ? "h-7 w-7 text-amber-200" : "h-5 w-5 text-zinc-500"}`}/><h2 className={`${prestige ? "text-2xl" : "text-lg"} font-bold`}>{c.name}</h2><span className="ml-auto text-xs text-zinc-500">{nominees.length} entries</span></div>
        {prestige && nominees[0]?.status === "winner" ? <div className="grid items-start gap-4 md:grid-cols-2"><EntryCard entry={nominees[0]} featured published={published}/><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">{nominees.slice(1).map(e => <EntryCard key={e.id} entry={e} published={published}/>)}</div></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5">{nominees.map(e => <EntryCard key={e.id} entry={e} published={published}/>)}</div>}
      </section>;
    })}{visible.length === 0 && <p className="py-12 text-center text-zinc-400">No entries match these filters.</p>}</div>
    <footer className="mt-14 border-t border-zinc-800 py-6 text-xs text-zinc-500">Independent personal archive · <a href={event.source_url} className="underline">Historical source</a> · <a href="https://thegameawards.com" className="underline">Official The Game Awards website</a>{isAdmin && <Link href="/goty/review" className="ml-4 text-amber-200 underline">Review library matches</Link>}</footer>
  </div>;
}
