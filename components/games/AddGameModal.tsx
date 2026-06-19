"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type IgdbResult = {
  igdbId: number;
  title: string;
  year: number | null;
  releaseDate?: string;
  coverUrl: string | null;
  summary: string;
};

export default function AddGameModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgdbResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<IgdbResult | null>(null);

  const [title, setTitle] = useState("");
  const [release, setRelease] = useState("");
  const [status, setStatus] = useState("Unplayed");
  const [score, setScore] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("");
  const [price, setPrice] = useState("");
  const [store, setStore] = useState("");
  const [platform, setPlatform] = useState("");
  const [hardware, setHardware] = useState("");
  const [message, setMessage] = useState("");

  const [dateOfPurchase, setDateOfPurchase] = useState(
  new Date().toISOString().slice(0, 10)
);
const [completionLastPlayed, setCompletionLastPlayed] = useState("");

  const [options, setOptions] = useState({
  stores: [] as string[],
  platforms: [] as string[],
  hardware: [] as string[],
});

useEffect(() => {
  fetch("/api/admin/game-options")
    .then((res) => res.json())
    .then((data) => setOptions(data));
}, []);

  async function searchIgdb() {
    if (!query.trim()) return;

    setMessage("Searching...");

    const response = await fetch(
      `/api/admin/igdb-search?query=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    setResults(data.results || []);
    setMessage("");
  }

  function selectGame(game: IgdbResult) {
    setSelectedGame(game);
    setTitle(game.title);
    setRelease(game.releaseDate || "");
    setResults([]);
  }

  async function addGame(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Saving...");

    const response = await fetch("/api/admin/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        release,
        dateOfPurchase,
completionLastPlayed,
        status,
        score,
        hoursPlayed,
        price,
        store,
        platform,
        hardware,
        igdbId: selectedGame?.igdbId || null,
        coverUrl: selectedGame?.coverUrl || null,
        summary: selectedGame?.summary || null,
      }),
    });

    if (!response.ok) {
      setMessage("Failed to save game");
      return;
    }

    setMessage("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black"
      >
        + Add Game
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Game</h2>

              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search IGDB, example: Batman"
                  className="flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3"
                />

                <button
                  onClick={searchIgdb}
                  type="button"
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black"
                >
                  Search
                </button>
              </div>

              {results.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3">
                  {results.map((game) => (
                    <button
                      key={game.igdbId}
                      onClick={() => selectGame(game)}
                      type="button"
                      className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-black p-3 text-left transition hover:border-zinc-500"
                    >
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt={game.title}
                          className="h-24 w-16 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-16 items-center justify-center rounded-md bg-zinc-800">
                          🎮
                        </div>
                      )}

                      <div>
                        <p className="font-bold">{game.title}</p>
                        <p className="text-sm text-zinc-400">
                          {game.year || "Unknown year"} · IGDB ID: {game.igdbId}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                          {game.summary || "No summary"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={addGame} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2" />
              <input
  type="date"
  value={release}
  onChange={(e) => setRelease(e.target.value)}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>
              <input
  type="date"
  value={dateOfPurchase}
  onChange={(e) => setDateOfPurchase(e.target.value)}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>
<input
  type="date"
  value={completionLastPlayed}
  onChange={(e) => setCompletionLastPlayed(e.target.value)}
  placeholder=""
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-4 py-3">
                <option>Completed</option>
                <option>Playing</option>
                <option>Unplayed</option>
                <option>Dropped</option>
                <option>Wishlist</option>
              </select>

              <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} placeholder="Hours Played" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input
  value={store}
  onChange={(e) => setStore(e.target.value)}
  list="game-stores"
  placeholder="Store"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="game-stores">
  {options.stores.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>
              <input
  value={platform}
  onChange={(e) => setPlatform(e.target.value)}
  list="game-platforms"
  placeholder="Platform"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="game-platforms">
  {options.platforms.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>

              <input
  value={hardware}
  onChange={(e) => setHardware(e.target.value)}
  list="game-hardware"
  placeholder="Hardware"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="game-hardware">
  {options.hardware.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>

              <button type="submit" className="rounded-xl bg-white px-4 py-3 font-bold text-black md:col-span-2">
                Save Game
              </button>

              {message && <p className="text-zinc-400 md:col-span-2">{message}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}