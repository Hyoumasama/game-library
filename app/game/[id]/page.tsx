import { getGameBySlug } from "@/lib/games";
import Link from "next/link";
import { getIgdbCoverUrl, getIgdbGame, getIgdbImageUrl } from "@/lib/igdb";
import { getRawgGame } from "@/lib/rawg";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGameBySlug(id);

  if (!game) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Game not found
      </main>
    );
  }

  const rawgGame = await getRawgGame(game.Title);

  let igdbGame = null;

  try {
    igdbGame = await getIgdbGame(game.Title);
  } catch (error) {
    console.error(error);
  }

  const igdbCover = getIgdbCoverUrl(igdbGame?.cover?.image_id);
  const igdbHero = getIgdbImageUrl(igdbGame?.screenshots?.[0]?.image_id);

  const status = game.Status?.trim();

  const statusStyle =
    status === "Completed"
      ? { backgroundColor: "#14532d", color: "#86efac" }
      : status === "Dropped"
      ? { backgroundColor: "#7f1d1d", color: "#fca5a5" }
      : status === "Playing"
      ? { backgroundColor: "#1e3a8a", color: "#93c5fd" }
      : { backgroundColor: "#27272a", color: "#e4e4e7" };

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="pointer-events-none relative h-80 overflow-hidden">
        {igdbHero && (
          <img
            src={igdbHero}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0b0f14]/70 to-[#0b0f14]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 -mt-56">
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← Back to Library
        </Link>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[264px_1fr]">
          <div className="h-fit w-[264px] self-start overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            {igdbCover ? (
              <img
                src={igdbCover}
                alt={game.Title}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : rawgGame?.background_image ? (
              <img
                src={rawgGame.background_image}
                alt={game.Title}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-7xl">
                🎮
              </div>
            )}
          </div>

          <div>
            <div className="mb-10">
              <span
                style={{
                  ...statusStyle,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                {status}
              </span>
            </div>

            <h1 className="mb-4 text-5xl font-bold leading-tight">
              {game.Title}
            </h1>

            <p className="mb-4 max-w-3xl text-lg leading-8 text-zinc-300">
              {igdbGame?.summary || "No description available."}
            </p>

            {igdbGame?.genres?.length ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {igdbGame.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            ) : null}

            {igdbGame?.involved_companies?.length ? (
              <p className="mb-6 text-zinc-400">
                Developer: {igdbGame.involved_companies[0].company.name}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="Score" value={game.Score || "-"} />
              <Stat label="Playtime" value={game.Hours || "-"} />
              <Stat label="Price" value={game.Price || "-"} />
            </div>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h2 className="mb-5 text-2xl font-bold">Library Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Info label="Release Date" value={game.Release} />
            <Info label="Purchase Date" value={game["Date of Purchase"]} />
            <Info
              label="Completion / Last Played"
              value={game["Completion Last Played"]}
            />
            <Info label="Status" value={game.Status} />
            <Info label="Store" value={game.Store} />
            <Info label="Platform" value={game.Platform} />
            <Info label="Hardware" value={game["Hardware (1)"]} />
          </div>
        </section>
        {igdbGame?.screenshots?.length ? (
  <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
    <h2 className="mb-5 text-2xl font-bold">Screenshots</h2>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {igdbGame.screenshots.slice(0, 6).map((shot) => {
        const imageUrl = getIgdbImageUrl(shot.image_id);

        return (
          <div
            key={shot.image_id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-black"
          >
            <img
              src={imageUrl}
              alt={`${game.Title} screenshot`}
              className="aspect-video w-full object-cover transition duration-300 hover:scale-105"
            />
          </div>
        );
      })}
    </div>
  </section>
) : null}
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