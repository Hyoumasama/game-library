"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REFRESH_TYPES, type RefreshOptions, type RefreshType } from "@/lib/metadataRefresh";
import type { RefreshResult } from "@/lib/server/metadataRefresh";

const labels: Record<RefreshType, string> = { metadata: "Game Metadata", hltb: "HLTB", metacritic: "Metacritic" };
const descriptions: Record<RefreshType, string> = {
  metadata: "Release date, summary, genres, studios and images from the linked IGDB game.",
  hltb: "Main Story, Main + Extra and Completionist times. Locked times are preserved.",
  metacritic: "Critic score. The source link appears in the results.",
};
const inputClass = "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white focus:outline-2 focus:outline-cyan-300";

export default function MetadataRefreshModal({ onClose, onUpdated }: { onClose: () => void; onUpdated?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stop = useRef(false);
  const router = useRouter();
  const [options, setOptions] = useState<RefreshOptions>({ types: ["metadata"], scope: "all", months: 3, includeUpcoming: true, mode: "missing" });
  const [period, setPeriod] = useState("3");
  const [ids, setIds] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "preview" | "running" | "done" | "stopped">("idle");
  const [processed, setProcessed] = useState(0);
  const [rows, setRows] = useState<(RefreshResult & { title: string; gameId: number })[]>([]);
  const [error, setError] = useState("");
  const [stopping, setStopping] = useState(false);
  const busy = phase === "running" || phase === "preview";

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    if (phase === "running") window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  function change(next: Partial<RefreshOptions>) {
    setOptions(current => ({ ...current, ...next }));
    setIds(null); setError(""); setRows([]); setProcessed(0); setPhase("idle");
  }

  async function request(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/metadata-refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, options }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Refresh failed");
    return data;
  }

  async function preview() {
    setPhase("preview"); setIds(null); setError(""); setRows([]); setProcessed(0);
    try { const data = await request({ action: "preview" }); setIds(data.ids); setPhase("idle"); }
    catch (error) { setError(error instanceof Error ? error.message : "Preview failed"); setPhase("idle"); }
  }

  async function run() {
    if (!ids?.length) return;
    stop.current = false; setStopping(false); setPhase("running"); setError(""); setRows([]); setProcessed(0);
    let changed = false;
    try {
      for (const [index, id] of ids.entries()) {
        if (stop.current) break;
        const data = await request({ action: "refresh", id }) as { title: string; results: RefreshResult[]; halt: boolean };
        changed ||= data.results.some(row => row.status === "updated");
        setRows(current => [...current, ...data.results.map(row => ({ ...row, title: data.title, gameId: id }))]);
        setProcessed(index + 1);
        if (data.halt) { stop.current = true; setError("Source rate limit reached. Wait a few minutes before trying again."); }
      }
      setPhase(stop.current ? "stopped" : "done");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Refresh failed"); setPhase("stopped");
    } finally {
      if (changed) { router.refresh(); onUpdated?.(); }
    }
  }

  const totals = { updated: new Set(rows.filter(r => r.status === "updated").map(r => r.gameId)).size, failed: rows.filter(r => r.status === "failed").length, skipped: rows.filter(r => r.status === "skipped").length };
  return <dialog ref={dialog} aria-labelledby="metadata-refresh-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-[#0b1018] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm">
    <div className="border-b border-zinc-800 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4"><h2 id="metadata-refresh-title" className="text-xl font-bold">Refresh Metadata</h2><button autoFocus type="button" onClick={onClose} disabled={busy} aria-label="Close refresh metadata" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 disabled:opacity-40">×</button></div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Choose what to refresh and which games to include. Existing values are kept when a source has no data.</p>
    </div>
    <div className="space-y-6 p-5 sm:p-6">
      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60"><legend className="mb-3 text-xs font-bold uppercase tracking-widest text-cyan-300">Data sources</legend>
        {REFRESH_TYPES.map(type => <label key={type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${options.types.includes(type) ? "border-cyan-300/50 bg-cyan-300/5" : "border-zinc-800 bg-zinc-950"}`}><input type="checkbox" className="mt-1 accent-cyan-300" checked={options.types.includes(type)} onChange={e => change({ types: e.target.checked ? [...options.types, type] : options.types.filter(t => t !== type) })}/><span><span className="block text-sm font-bold">{labels[type]}</span><span className="mt-1 block text-xs leading-5 text-zinc-400">{descriptions[type]}</span></span></label>)}
      </fieldset>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60"><legend className="sr-only">Game selection</legend>
        <label className="text-sm font-medium">Library scope<select value={options.scope} onChange={e => change({ scope: e.target.value as RefreshOptions["scope"] })} className={inputClass}><option value="all">Entire library</option><option value="wishlist">Wishlist</option><option value="owned">Owned games</option></select></label>
        <label className="text-sm font-medium">Release window<select value={period} onChange={e => { setPeriod(e.target.value); change({ months: e.target.value === "custom" ? 3 : Number(e.target.value) }); }} className={inputClass}><option value="1">Last month</option><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last year</option><option value="0">All time</option><option value="custom">Custom months</option></select></label>
        {period === "custom" && <label className="text-sm font-medium">Number of months<input type="number" min="1" max="1200" value={options.months || ""} onChange={e => change({ months: Number(e.target.value) })} className={inputClass}/></label>}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={options.includeUpcoming} onChange={e => change({ includeUpcoming: e.target.checked })} className="accent-cyan-300"/>Include upcoming games and unknown release dates</label>
        <p className="text-xs leading-5 text-zinc-500 sm:col-span-2">The window uses the game’s release date, not its last update. Upcoming games are added regardless of the window.</p>
      </fieldset>
      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60"><legend className="mb-3 text-xs font-bold uppercase tracking-widest text-cyan-300">Update mode</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="refresh-mode" checked={options.mode === "missing"} onChange={() => change({ mode: "missing" })} className="accent-cyan-300"/>Fill empty fields only</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="refresh-mode" checked={options.mode === "all"} onChange={() => change({ mode: "all" })} className="accent-cyan-300"/>Refresh all selected fields</label>
        {options.mode === "all" && <p className="text-xs leading-5 text-amber-200">Existing metadata, images and scores may be replaced. Manually locked HLTB times stay unchanged.</p>}
      </fieldset>
      <div aria-live="polite" className="space-y-3">
        {ids !== null && <p className="text-sm text-cyan-200">{ids.length} matching games{ids.length === 0 ? ". Try a wider window or another update mode." : ". Ready to refresh."}</p>}
        {phase !== "idle" && phase !== "preview" && <><div className="flex justify-between text-sm"><span>{phase === "running" ? stopping ? "Stopping after current game…" : "Refreshing… Keep this window open." : phase === "done" ? "Refresh complete" : "Refresh stopped"}</span><span>{processed} / {ids?.length}</span></div><progress aria-label="Refresh progress" value={processed} max={ids?.length || 1} className="h-2 w-full accent-cyan-300"/><p className="text-xs text-zinc-400">{totals.updated} games updated · {totals.skipped} source checks skipped · {totals.failed} source checks failed</p></>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </div>
      {rows.length > 0 && <details className="rounded-xl border border-zinc-800 p-3"><summary className="cursor-pointer text-sm text-zinc-300">Results ({rows.length} source checks)</summary><ul className="mt-3 max-h-60 space-y-3 overflow-y-auto text-xs">{rows.map((row, index) => <li key={index}><span className={row.status === "failed" ? "text-red-300" : row.status === "updated" ? "text-cyan-200" : "text-zinc-400"}>{row.title} · {labels[row.type]} · {row.status}</span><p className="mt-1 text-zinc-500">{row.message}{row.url && <> · <a href={row.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Source</a></>}</p></li>)}</ul></details>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-5">
        {phase === "running" ? <button type="button" onClick={() => { stop.current = true; setStopping(true); }} disabled={stopping} className="rounded-xl border border-amber-300/40 px-4 py-3 text-sm font-bold text-amber-200 disabled:opacity-50">Stop after current game</button> : <><button type="button" disabled={busy || !options.types.length || (period === "custom" && options.months < 1)} onClick={preview} className="rounded-xl border border-zinc-600 px-4 py-3 text-sm font-bold disabled:opacity-40">{phase === "preview" ? "Checking…" : "Preview games"}</button><button type="button" disabled={busy || !ids?.length || phase === "done" || phase === "stopped"} onClick={run} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-black disabled:opacity-40">Start Refresh</button></>}
      </div>
    </div>
  </dialog>;
}
