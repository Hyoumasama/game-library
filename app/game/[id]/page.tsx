import { getGameBySlug, getGames } from "@/lib/games";
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

  const games = await getGames();

  if (!game) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Game not found
      </main>
    );
  }

  const rawgGame = await getRawgGame(game.Title);

  function formatHours(hours: string) {
  const value = Number(hours || 0);
  if (!value) return "0";
  return value.toFixed(1).replace(".0", "");
}

function getLogo(value: string) {
  const text = value?.toLowerCase() || "";

  // Stores
  if (text.includes("steam")) return "/platforms/steam.png";
  if (text.includes("epic")) return "/platforms/epicgames.png";
  if (text.includes("psn")) return "/platforms/psn.png";
  if (text.includes("playstation")) return "/platforms/psn.png";
  if (text.includes("xbox")) return "/platforms/xbox.png";
  if (text.includes("switch")) return "/platforms/switch.png";
  if (text.includes("ea desktop")) return "/platforms/eadesktop.ico";
  if (text.includes("gog")) return "/platforms/gog.jpeg";
  if (text.includes("piracy")) return "/platforms/piracy.png";

  // Emulators
  if (text.includes("pcsx2")) return "/platforms/pcsx2.png";
  if (text.includes("duckstation")) return "/platforms/duckstation.png";
  if (text.includes("rpcs3")) return "/platforms/rpcs3.png";
  if (text.includes("xenia")) return "/platforms/xenia.png";
  if (text.includes("citra")) return "/platforms/citra.png";
  if (text.includes("yuzu")) return "/platforms/yuzu.png";
  if (text.includes("ryujinx")) return "/platforms/ryujinx.png";
  if (text.includes("cemu")) return "/platforms/cemu.png";
  if (text.includes("retroarch")) return "/platforms/retroarch.png";

  return null;
}
function getYear(value?: string) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function getDaysBetween(start?: string, end?: string) {
  if (!start || !end) return "-";

  const startDate = new Date(start);
  const endDate = new Date(end);

  const diff =
    Math.abs(endDate.getTime() - startDate.getTime()) /
    (1000 * 60 * 60 * 24);

  return `${Math.round(diff)} Days`;
}

function getRankText({
  games,
  currentValue,
  currentYear,
  getValue,
  getYearValue,
}: {
  games: any[];
  currentValue: number;
  currentYear: string;
  getValue: (game: any) => number;
  getYearValue: (game: any) => string;
}) {
  if (!currentValue || !currentYear) return undefined;

  const sameYearGames = games.filter((game) => {
    return getYearValue(game) === currentYear && getValue(game) > 0;
  });

  const betterCount = sameYearGames.filter((game) => {
    return getValue(game) > currentValue;
  }).length;

  return `Ranked #${betterCount + 1} (${currentYear})`;
}

function getHardwareLogo(hardware: string) {
  const value = hardware?.toLowerCase() || "";

  if (value.includes("pc")) return "/hardware/pc.png";
  if (value.includes("steamdeck") || value.includes("steam deck"))
    return "/hardware/steamdeck.svg";
  if (value.includes("steamdeck ico") || value.includes("deck icon"))
    return "/hardware/steamdeck.ico";

  if (value.includes("playstation 1") || value.includes("ps1"))
    return "/hardware/playstation.png";
  if (value.includes("playstation 2") || value.includes("ps2"))
    return "/hardware/playstation.png";
  if (value.includes("playstation 3") || value.includes("ps3"))
    return "/hardware/playstation.png";
  if (value.includes("playstation 4") || value.includes("ps4"))
    return "/hardware/playstation.png";
  if (value.includes("playstation 5") || value.includes("ps5"))
    return "/hardware/playstation.png";

  if (value.includes("psp") || value.includes("playstation portable"))
    return "/hardware/playstationportable.svg";
  if (value.includes("vita") || value.includes("playstation vita"))
    return "/hardware/playstationvita.svg";

  if (value.includes("xbox")) return "/hardware/xbox.png";

  return null;
}

  let igdbGame = null;

  try {
    igdbGame = await getIgdbGame(game.Title, getYear(game.Release));
  } catch (error) {
    console.error(error);
  }

  const igdbCover = getIgdbCoverUrl(igdbGame?.cover?.image_id);
  const igdbHero = getIgdbImageUrl(igdbGame?.screenshots?.[0]?.image_id);
