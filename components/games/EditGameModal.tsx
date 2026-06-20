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
  screenshots?: string;
  heroUrl?: string | null;
  summary: string;
  genre?: string | null;
  developer?: string | null;
  publisher?: string | null;
};

function toDateInput(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

export default function EditGameModal({ game }: { game: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"igdb" | "steam">("igdb");
const [results, setResults] = useState<SearchResult[]>([]);
const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);

  const [title, setTitle] = useState(game.Title || game.title || "");
  const [release, setRelease] = useState(
  toDateInput(game.Release || game.release || "")
);

const [dateOfPurchase, setDateOfPurchase] = useState(
  toDateInput(game["Date of Purchase"] || game.date_of_purchase || "")
);

const [completionLastPlayed, setCompletionLastPlayed] = useState(
  toDateInput(game["Completion Last Played"] || game.completion_last_played || "")
);
const [status, setStatus] = useState(game.Status || game.status || "");
  const [score, setScore] = useState(game.Score || game.score || "");
  const [hoursPlayed, setHoursPlayed] = useState(game["Hours Played"] || game.hours_played || "");
  const [price, setPrice] = useState(game.Price || game.price || "");
  const [store, setStore] = useState(game.Store || game.store || "");
  const [platform, setPlatform] = useState(game.Platform || game.platform || "");
  const [hardware, setHardware] = useState(game["Hardware (1)"] || game.hardware || "");

  const [coverUrl, setCoverUrl] = useState(game.cover_url || "");
  const [heroUrl, setHeroUrl] = useState(game.hero_url || "");
  const [summary, setSummary] = useState(game.summary || "");
  const [genre, setGenre] = useState(game.genre || "");
  const [screenshots, setScreenshots] = useState(game.screenshots || "");
  const [developer, setDeveloper] = useState(game.developer || "");
  const [publisher, setPublisher] = useState(game.publisher || "");
  const [igdbId, setIgdbId] = useState(game.igdb_id || null);
  const [steamAppId, setSteamAppId] = useState(game.steam_appid || null);

  const [message, setMessage] = useState("");

  function closeModal() {
  setOpen(false);
  setQuery("");
  setResults([]);
  setSelectedGame(null);
  setMessage("");
}

  const [options, setOptions] = useState({
    stores: [] as string[],
    platforms: [] as string[],
    hardware: [] as string[],
  });

  useEffect(() => {
    async function loadOptions() {
      const response = await fetch("/api/admin/game-options");
      const data = await response.json();

      setOptions({
        stores: data.stores || [],
        platforms: data.platforms || [],
        hardware: data.hardware || [],
      });
    }

    loadOptions();
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

    setTitle(game.title || "");
    setRelease(game.releaseDate || "");
    setCoverUrl(game.coverUrl || "");
    setHeroUrl(game.heroUrl || "");
    setSummary(game.summary || "");
    setGenre(game.genre || "");
    setScreenshots(game.screenshots || "");
    setDeveloper(game.developer || "");
    setPublisher(game.publisher || "");
    setIgdbId(game.igdbId || null);
setSteamAppId(game.steamAppId || null);

    setResults([]);
  }

  async function updateGame(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Saving...");

    const response = await fetch(`/api/admin/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

        coverUrl,
        heroUrl,
        summary,
        genre,
        screenshots,
        developer,
        publisher,
        igdbId,
steamAppId,
      }),
    });

    if (!response.ok) {
      setMessage("Failed to update game");
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
        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
      >
        Edit Game
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-6">
          <div className="h-[95dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 text-white sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Game</h2>
              <button onClick={closeModal}>✕</button>
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchGames();
  }
}}
                  placeholder="Search IGDB"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
                />
<select
  value={searchSource}
  onChange={(e) => setSearchSource(e.target.value as "igdb" | "steam")}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
>
  <option value="igdb">IGDB</option>
  <option value="steam">Steam</option>
</select>
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
                      className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-black p-3 text-left hover:border-zinc-500"
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

            <form onSubmit={updateGame} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2" />

              <input type="date" value={release} onChange={(e) => setRelease(e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input type="date" value={dateOfPurchase} onChange={(e) => setDateOfPurchase(e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input type="date" value={completionLastPlayed} onChange={(e) => setCompletionLastPlayed(e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-4 py-3">
                <option value="">Status</option>
                <option value="Completed">Completed</option>
                <option value="Playing">Playing</option>
                <option value="Unplayed">Unplayed</option>
                <option value="Dropped">Dropped</option>
                <option value="Wishlist">Wishlist</option>
              </select>

              <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} placeholder="Hours Played" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />

              <input value={store} onChange={(e) => setStore(e.target.value)} list="game-stores" placeholder="Store" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <datalist id="game-stores">
                {options.stores.map((item) => <option key={item} value={item} />)}
              </datalist>

              <input value={platform} onChange={(e) => setPlatform(e.target.value)} list="game-platforms" placeholder="Platform" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <datalist id="game-platforms">
                {options.platforms.map((item) => <option key={item} value={item} />)}
              </datalist>

              <input value={hardware} onChange={(e) => setHardware(e.target.value)} list="game-hardware" placeholder="Hardware" className="rounded-xl border border-zinc-700 bg-black px-4 py-3" />
              <datalist id="game-hardware">
                {options.hardware.map((item) => <option key={item} value={item} />)}
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
              <button className="rounded-xl bg-white px-4 py-3 font-bold text-black md:col-span-2">
                Update Game
              </button>

              {message && <p className="text-zinc-400 md:col-span-2">{message}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}