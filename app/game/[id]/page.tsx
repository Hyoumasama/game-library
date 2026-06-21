import BackButton from "@/components/BackButton";
import GameAdminActions from "@/components/games/GameAdminActions";
import { getGameById, getGames } from "@/lib/games";
import Link from "next/link";

function getPlatformLogo(platform?: string) {
  const value = platform?.toLowerCase() || "";

  if (value.includes("steam")) return "/platforms/steam.png";
  if (value.includes("epic")) return "/platforms/epicgames.png";
  if (value.includes("psn")) return "/platforms/psn.png";
  if (value.includes("playstation")) return "/platforms/psn.png";
  if (value.includes("xbox")) return "/platforms/xbox.png";
  if (value.includes("switch")) return "/platforms/switch.png";
  if (value.includes("ea desktop")) return "/platforms/eadesktop.ico";

  if (value.includes("pcsx2")) return "/platforms/pcsx2.png";
  if (value.includes("duckstation")) return "/platforms/duckstation.png";
  if (value.includes("rpcs3")) return "/platforms/rpcs3.png";
  if (value.includes("xenia")) return "/platforms/xenia.png";
  if (value.includes("citra")) return "/platforms/citra.png";
  if (value.includes("yuzu")) return "/platforms/yuzu.png";
  if (value.includes("ryujinx")) return "/platforms/ryujinx.png";
  if (value.includes("cemu")) return "/platforms/cemu.png";
  if (value.includes("retroarch")) return "/platforms/retroarch.png";

  if (value.includes("gog")) return "/platforms/gog.jpeg";
  if (value.includes("piracy")) return "/platforms/piracy.png";

  return null;
}

