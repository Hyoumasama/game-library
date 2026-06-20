"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SearchResult = {
  source?: "igdb" | "steam";
  igdbId: number | null;
  steamAppId?: number | null;
  title: string;
  year: number | null;
  releaseDate?: string;
  

  coverUrl: string | null;
  heroUrl?: string | null;

  summary: string;

genre?: string | null;
screenshots?: string | null;
developer?: string | null;
publisher?: string | null;
};

export default function AddGameModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"igdb" | "steam">("igdb");
const [results, setResults] = useState<SearchResult[]>([]);
const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);

  const [title, setTitle] = useState("");
  const [release, setRelease] = useState("");
  const [status, setStatus] = useState("Unplayed");
  const [score, setScore] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("");
  const [price, setPrice] = useState("");
  const [store, setStore] = useState("");
  const [platform, setPlatform] = useState("");
  const [hardware, setHardware] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
const [heroUrl, setHeroUrl] = useState("");
const [summary, setSummary] = useState("");
const [genre, setGenre] = useState("");
const [developer, setDeveloper] = useState("");
const [publisher, setPublisher] = useState("");
const [screenshots, setScreenshots] = useState("");
const [igdbId, setIgdbId] = useState<number | null>(null);
const [steamAppId, setSteamAppId] = useState<number | null>(null);
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

  async function searchGames() {
  if (!query.trim()) return;

  setMessage("Searching...");

  const endpoint =
    searchSource === "steam"
      ? "/api/admin/steam-search"
      : "/api/admin/igdb-search";

  const response = await fetch(
    `${endpoint}?query=${encodeURIComponent(query)}`
  );

  const data = await response.json();

  setResults(data.results || []);
  setMessage("");
}

  function selectGame(game: SearchResult) {
  setSelectedGame(game);
  setTitle(game.title);
  setRelease(game.releaseDate || "");
console.log("Selected Steam game:", game);

  setCoverUrl(game.coverUrl || "");
  setHeroUrl(game.heroUrl || "");
  setSummary(game.summary || "");
  setGenre(game.genre || "");
  setDeveloper(game.developer || "");
  setPublisher(game.publisher || "");
  setScreenshots(game.screenshots || "");
  setIgdbId(game.igdbId || null);
setSteamAppId(game.steamAppId || null);

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

  igdbId,
  steamAppId,

coverUrl,
heroUrl,
summary,
genre,
developer,
publisher,
screenshots,
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-6">
          <div className="h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 sm:w-[calc(100vw-24px)] sm:rounded-3xl sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Game</h2>

              <button
  onClick={() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelectedGame(null);
    setTitle("");
    setRelease("");
    setStatus("Unplayed");
    setScore("");
    setHoursPlayed("");
    setPrice("");
    setStore("");
    setPlatform("");
    setHardware("");
    setCoverUrl("");
    setHeroUrl("");
    setSummary("");
    setGenre("");
    setDeveloper("");
    setPublisher("");
    setScreenshots("");
    setIgdbId(null);
    setSteamAppId(null);
    setCompletionLastPlayed("");
    setMessage("");
  }}
  className="text-zinc-400 hover:text-white"
>
  ✕
</button>
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
  <select
    value={searchSource}
    onChange={(e) => setSearchSource(e.target.value as "igdb" | "steam")}
    className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
  >
    <option value="igdb">IGDB</option>
    <option value="steam">Steam</option>
  </select>

  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchGames();
  }
}}
    placeholder={`Search ${searchSource.toUpperCase()}, example: Batman`}
    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
  />

  <button
    onClick={searchGames}
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
                      key={`${game.source}-${game.igdbId || game.steamAppId || game.title}`}
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
                          {game.year || "Unknown year"} ·{" "}
{game.source === "steam"
  ? `Steam ID: ${game.steamAppId}`
  : `IGDB ID: ${game.igdbId}`}
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
<textarea
  value={summary}
  onChange={(e) => setSummary(e.target.value)}
  placeholder="Summary"
  rows={5}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
/>

<input
  value={coverUrl}
  onChange={(e) => setCoverUrl(e.target.value)}
  placeholder="Cover URL"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
/>

<input
  value={heroUrl}
  onChange={(e) => setHeroUrl(e.target.value)}
  placeholder="Hero URL"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
/>

<input
  value={genre}
  onChange={(e) => setGenre(e.target.value)}
  placeholder="Genre"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<input
  value={developer}
  onChange={(e) => setDeveloper(e.target.value)}
  placeholder="Developer"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<input
  value={publisher}
  onChange={(e) => setPublisher(e.target.value)}
  placeholder="Publisher"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<input
  value={screenshots}
  onChange={(e) => setScreenshots(e.target.value)}
  placeholder="Screenshots URLs separated by comma"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
/>
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