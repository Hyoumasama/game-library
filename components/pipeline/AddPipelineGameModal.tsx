"use client";
import { useEffect, useRef, useState } from "react";
import SafeImage from "@/components/SafeImage";
import { getBestCover } from "@/lib/gameMappers";
import type { PipelineGame } from "@/lib/pipeline";

export default function AddPipelineGameModal({ selectedIds, busy, saveError, onAdd, onClose }: {
  selectedIds: number[]; busy: boolean; saveError: string; onAdd: (game: PipelineGame) => Promise<boolean>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<{ games: PipelineGame[]; hasMore: boolean; key: string } | null>(null);
  const [error, setError] = useState("");
  const key = `${search}:${page}`;
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/pipeline/library?search=${encodeURIComponent(search)}&page=${page}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to search library. Try again.");
        const data = await response.json();
        setResults({ ...data, key: `${search}:${page}` }); setError("");
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Search failed."); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page]);
  const loading = results?.key !== key;
  return <dialog ref={dialog} className="pipeline-modal" aria-labelledby="pipeline-modal-title" onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }}>
    <div className="pipeline-modal-header"><div><p className="pipeline-eyebrow">FROM YOUR LIBRARY</p><h2 id="pipeline-modal-title">Add to your pipeline</h2></div><button onClick={onClose} disabled={busy} aria-label="Close add game dialog">×</button></div>
    <input autoFocus aria-label="Search your library" placeholder="Search your games…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
    {saveError && <p role="alert" className="mt-3 text-sm text-rose-300">{saveError}</p>}
    <div className="pipeline-library-results" aria-busy={loading || busy}>
      {error ? <p role="alert">{error}</p> : loading ? <p role="status">Searching your library…</p> : results?.games.length === 0 ? <p>No games found in your library.</p> : results?.games.map((game) => {
        const cover = getBestCover(game), added = selectedIds.includes(game.id);
        return <button key={game.id} className="pipeline-library-game" disabled={busy || added} onClick={async () => { if (await onAdd(game)) onClose(); }}>
          <div className="pipeline-library-cover">{cover && <SafeImage src={cover} alt="" fill sizes="48px" className="object-cover" />}</div><span>{game.title}</span><span className="pipeline-library-add">{added ? "Added" : "+"}</span>
        </button>;
      })}
    </div>
    <div className="pipeline-modal-footer"><button className="pipeline-button" disabled={page === 0 || busy} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="pipeline-button" disabled={loading || !results?.hasMore || busy} onClick={() => setPage(page + 1)}>Next</button></div>
  </dialog>;
}