function getHardwareLogo(hardware?: string) {
  const value = hardware?.toLowerCase().replace(/\s+/g, "") || "";

  if (value === "pc") return "/hardware/pc.png";
  if (value.includes("steamdeck")) return "/hardware/steamdeck.png";
  if (value.includes("xbox")) return "/hardware/xbox.png";

  if (value.includes("playstation4") || value.includes("ps4"))
    return "/hardware/playstation4.png";

  if (value.includes("playstation3") || value.includes("ps3"))
    return "/hardware/playstation3.png";

  if (value.includes("playstation2") || value.includes("ps2"))
    return "/hardware/playstation2.png";

  if (value.includes("playstation") || value.includes("ps5"))
    return "/hardware/playstation.png";

  return null;
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formatted = date.toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

return formatted.replace(/ (\d{4})$/, ", $1");
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
 const game = await getGameById(Number(id));
console.log("GAME DATA:");
console.log(game);
const games = await getGames();

if (!game) {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      Game not found
    </main>
  );
}

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
    return "/hardware/steamdeck.png";
  if (value.includes("steamdeck png") || value.includes("deck icon"))
    return "/hardware/steamdeck.png";

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
const coverImage = game.cover_url;
const steamVerticalCover = game.steam_vertical_cover;
const heroImage = game.hero_url;
const wideCoverImage = game.wide_cover_url;

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
        {heroImage && (
  <img
    src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0b0f14]/70 to-[#0b0f14]" />
      </div>

      <div className="relative z-10 mx-auto hidden max-w-6xl px-6 pb-12 -mt-56 md:block">
       <div className="mb-6 flex items-center justify-between">
  <BackButton />

  <GameAdminActions game={game} />
</div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[264px_1fr]">
          <div className="h-fit w-[264px] self-start overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            {steamVerticalCover || coverImage ? (
  <img
    src={steamVerticalCover || coverImage}
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
              {game.summary || "No description available."}
            </p>

           {game.genre ? (
  <div className="mb-4 flex flex-wrap gap-2">
    {game.genre.split(",").map((genre: string) => (
      <span
        key={genre}
        className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
      >
        {genre.trim()}
      </span>
    ))}
  </div>
) : null}

            {game.developer || game.publisher ? (
  <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-zinc-400">
    <p>
      Developers:
      <span className="text-zinc-200">
        {" "}
        {game.developer || "-"}
      </span>
    </p>

    <p>
      Publishers:
      <span className="text-zinc-200">
        {" "}
        {game.publisher || "-"}
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
  <Info label="Release Date" value={formatDisplayDate(game.Release)} />
  <Info label="Purchase Date" value={formatDisplayDate(game["Date of Purchase"])} />
  <Info
    label="Completion / Last Played"
    value={formatDisplayDate(game["Completion Last Played"])}
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
        {game.screenshots ? (
  <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
    <h2 className="mb-5 text-2xl font-bold">Screenshots</h2>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {game.screenshots
        .split(",")
        .map((url: string) => url.trim())
        .filter(Boolean)
        .map((url: string) => (
          <img
            key={url}
            src={url}
            alt={`${game.Title} screenshot`}
            className="aspect-video w-full rounded-xl border border-zinc-800 object-cover"
          />
        ))}
    </div>
  </section>
) : null}
      </div>
      <div className="relative z-10 mx-auto block px-4 pb-10 -mt-76 md:hidden">
  <div className="mb-4 flex items-center justify-between gap-3">
    <BackButton />

    <GameAdminActions game={game} />
  </div>

  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
    {wideCoverImage ? (
  <img
    src={wideCoverImage}
    alt={game.Title}
    className="aspect-video w-full object-cover"
  />
) : heroImage ? (
  <img
    src={heroImage}
    alt={game.Title}
    className="aspect-video w-full object-cover"
  />
) : coverImage ? (
  <img
    src={coverImage}
    alt={game.Title}
    className="aspect-video w-full object-cover"
  />
) : (
      <div className="flex aspect-video items-center justify-center bg-zinc-900 text-6xl">
        🎮
      </div>
    )}

    <div className="p-4">
      <span
        style={{
          ...statusStyle,
          padding: "4px 8px",
          borderRadius: "6px",
          fontSize: "12px",
        }}
      >
        {status}
      </span>

      <h1 className="mt-3 text-3xl font-black leading-tight">
        {game.Title}
      </h1>

      <p className="mt-3 line-clamp-5 text-sm leading-6 text-zinc-300">
        {game.summary || "No description available."}
      </p>

            <>
  <div className="mt-4 flex flex-wrap gap-2">
    {game.genre
      ? game.genre.split(",").map((genre: string) => (
          <span
            key={genre}
            className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200"
          >
            {genre.trim()}
          </span>
        ))
      : null}
  </div>
</>

  <div className="mt-2 flex flex-wrap items-center gap-2">
  <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200">
          {game.Price && !isNaN(Number(game.Price))
            ? `${game.Price} SAR`
            : game.Price || "-"}
        </span>

        {getPlatformLogo(game.Platform) && (
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            <img
              src={getPlatformLogo(game.Platform)!}
              alt=""
              className="h-4 w-4 object-contain"
            />
          </span>
        )}

        {getHardwareLogo(game["Hardware (1)"]) && (
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            <img
              src={getHardwareLogo(game["Hardware (1)"])!}
              alt=""
              className="h-4 w-4 object-contain"
            />
          </span>
        )}
      </div>
    </div>
  </div>

  <div className="mt-4 grid grid-cols-2 gap-3">
  <Stat label="Score" value={game.Score || "-"} rank={scoreRank} />

  <Stat
    label="Playtime"
    value={`${formatHours(game["Hours Played"])} Hours`}
    rank={playtimeRank}
  />

</div>

  <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
    <h2 className="mb-4 text-xl font-bold">Library Details</h2>

    <div className="space-y-3 text-sm">
  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Release Date</span>
    <span>{formatDisplayDate(game.Release)}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Purchase Date</span>
    <span>{formatDisplayDate(game["Date of Purchase"])}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Completion / Last Played</span>
    <span>{formatDisplayDate(game["Completion Last Played"])}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Days to Purchase</span>
    <span>{daysToPurchase}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Days to Complete</span>
    <span>{daysToComplete}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Developer</span>
    <span>{game.developer || "-"}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Publisher</span>
    <span>{game.publisher || "-"}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Store</span>
    <span>{game.Store || "-"}</span>
  </div>

  <div className="flex justify-between border-b border-zinc-800 pb-2">
    <span className="text-zinc-400">Platform</span>
    <span>{game.Platform || "-"}</span>
  </div>

  <div className="flex justify-between">
    <span className="text-zinc-400">Hardware</span>
    <span>{game["Hardware (1)"] || "-"}</span>
  </div>
</div>
  </section>

  {game.screenshots ? (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <h2 className="mb-4 text-xl font-bold">Screenshots</h2>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {game.screenshots
          .split(",")
          .map((url: string) => url.trim())
          .filter(Boolean)
          .map((url: string) => (
            <img
              key={url}
              src={url}
              alt={`${game.Title} screenshot`}
              className="aspect-video w-[260px] shrink-0 rounded-xl border border-zinc-800 object-cover"
            />
          ))}
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