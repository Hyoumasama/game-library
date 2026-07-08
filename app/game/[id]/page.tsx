import GamePageMobileMenu from "@/components/GamePageMobileMenu";
import HomeGameSearch from "@/components/HomeGameSearch";
import BackButton from "@/components/BackButton";
import GameAdminActions from "@/components/games/GameAdminActions";
import { getGameById } from "@/lib/games";
import {
  formatDisplayDate,
  formatHours,
  getDaysBetween,
  getIcon,
  getYearFromDate,
} from "@/lib/gameHelpers";
import { getRankFromDatabase } from "@/lib/server/gameRanking";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
 const game = await getGameById(Number(id));
if (!game) {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      Game not found
    </main>
  );
}

const coverImage = game.cover_url || undefined;
const steamVerticalCover = game.steam_vertical_cover || undefined;
const heroImage = game.hero_url || undefined;
const wideCoverImage = game.wide_cover_url || undefined;

const releaseYear = getYearFromDate(game.Release);

const scoreRank = await getRankFromDatabase({
  column: "score",
  currentValue: Number(game.Score || 0),
  yearColumn: "release",
  currentYear: releaseYear,
});

const playtimeRank = await getRankFromDatabase({
  column: "hours_played",
  currentValue: Number(game["Hours Played"] || 0),
  yearColumn: "release",
  currentYear: releaseYear,
});

const completedYear = getYearFromDate(game["Completion Last Played"]);

const status = game.Status?.trim();

const completedRank =
  status === "Completed"
    ? await getRankFromDatabase({
        column: "hours_played",
        currentValue: Number(game["Hours Played"] || 0),
        yearColumn: "completion_last_played",
        currentYear: completedYear,
        status: "Completed",
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
    ? { backgroundColor: "rgba(34, 211, 238, 0.15)", color: "#67e8f9" }
    : status === "Playing"
      ? { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd" }
      : status === "Dropped"
        ? { backgroundColor: "rgba(248, 113, 113, 0.15)", color: "#fca5a5" }
        : status === "Unplayed"
          ? { backgroundColor: "rgba(250, 204, 21, 0.15)", color: "#fde047" }
          : { backgroundColor: "#27272a", color: "#e4e4e7" };

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
  <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />
  
      <div className="mx-auto hidden max-w-6xl px-6 py-12 lg:block">
       <div className="mb-6 flex items-center justify-between">
  <BackButton />

  <div className="flex items-center gap-3">
    <div className="w-[300px]">
      <HomeGameSearch />
    </div>

    <GameAdminActions game={game} />
  </div>
</div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[264px_1fr]">
          <div className="relative h-fit w-[264px] self-start overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
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

  {Number(game.Score || 0) > 0 && (
    <span
      className={`absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black ${
        Number(game.Score) >= 76
          ? "bg-emerald-400 text-black"
          : Number(game.Score) >= 60
            ? "bg-yellow-400 text-black"
            : "bg-red-400 text-black"
      }`}
    >
      {game.Score}
    </span>
  )}

  {Number(game["Hours Played"] || 0) > 0 && (
    <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
      {formatHours(game["Hours Played"])}h
    </span>
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
{scoreRank ? ` • Score ${scoreRank}` : ""}
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

          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6">
          <h2 className="mb-5 text-2xl font-bold">Library Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <Info label="Release Date" value={formatDisplayDate(game.Release)} />
  <Info label="Purchase Date" value={formatDisplayDate(game["Date of Purchase"])} />
  <Info
    label="Completion / Last Played"
    value={formatDisplayDate(game["Completion Last Played"])}
  />

  <Info label="Price" value={game.Price} />
  <Info label="Days to Purchase" value={daysToPurchase} />
  <Info label="Days to Complete" value={daysToComplete} />

  <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
    <p className="text-sm border-zinc-800">Hardware</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
   
      <span>{game["Hardware (1)"] || "-"}</span>
    </div>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
    <p className="text-sm border-zinc-800">Store</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
     
      <span>{game.Store || "-"}</span>
    </div>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
    <p className="text-sm border-zinc-800">Platform</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
      
      <span>{game.Platform || "-"}</span>
    </div>
  </div>
</div>
        </section>
        {game.screenshots ? (
  <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6">
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
loading="lazy"
className="aspect-video w-full rounded-xl border border-zinc-800 object-cover"
          />
        ))}
    </div>
  </section>
) : null}
      </div>
      <div className="mx-auto max-w-[430px] px-4 pb-10 pt-3 lg:hidden">
  <div className="mb-3 flex items-center justify-between">
  <BackButton />
  <GamePageMobileMenu game={game} />
</div>

<div className="mb-3">
  <HomeGameSearch />
</div>

  <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
    {wideCoverImage ? (
  <img
    src={wideCoverImage}
    alt={game.Title}
    className="aspect-video w-full object-cover"
  />
) : heroImage ? (
  <img
  src={wideCoverImage || heroImage}
  alt=""
  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm"
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
{completedRank ? ` • ${completedRank}` : ""}
{scoreRank ? ` • Score ${scoreRank}` : ""}
      </span>
      {Number(game.Score || 0) > 0 && (
  <span
    className={`absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black ${
      Number(game.Score) >= 76
        ? "bg-emerald-400 text-black"
        : Number(game.Score) >= 60
          ? "bg-yellow-400 text-black"
          : "bg-red-400 text-black"
    }`}
  >
    {game.Score}
  </span>
)}

{Number(game["Hours Played"] || 0) > 0 && (
  <span className="absolute right-3 top-[calc(56.25vw-50px)] rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
    {formatHours(game["Hours Played"])}h
  </span>
)}

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

{getIcon(game.Platform) && (
            <span className="rounded-md bg-zinc-800 px-2 py-1">
            <img
              src={getIcon(game.Platform)!}
              alt=""
              className="h-4 w-4 object-contain"
            />
          </span>
        )}

        {getIcon(game["Hardware (1)"]) && (
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            <img
              src={getIcon(game["Hardware (1)"])!}
              alt=""
              className="h-4 w-4 object-contain"
            />
          </span>
        )}
      </div>
    </div>
  </div>

  <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
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
    <span className="text-zinc-400">Price</span>
    <span>{game.Price && !isNaN(Number(game.Price)) ? `${game.Price} SAR` : game.Price || "-"}</span>
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
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
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
  value?: string | number | null;
  rank?: string;
}) {
  const score =
    label === "Score" ? Number(value || 0) : null;

  const scoreClass =
    score === null
      ? ""
      : score >= 76
        ? "bg-emerald-400 text-black"
        : score >= 60
          ? "bg-yellow-400 text-black"
          : "bg-red-400 text-black";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
      
            {label === "Score" ? (
<span
className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-lg font-black ${scoreClass}`}

>
{value}
  </span>
) : label === "Playtime" ? (
  <p className="text-2xl font-bold text-cyan-300">
    {value}
  </p>
) : (
  <p className="text-2xl font-bold">
    {value}
  </p>
)}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
      <p className="text-sm border-zinc-800">{label}</p>
      <p className="mt-1 font-semibold">{value || "-"}</p>
    </div>
  );
}
