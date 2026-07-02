"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PLAYSTATION_VALUES = ["PSN", "PS1", "PS2", "PS3", "PS4", "PS5"];

function isPlayStationGame(store: string, platform: string) {
  const value = `${store} ${platform}`.toUpperCase();

  return PLAYSTATION_VALUES.some((item) => value.includes(item));
}

function calculateRewardCompletion(earnedAwards: string, totalAwards: string) {
  const earned = Number(earnedAwards);
  const total = Number(totalAwards);

  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.floor((earned / total) * 100));
}

type OwnedGame = {
  id: number;
  title: string;
  slug: string;
  store: string | null;
  platform: string | null;
  hardware: string | null;
  status: string | null;
};

type SearchResult = {
  source?: "igdb" | "steam";
  igdbId: number | null;
  steamAppId?: number | null;
  title: string;
  year: number | null;
  releaseDate?: string;
  

  coverUrl: string | null;
  heroUrl?: string | null;
  wideCoverUrl?: string | null;

  summary: string;

genre?: string | null;
screenshots?: string | null;
developer?: string | null;
publisher?: string | null;
};

export default function AddGameModal({
  onGameAdded,
}: {
  onGameAdded?: () => void;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"igdb" | "steam">("igdb");
const [results, setResults] = useState<SearchResult[]>([]);
const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
const [ownedGames, setOwnedGames] = useState<OwnedGame[]>([]);
  const [title, setTitle] = useState("");
  const [release, setRelease] = useState("");
  const [status, setStatus] = useState("Unplayed");
  const [score, setScore] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("");
  const [price, setPrice] = useState("Piracy");
  const [store, setStore] = useState("Piracy");
  const [platform, setPlatform] = useState("Piracy");
  const [hardware, setHardware] = useState("PC");
  const [coverUrl, setCoverUrl] = useState("");
const [heroUrl, setHeroUrl] = useState("");
const [wideCoverUrl, setWideCoverUrl] = useState("");
const [steamVerticalCover, setSteamVerticalCover] = useState("");
const [wideCoverOptions, setWideCoverOptions] = useState<string[]>([]);
const [steamVerticalCoverOptions, setSteamVerticalCoverOptions] = useState<string[]>([]);
const [summary, setSummary] = useState("");
const [genre, setGenre] = useState("");
const [developer, setDeveloper] = useState("");
const [publisher, setPublisher] = useState("");
const [screenshots, setScreenshots] = useState("");
const [igdbId, setIgdbId] = useState<number | null>(null);
const [steamAppId, setSteamAppId] = useState<number | null>(null);
const [bronze, setBronze] = useState("");
const [silver, setSilver] = useState("");
const [gold, setGold] = useState("");
const [platinum, setPlatinum] = useState(false);
const [earnedAwards, setEarnedAwards] = useState("");
const [totalAwards, setTotalAwards] = useState("");
const [completionPercentage, setCompletionPercentage] = useState("");
  const [message, setMessage] = useState("");
const [dateStarted, setDateStarted] = useState("");
  const [dateOfPurchase, setDateOfPurchase] = useState(
  new Date().toISOString().slice(0, 10)
);
const [completionLastPlayed, setCompletionLastPlayed] = useState("");

const playStationGame = isPlayStationGame(store, platform);
const rewardCompletionPercentage = calculateRewardCompletion(
  earnedAwards,
  totalAwards
);

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

useEffect(() => {
  if (!open) return;

  const cleanQuery = query.trim();

  if (cleanQuery.length < 3) {
    setResults([]);
    return;
  }

  const timeout = window.setTimeout(() => {
    searchGames(cleanQuery);
  }, 400);

  return () => window.clearTimeout(timeout);
}, [query, searchSource, open]);

  async function searchGames(searchText = query) {
  const cleanQuery = searchText.trim();

  if (cleanQuery.length < 3) {
    setResults([]);
      return;
  }

  setMessage("Searching...");

  const endpoint =
    searchSource === "steam"
      ? "/api/admin/steam-search"
      : "/api/admin/igdb-search";

  const response = await fetch(
    `${endpoint}?query=${encodeURIComponent(cleanQuery)}`
  );

  const data = await response.json();

  setResults(data.results || []);
  setMessage("");
}

  async function selectGame(game: SearchResult) {
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
  try {
  const ownedResponse = await fetch(
    `/api/admin/owned-games?title=${encodeURIComponent(game.title)}`
  );

  const ownedData = await ownedResponse.json();

  setOwnedGames(ownedData.games || []);
} catch (error) {
  console.error("Failed to check owned games:", error);
  setOwnedGames([]);
}
  try {
  const params = new URLSearchParams();

  if (game.title) {
    params.set("title", game.title);
  }

  if (game.steamAppId) {
    params.set("steamAppId", String(game.steamAppId));
  }

  const steamGridResponse = await fetch(
    `/api/admin/steamgriddb-search?${params.toString()}`
  );

  const steamGridData = await steamGridResponse.json();

  setWideCoverUrl(steamGridData.wideCoverUrl || "");
  setSteamVerticalCover(steamGridData.steamVerticalCover || "");
  setWideCoverOptions(steamGridData.wideCoverOptions || []);
setSteamVerticalCoverOptions(steamGridData.steamVerticalCoverOptions || []);
} catch (error) {
  console.error("Failed to fetch SteamGridDB covers:", error);
  setWideCoverUrl("");
  setSteamVerticalCover("");
  setWideCoverOptions([]);
setSteamVerticalCoverOptions([]);
}
}

  function resetForm() {
    setQuery("");
    setResults([]);
    setSelectedGame(null);
    setOwnedGames([]);

    setTitle("");
    setRelease("");
    setDateOfPurchase(new Date().toISOString().slice(0, 10));
    setCompletionLastPlayed("");

    setStatus("Unplayed");
    setScore("");
    setHoursPlayed("");

    setPrice("Piracy");
    setStore("Piracy");
    setPlatform("Piracy");
    setHardware("PC");

    setCoverUrl("");
    setHeroUrl("");
    setWideCoverUrl("");
    setSteamVerticalCover("");

    setWideCoverOptions([]);
    setSteamVerticalCoverOptions([]);

    setSummary("");
    setGenre("");
    setDeveloper("");
    setPublisher("");
    setScreenshots("");

    setIgdbId(null);
    setSteamAppId(null);
    setBronze("");
    setSilver("");
    setGold("");
    setPlatinum(false);
    setEarnedAwards("");
setTotalAwards("");
setCompletionPercentage("");
    setMessage("");
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
  dateStarted,
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
wideCoverUrl,
steamVerticalCover,
summary,
genre,
developer,
publisher,
screenshots,
bronze,
silver,
gold,
platinum,
earnedAwards,
totalAwards,
completionPercentage: playStationGame
  ? completionPercentage
  : rewardCompletionPercentage,
}),
    });

    if (!response.ok) {
      setMessage("Failed to save game");
      return;
    }
        resetForm();
