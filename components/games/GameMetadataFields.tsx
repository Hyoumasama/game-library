"use client";

import { useEffect, useMemo, useState } from "react";

export type GameMetadataValue = {
  franchise: { id?: string; name: string } | null;
  relationships: { id?: string; relationType: string; relatedGameId: string; perspective?: string }[];
};

type Options = {
  franchises: { id: string; name: string }[];
  relationshipTypes: { code: string; label: string }[];
  ownedGames: { id: string; title: string; platforms: string[] }[];
  currentCanonicalId: string | null;
  current: GameMetadataValue;
};

export default function GameMetadataFields({ gameId, value, onChange }: {
  gameId?: number;
  value: GameMetadataValue;
  onChange: (value: GameMetadataValue) => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState("");
  const [franchiseQuery, setFranchiseQuery] = useState("");
  const [gameQueries, setGameQueries] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const suffix = gameId ? `?gameId=${gameId}` : "";
    fetch(`/api/admin/game-metadata-options${suffix}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load metadata options");
        setOptions(data);
        if (gameId) onChange(data.current);
      })
      .catch((caught) => {
        if (caught instanceof Error && caught.name !== "AbortError") setError(caught.message);
      });
    return () => controller.abort();
  // The parent setter is stable; reloading here would overwrite in-progress edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const franchiseMatches = useMemo(() => {
    const query = franchiseQuery.trim().toLocaleLowerCase();
    return options?.franchises.filter((item) => !query || item.name.toLocaleLowerCase().includes(query)).slice(0, 8) || [];
  }, [franchiseQuery, options]);

  if (error) return <div className="md:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>;
  if (!options) return <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">Loading franchises and relationships…</div>;

  function updateRelationship(index: number, patch: Partial<GameMetadataValue["relationships"][number]>) {
    onChange({ ...value, relationships: value.relationships.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) });
  }

  return (
    <div className="md:col-span-2 grid gap-4">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">Franchise</h3><p className="text-xs text-zinc-400">Optional · one franchise per canonical game</p></div>{value.franchise && <button type="button" onClick={() => { onChange({ ...value, franchise: null }); setFranchiseQuery(""); }} className="text-sm text-zinc-400 hover:text-white">Remove</button>}</div>
        {value.franchise ? <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-cyan-100">{value.franchise.name}</div> : <>
          <input value={franchiseQuery} onChange={(event) => setFranchiseQuery(event.target.value)} placeholder="Search or create a franchise" className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3" />
          {franchiseQuery.trim() && <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-zinc-800 bg-black p-1">
            {franchiseMatches.map((item) => <button key={item.id} type="button" onClick={() => { onChange({ ...value, franchise: item }); setFranchiseQuery(""); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800">{item.name}</button>)}
            {!franchiseMatches.some((item) => item.name.trim().toLocaleLowerCase() === franchiseQuery.trim().toLocaleLowerCase()) && <button type="button" onClick={() => { onChange({ ...value, franchise: { name: franchiseQuery.trim().replace(/\s+/g, " ") } }); setFranchiseQuery(""); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-cyan-300 hover:bg-zinc-800">Create “{franchiseQuery.trim()}”</button>}
          </div>}
        </>}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3"><h3 className="font-bold text-white">Game Relationships</h3><p className="text-xs text-zinc-400">Only owned games appear. Inverse relationships are shown automatically.</p></div>
        <div className="grid gap-3">
          {value.relationships.map((row, index) => {
            const selected = options.ownedGames.find((game) => game.id === row.relatedGameId);
            const query = gameQueries[index] ?? selected?.title ?? "";
            const matches = options.ownedGames.filter((game) => game.id !== options.currentCanonicalId && game.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 8);
            return <div key={row.id || index} className="grid gap-2 rounded-xl border border-zinc-800 bg-black/50 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
              <select value={row.relationType} onChange={(event) => updateRelationship(index, { relationType: event.target.value })} className="rounded-xl border border-zinc-700 bg-black px-3 py-3"><option value="">Relationship type</option>{options.relationshipTypes.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select>
              <div className="relative"><input value={query} onChange={(event) => { setGameQueries((current) => ({ ...current, [index]: event.target.value })); if (selected) updateRelationship(index, { relatedGameId: "" }); }} placeholder="Search owned games" className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-3" />{query && !selected && <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1 shadow-xl">{matches.length ? matches.map((game) => <button key={game.id} type="button" onClick={() => { updateRelationship(index, { relatedGameId: game.id }); setGameQueries((current) => ({ ...current, [index]: game.title })); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><span className="font-medium">{game.title}</span>{game.platforms.length > 0 && <span className="ml-2 text-xs text-zinc-500">{game.platforms.join(" • ")}</span>}</button>) : <p className="px-3 py-2 text-sm text-zinc-500">No owned games found</p>}</div>}</div>
              <button type="button" aria-label="Delete relationship" onClick={() => onChange({ ...value, relationships: value.relationships.filter((_, rowIndex) => rowIndex !== index) })} className="rounded-xl border border-zinc-700 px-4 py-3 text-zinc-400 hover:border-red-500/60 hover:text-red-300">Remove</button>
            </div>;
          })}
        </div>
        <button type="button" onClick={() => onChange({ ...value, relationships: [...value.relationships, { relationType: "", relatedGameId: "" }] })} className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-cyan-400">Add Relationship</button>
      </section>
    </div>
  );
}