const releaseYear = getYear(game.Release);

const scoreRank = getRankText({
  games,
  currentValue: Number(game.Score || 0),
  currentYear: releaseYear,
  getValue: (game) => Number(game.Score || 0),
  getYearValue: (game) => getYear(game.Release),
});

const playtimeRank = getRankText({
  games,
  currentValue: Number(game["Hours Played"] || 0),
  currentYear: releaseYear,
  getValue: (game) => Number(game["Hours Played"] || 0),
  getYearValue: (game) => getYear(game.Release),
});

const completedYear = getYear(game["Completion Last Played"]);

const status = game.Status?.trim();

const completedRank =
  status === "Completed"
    ? getRankText({
        games: games.filter((game) => game.Status?.trim() === "Completed"),
        currentValue: Number(game["Hours Played"] || 0),
        currentYear: completedYear,
        getValue: (game) => Number(game["Hours Played"] || 0),
        getYearValue: (game) => getYear(game["Completion Last Played"]),
      })
    : undefined;
  
    const daysToPurchase = getDaysBetween(
  game.Release,
  game["Date of Purchase"]
);

const daysToComplete = getDaysBetween(
  game["Date of Purchase"],
  game["Completion Last Played"]
);

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
            <div className="mb-1">
              <span
                style={{
                  ...statusStyle,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                {status}
{completedRank ? ` • ${completedRank}` : ""}
              </span>
            </div>

            <h1 className="mb-1 text-5xl font-bold leading-tight">
              {game.Title}
            </h1>

            <p className="mb-4 max-w-3xl text-lg leading-8 text-zinc-300">
              {igdbGame?.summary || "No description available."}
            </p>

            {igdbGame?.genres?.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
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
  <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-zinc-400">
    <p>
      Developers:{" "}
      <span className="text-zinc-200">
        {igdbGame.involved_companies
          .filter((item) => item.developer)
          .map((item) => item.company.name)
          .join(", ") || "-"}
      </span>
    </p>

    <p>
      Publishers:{" "}
      <span className="text-zinc-200">
        {igdbGame.involved_companies
          .filter((item) => item.publisher)
          .map((item) => item.company.name)
          .join(", ") || "-"}
      </span>
    </p>
  </div>
) : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="Score" value={game.Score || "-"} rank={scoreRank} />
              <Stat
  label="Playtime"
  value={`${formatHours(game["Hours Played"])} Hours`}
  rank={playtimeRank}
/>
              <Stat
  label="Price"
  value={game.Price || "-"}
  rank={
    Number(game.Price) > 0 &&
    Number(game["Hours Played"]) > 0
      ? `${(
          Number(game.Price) /
          Number(game["Hours Played"])
        ).toFixed(2)} SAR / Hour`
      : undefined
  }
/>
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
  <Info label="Days to Purchase" value={daysToPurchase} />
  <Info label="Days to Complete" value={daysToComplete} />

  <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
    <p className="text-sm text-zinc-500">Hardware</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
      {getHardwareLogo(game["Hardware (1)"]) && (
        <img
          src={getHardwareLogo(game["Hardware (1)"])!}
          alt={game["Hardware (1)"]}
          style={{
            width: "24px",
            height: "24px",
            objectFit: "contain",
          }}
        />
      )}

      <span>{game["Hardware (1)"] || "-"}</span>
    </div>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
    <p className="text-sm text-zinc-500">Store</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
      {getLogo(game.Store) && (
        <img
          src={getLogo(game.Store)!}
          alt={game.Store}
          style={{
            width: "22px",
            height: "22px",
            objectFit: "contain",
          }}
        />
      )}

      <span>{game.Store || "-"}</span>
    </div>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
    <p className="text-sm text-zinc-500">Platform</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
      {getLogo(game.Platform) && (
        <img
          src={getLogo(game.Platform)!}
          alt={game.Platform}
          style={{
            width: "22px",
            height: "22px",
            objectFit: "contain",
          }}
        />
      )}

      <span>{game.Platform || "-"}</span>
    </div>
  </div>
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


function Stat({
  label,
  value,
  rank,
}: {
  label: string;
  value: string;
  rank?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-1 text-2xl font-bold">{value}</p>

      {rank && (
        <p className="mt-1 text-sm text-zinc-500">
          {rank}
        </p>
      )}
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