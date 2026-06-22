"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SearchGame = {
  id: number;
  title: string;
  steam_vertical_cover?: string | null;
  cover_url?: string | null;
};

export default function HomeGameSearch() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGame[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSearch(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/search-games?q=${encodeURIComponent(value)}`
      );

      const data = await response.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setLoading(false);
  }

  function goToGame(id: number) {
    closeSearch();
    router.push(`/game/${id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[52px] w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-400 hover:border-zinc-600 hover:text-white lg:w-full"
      >
        <span className="flex items-center gap-2">
          <span>🔍</span>
          <span>Search Games...</span>
        </span>

        <span className="hidden rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-500 sm:block">
          Ctrl K
        </span>
      </button>

      {open && (
  <div
    className="fixed inset-0 z-[999] bg-black/70 p-4 backdrop-blur-sm"
    onClick={closeSearch}
  >
          <div
  className="mx-auto mt-20 w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
  onClick={(event) => event.stopPropagation()}
>
            <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
              <span className="text-xl">🔍</span>

              <input
                autoFocus
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Search for a game..."
                className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-zinc-500"
              />

              <button
                type="button"
                onClick={closeSearch}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="p-5 text-sm font-bold text-zinc-400">
                  Searching...
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="p-5 text-sm font-bold text-zinc-500">
                  No games found.
                </div>
              )}

              {!loading &&
                results.map((game) => {
                  const cover = game.steam_vertical_cover || game.cover_url;

                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => goToGame(game.id)}
                      className="flex w-full items-center gap-4 border-b border-zinc-900 p-4 text-left last:border-b-0 hover:bg-zinc-900"
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={game.title}
                          className="h-20 w-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
                          🎮
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="line-clamp-2 text-base font-black text-white">
                          {game.title}
                        </p>
                        <p className="mt-1 text-xs font-bold text-zinc-500">
                          Open game page
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}