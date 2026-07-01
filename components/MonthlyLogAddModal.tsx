"use client";

import { useState } from "react";

type SearchGame = {
  id: number;
  title: string;
  hours_played: number | null;
};

export default function MonthlyLogAddModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<SearchGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<SearchGame | null>(null);
  const [currentTotalHours, setCurrentTotalHours] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [isSaving, setIsSaving] = useState(false);
const previousTotalHours = Number(selectedGame?.hours_played || 0);
const currentTotal = Number(currentTotalHours || 0);
const thisMonthHours = Math.max(currentTotal - previousTotalHours, 0);

  async function searchGames(value: string) {
    setQuery(value);
    setSelectedGame(null);

    if (!value.trim()) {
      setGames([]);
      return;
    }

    const response = await fetch(`/api/monthly-log-games?q=${encodeURIComponent(value)}`);
    const data = await response.json();
    setGames(data);
  }

  async function saveLog() {
    if (!selectedGame) {
      alert("Choose a game first");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/monthly-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game_id: selectedGame.id,
        title: selectedGame.title,
       hours: thisMonthHours,
currentTotalHours,
        month,
        year,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      alert("Failed to save log");
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-black hover:bg-cyan-300"
      >
        + Add Log
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Add Monthly Log</h2>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-400">
                  Game
                </label>

                <input
                  value={query}
                  onChange={(event) => searchGames(event.target.value)}
                  placeholder="Search game..."
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />

                {games.length > 0 && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-zinc-800 bg-black">
                    {games.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => {
                          setSelectedGame(game);
setQuery(game.title);
setCurrentTotalHours(String(game.hours_played || ""));
setGames([]);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-900"
                      >
                        {game.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
  <div>
    <label className="mb-2 block text-sm font-bold text-zinc-400">
      Previous Total
    </label>

    <input
      value={previousTotalHours}
      readOnly
      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-400 outline-none"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm font-bold text-zinc-400">
      Current Total
    </label>

    <input
      value={currentTotalHours}
      onChange={(event) => setCurrentTotalHours(event.target.value)}
      type="number"
      step="0.01"
      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm font-bold text-zinc-400">
      This Month
    </label>

    <input
      value={thisMonthHours}
      readOnly
      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-cyan-300 outline-none"
    />
  </div>
</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-400">
                    Month
                  </label>

                  <input
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    type="number"
                    min="1"
                    max="12"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-400">
                    Year
                  </label>

                  <input
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    type="number"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>
              </div>

              <button
                onClick={saveLog}
                disabled={isSaving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-black hover:bg-cyan-300 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}