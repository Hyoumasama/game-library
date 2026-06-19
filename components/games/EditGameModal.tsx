"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditGameModal({ game }: { game: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(game.Title || "");
  const [release, setRelease] = useState(game.Release || "");
  const [dateOfPurchase, setDateOfPurchase] = useState(game["Date of Purchase"] || "");
  const [completionLastPlayed, setCompletionLastPlayed] = useState(game["Completion Last Played"] || "");
  const [status, setStatus] = useState(game.Status || "");
  const [score, setScore] = useState(game.Score || "");
  const [hoursPlayed, setHoursPlayed] = useState(game["Hours Played"] || "");
  const [price, setPrice] = useState(game.Price || "");
  const [store, setStore] = useState(game.Store || "");
  const [platform, setPlatform] = useState(game.Platform || "");
  const [hardware, setHardware] = useState(game["Hardware (1)"] || "");
  const [message, setMessage] = useState("");

  const [options, setOptions] = useState({
  stores: [] as string[],
  platforms: [] as string[],
  hardware: [] as string[],
});

useEffect(() => {
  async function loadOptions() {
    const response = await fetch("/api/admin/game-options");
    const data = await response.json();


console.log("OPTIONS:", data);


    setOptions({
      stores: data.stores || [],
      platforms: data.platforms || [],
      hardware: data.hardware || [],
    });
  }

  loadOptions();
}, []);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Game</h2>
              <button onClick={() => setOpen(false)}>✕</button>
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