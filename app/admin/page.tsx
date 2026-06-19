"use client";

import { useState } from "react";

type IgdbResult = {
  igdbId: number;
  title: string;
  year: number | null;
  coverUrl: string | null;
  summary: string;
};

export default function AdminPage() {
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
    setRelease(game.year ? game.year.toString() : "");
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

    setMessage("Game added ✅");
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-4xl font-bold">Admin</h1>
        <p className="mb-8 text-zinc-400">Search IGDB and add games.</p>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search IGDB, example: Batman"
              className="flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3"
            />

            <button
              onClick={searchIgdb}
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

        <form
          onSubmit={addGame}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
          <input value={release} onChange={(e) => setRelease(e.target.value)} placeholder="Release" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />

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
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
          <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Platform" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
          <input value={hardware} onChange={(e) => setHardware(e.target.value)} placeholder="Hardware" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />

          <button type="submit" className="rounded-xl bg-white px-4 py-3 font-bold text-black">
            Add Game
          </button>

          {message && <p className="text-zinc-400">{message}</p>}
        </form>
      </div>
    </main>
  );
}