import { getGameBySlug } from "@/lib/games";
import Link from "next/link";
import { getIgdbCoverUrl, getIgdbGame } from "@/lib/igdb";
import { getRawgGame } from "@/lib/rawg";
export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameBySlug(id);
const rawgGame = game ? await getRawgGame(game.Title) : null;
const igdbGame = game ? await getIgdbGame(game.Title) : null;
const igdbCover = getIgdbCoverUrl(igdbGame?.cover?.image_id);
  if (!game) {
    return <main className="min-h-screen bg-black text-white p-8">Game not found</main>;
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="pointer-events-none relative h-80 overflow-hidden">
  {rawgGame?.background_image && (
    <img
      src={rawgGame.background_image}
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm scale-105"
    />
  )}

  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0b0f14]/70 to-[#0b0f14]" />
</div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 -mt-56">
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← Back to Library
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <div className="h-[390px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
  {igdbCover ? (
    <img
      src={igdbCover}
      alt={game.Title}
      className="h-full w-full object-cover object-top"
    />
  ) : rawgGame?.background_image ? (
    <img
      src={rawgGame.background_image}
      alt={game.Title}
      className="h-full w-full object-cover object-top"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-7xl">
      🎮
    </div>
  )}
</div>

          <div className="pt-10">
            <div className="mb-3 flex flex-wrap gap-2 text-sm text-zinc-300">
              <span className="rounded bg-zinc-800 px-2 py-1">{game.Status}</span>
              <span className="rounded bg-zinc-800 px-2 py-1">{game.Platform}</span>
              <span className="rounded bg-zinc-800 px-2 py-1">{game.Store}</span>
            </div>

            <h1 className="mb-4 text-5xl font-bold leading-tight">
  {game.Title}
</h1>

<p className="text-red-400 text-sm">
  IGDB: {igdbGame?.name || "No IGDB result"}
</p>

<p className="text-red-400 text-sm mb-4">
  Cover: {igdbCover || "No IGDB cover"}
</p>

            <p className="mb-4 max-w-3xl text-lg leading-8 text-zinc-300">
  Personal entry from Nawaf&apos;s game library. External description, cover,
  developer, genres, and screenshots will be added later.
</p>

{rawgGame?.genres?.length > 0 && (
  <div className="mb-6 flex flex-wrap gap-2">
    {rawgGame.genres.map((genre: { id: number; name: string }) => (
      <span
        key={genre.id}
        className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
      >
        {genre.name}
      </span>
    ))}
  </div>
)}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Score" value={`${game.Score || "-"} / 100`} />
              <Stat label="Playtime" value={game.Hours || "-"} />
              <Stat label="Hours" value={game["Hours Played"] || "-"} />
              <Stat label="Price" value={game.Price || "-"} />
            </div>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h2 className="mb-5 text-2xl font-bold">Library Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Info label="Release Date" value={game.Release} />
            <Info label="Purchase Date" value={game["Date of Purchase"]} />
            <Info label="Completion / Last Played" value={game["Completion Last Played"]} />
            <Info label="Status" value={game.Status} />
            <Info label="Store" value={game.Store} />
            <Info label="Platform" value={game.Platform} />
            <Info label="Hardware" value={game["Hardware (1)"]} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold">{value || "-"}</p>
    </div>
  );
}