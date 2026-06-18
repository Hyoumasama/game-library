"use client";
import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type Game = {
  Title: string;
  Score: string;
  Status: string;
  Platform: string;
  Store: string;
  "Hours Played": string;
  Price: string;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetch("/games.csv")
      .then((response) => response.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGames(results.data as Game[]);
          },
        });
      });
  }, []);

  const dashboard = useMemo(() => {
    const completed = games.filter((g) => g.Status === "Completed").length;
    const playing = games.filter((g) => g.Status === "Playing").length;
    const dropped = games.filter((g) => g.Status === "Dropped").length;
    const unplayed = games.filter((g) => g.Status === "Unplayed").length;
    const wishlist = games.filter((g) => g.Status === "Wishlist").length;

    const totalHours = games.reduce((sum, game) => {
      return sum + Number(game["Hours Played"] || 0);
    }, 0);

    return {
      total: games.length,
      completed,
      playing,
      dropped,
      unplayed,
      wishlist,
      totalHours,
    };
  }, [games]);

  const filteredGames = useMemo(() => {
  return games.filter((game) => {
    const matchesSearch = game.Title?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || game.Status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}, [games, search, statusFilter]);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          🎮 Nawaf&apos;s Game Library
        </h1>

        <p className="text-zinc-400 mb-8">
          Personal gaming database, playtime tracker, and year-in-review hub.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Games" value={dashboard.total} />
          <StatCard label="Completed" value={dashboard.completed} />
          <StatCard label="Playing" value={dashboard.playing} />
          <StatCard label="Unplayed" value={dashboard.unplayed} />
          <StatCard label="Dropped" value={dashboard.dropped} />
          <StatCard label="Wishlist" value={dashboard.wishlist} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StatCard
            label="Total Hours Played"
            value={Math.round(dashboard.totalHours).toLocaleString()}
          />

          <StatCard
            label="Search Results"
            value={filteredGames.length}
          />
        </div>
<div className="flex flex-wrap gap-2 mb-4">
  {["All", "Completed", "Playing", "Unplayed", "Dropped", "Wishlist"].map(
    (status) => (
      <button
        key={status}
        onClick={() => setStatusFilter(status)}
        className={`rounded-full px-4 py-2 text-sm border ${
          statusFilter === status
            ? "bg-white text-black border-white"
            : "bg-zinc-900 text-white border-zinc-700"
        }`}
      >
        {status}
      </button>
    )
  )}
</div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search games..."
          className="w-full mb-6 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none focus:border-white"
        />

        <div className="space-y-3">
          {filteredGames.slice(0, 30).map((game, index) => (
            <div
              key={`${game.Title}-${index}`}
              className="rounded-xl bg-zinc-900 p-4 border border-zinc-800"
            >
              <Link
  href={`/game/${slugify(game.Title)}`}
  className="font-bold text-lg hover:text-blue-400"
>
  {game.Title}
</Link>

              <div className="text-sm text-zinc-400 mt-1">
                Status: {game.Status || "-"} | Platform: {game.Platform || "-"} | Score:{" "}
                {game.Score || "-"} | Hours: {game["Hours Played"] || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-5 border border-zinc-800">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}