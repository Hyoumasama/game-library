"use client";

import { Children, useId, useState, type ReactNode } from "react";

export default function ExpandableGameGrid({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const gridId = useId();
  const games = Children.toArray(children);

  return (
    <>
      <div id={gridId} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {expanded ? games : games.slice(0, 5)}
      </div>
      {games.length > 5 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={gridId}
            onClick={() => setExpanded(!expanded)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-cyan-400/60 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
          >
            {expanded ? "Show Less" : "Load More..."}
          </button>
        </div>
      )}
    </>
  );
}