setOpen(false);

onGameAdded?.();
router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
  resetForm();
  setOpen(true);
}}
        className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black"
      >
        + Add Game
      </button>

      {open && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-6"
    onClick={() => {
  resetForm();
  setOpen(false);
}}
  >
    <div
      className="h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 sm:w-[calc(100vw-24px)] sm:rounded-3xl sm:p-8"
      onClick={(event) => event.stopPropagation()}
    >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Game</h2>

              <button
  onClick={() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelectedGame(null);
    setOwnedGames([]);
    setTitle("");
    setRelease("");
    setStatus("Unplayed");
    setScore("");
    setHoursPlayed("");
    setPrice("Piracy");
    setStore("Piracy");
    setPlatform("Piracy");
    setHardware("PC");
    setCoverUrl("");
    setHeroUrl("");
    setWideCoverUrl("");
setSteamVerticalCover("");
setWideCoverOptions([]);
setSteamVerticalCoverOptions([]);
    setSummary("");
    setGenre("");
    setDeveloper("");
    setPublisher("");
    setScreenshots("");
    setIgdbId(null);
    setSteamAppId(null);
    setCompletionLastPlayed("");
        setBronze("");
    setSilver("");
    setGold("");
    setPlatinum(false);
    setEarnedAwards("");
    setCompletionPercentage("");
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
    onClick={() => searchGames()}
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

              {selectedGame && ownedGames.length > 0 && (
                <div className="mt-5 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4">
                  <p className="font-bold text-yellow-300">
                    Similar game owned:
                  </p>

                  <div className="mt-3 grid gap-2">
                    {ownedGames.map((owned) => (
                      <a
                        key={owned.id}
                        href={`/games/${owned.slug}`}
                        className="rounded-xl border border-yellow-500/20 bg-black/40 p-3 text-sm transition hover:border-yellow-400"
                      >
                        <span className="font-bold text-white">
                          {owned.title}
                        </span>

                        <span className="mt-1 block text-zinc-300">
                          {owned.store || "-"} • {owned.platform || "-"} •{" "}
                          {owned.hardware || "-"} • {owned.status || "-"}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
  value={dateStarted}
  onChange={(e) => setDateStarted(e.target.value)}
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
              <select value={status}
onChange={(e) => {
  const newStatus = e.target.value;

  setStatus(newStatus);

    if (newStatus === "Wishlist") {
    setDateOfPurchase("");
    setPrice("");
    setStore("");
    setPlatform("");
    setHardware("");
    return;
  }

  if (!dateOfPurchase) {
    setDateOfPurchase(new Date().toISOString().slice(0, 10));
  }

  if (newStatus === "Playing" && !dateStarted) {
    setDateStarted(new Date().toISOString().slice(0, 10));
  }
}}

className="rounded-xl border border-zinc-700 bg-black px-4 py-3">
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
<input
  value={genre}
  onChange={(e) => setGenre(e.target.value)}
  placeholder="Genre"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>
<datalist id="game-hardware">
  {options.hardware.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>


<div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
  <p className="mb-3 text-sm font-bold text-zinc-300">Achievements</p>

  {playStationGame ? (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <input
        type="number"
        min="0"
        value={bronze}
        onChange={(e) => setBronze(e.target.value)}
        placeholder="Bronze"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        type="number"
        min="0"
        value={silver}
        onChange={(e) => setSilver(e.target.value)}
        placeholder="Silver"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        type="number"
        min="0"
        value={gold}
        onChange={(e) => setGold(e.target.value)}
        placeholder="Gold"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        type="number"
        min="0"
        max="1"
        value={platinum ? "1" : "0"}
        onChange={(e) => setPlatinum(e.target.value === "1")}
        placeholder="Platinum"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        type="number"
        min="0"
        max="100"
        value={completionPercentage}
        onChange={(e) => setCompletionPercentage(e.target.value)}
        placeholder="0%"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <input
        type="number"
        min="0"
        value={earnedAwards}
        onChange={(e) => setEarnedAwards(e.target.value)}
        placeholder="Earned Rewards"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        type="number"
        min="0"
        value={totalAwards}
        onChange={(e) => setTotalAwards(e.target.value)}
        placeholder="Total Rewards"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
      />

      <input
        value={`${rewardCompletionPercentage}%`}
        readOnly
        placeholder="0%"
        className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-zinc-400"
      />
    </div>
  )}
</div>

<textarea
  value={summary}
  onChange={(e) => setSummary(e.target.value)}
  placeholder="Summary"
  rows={5}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
/>

<div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
 <p className="mb-3 text-sm font-bold text-zinc-300">
  Steam Vertical Cover Preview
</p>

{steamVerticalCover ? (
  <img
    src={steamVerticalCover}
    alt="Steam vertical cover preview"
    className="h-56 w-40 rounded-xl object-cover"
  />
) : (
    <div className="flex h-56 w-40 items-center justify-center rounded-xl bg-zinc-800 text-4xl">
      🎮
    </div>
  )}
{steamVerticalCoverOptions.length > 0 && (
  <div className="mt-4 grid grid-cols-5 gap-2">
    {steamVerticalCoverOptions.map((url) => (
      <button
        key={url}
        type="button"
        onClick={() => setSteamVerticalCover(url)}
        className={`overflow-hidden rounded-lg border ${
          steamVerticalCover === url ? "border-white" : "border-zinc-700"
        }`}
      >
        <img
          src={url}
          alt="Vertical option"
          className="aspect-[2/3] w-full object-cover"
        />
      </button>
    ))}
  </div>
)}
  <input
    value={steamVerticalCover}
onChange={(e) => setSteamVerticalCover(e.target.value)}
placeholder="Steam Vertical Cover URL"
    className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
  />
</div>


<div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
  <p className="mb-3 text-sm font-bold text-zinc-300">
    Wide Cover Preview
  </p>

  {wideCoverUrl ? (
    <img
      src={wideCoverUrl}
      alt="Wide cover preview"
      className="aspect-[92/43] w-full rounded-xl object-cover"
    />
  ) : (
    <div className="flex aspect-[92/43] w-full items-center justify-center rounded-xl bg-zinc-800 text-4xl">
      🎮
    </div>
  )}
{wideCoverOptions.length > 0 && (
  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
    {wideCoverOptions.map((url) => (
      <button
        key={url}
        type="button"
        onClick={() => setWideCoverUrl(url)}
        className={`overflow-hidden rounded-lg border ${
          wideCoverUrl === url ? "border-white" : "border-zinc-700"
        }`}
      >
        <img
          src={url}
          alt="Wide option"
          className="aspect-[92/43] w-full object-cover"
        />
      </button>
    ))}
  </div>
)}
  <input
    value={wideCoverUrl}
    onChange={(e) => setWideCoverUrl(e.target.value)}
    placeholder="Wide Cover URL"
    className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
  />
</div>

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