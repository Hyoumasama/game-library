import Link from "next/link";
import { getGames } from "@/lib/games";
import StatsYearSelect from "./StatsYearSelect";

type Game = {
  id: number;
  title: string;
  release: string | null;
  date_of_purchase: string | null;
  completion_last_played: string | null;
  score: number | null;
  price: number | null;
  hours_played: number | null;
  status: string | null;
  store: string | null;
  platform: string | null;
  hardware: string | null;
  genre: string | null;
  cover_url: string | null;
  hero_url: string | null;
  wide_cover_url: string | null;
  steam_vertical_cover: string | null;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalize(game: any): Game {
  return {
    id: game.id,
    title: game.title || game.Title || "",
    release: game.release || game.Release || null,
    date_of_purchase: game.date_of_purchase || game["Date of Purchase"] || game["Date Added"] || null,
    completion_last_played: game.completion_last_played || game["Completion / Last Played"] || game["Date Completed"] || null,
    score: game.score ?? game.Score ?? game.Rating ?? null,
    price: game.price ?? game.Price ?? null,
    hours_played: game.hours_played ?? game["Hours Played"] ?? game["Time Played"] ?? null,
    status: game.status || game.Status || null,
    store: game.store || game.Store || null,
    platform: game.platform || game.Platform || null,
    hardware: game.hardware || game.Hardware || null,
    genre: game.genre || game.Genre || null,
    cover_url: game.cover_url || game.Cover || null,
    hero_url: game.hero_url || game.Hero || null,
    wide_cover_url: game.wide_cover_url || null,
    steam_vertical_cover: game.steam_vertical_cover || null,
  };
}

function getDate(game: Game) {
  return game.completion_last_played || game.date_of_purchase || game.release;
}

function getYear(game: Game) {
  const date = getDate(game);
  if (!date) return null;
  const match = String(date).match(/\b(19|20)\d{2}\b/);
  if (match) return Number(match[0]);
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function getMonth(game: Game) {
  const date = getDate(game);
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getMonth();
}

function poster(game: Game) {
  return game.steam_vertical_cover || game.cover_url || game.wide_cover_url || game.hero_url || "";
}

function wide(game: Game) {
  return game.wide_cover_url || game.hero_url || game.steam_vertical_cover || game.cover_url || "";
}

function countBy(games: Game[], key: keyof Game) {
  const map = new Map<string, number>();
  games.forEach((game) => {
    const value = String(game[key] || "Unknown").trim() || "Unknown";
    map.set(value, (map.get(value) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function BarList({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[2rem] border border-cyan-300/10 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/30">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-bold text-slate-200">{item.label}</span>
              <span className="text-cyan-300">{item.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const games = ((await getGames()) as any[]).map(normalize);

  const years = Array.from(new Set(games.map(getYear).filter(Boolean)))
    .sort((a, b) => Number(b) - Number(a)) as number[];

  const selectedYear = Number(params.year || years[0] || new Date().getFullYear());
  const yearGames = games.filter((game) => getYear(game) === selectedYear);

  const completed = yearGames.filter((g) => String(g.status).toLowerCase().includes("completed"));
  const playing = yearGames.filter((g) => String(g.status).toLowerCase().includes("playing"));
  const dropped = yearGames.filter((g) => String(g.status).toLowerCase().includes("dropped"));

  const totalHours = yearGames.reduce((sum, game) => sum + Number(game.hours_played || 0), 0);
  const totalSpent = yearGames.reduce((sum, game) => sum + Number(game.price || 0), 0);

  const mostPlayed = [...yearGames].sort((a, b) => Number(b.hours_played || 0) - Number(a.hours_played || 0));
  const topRated = [...yearGames].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const biggestPurchase = [...yearGames].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0];

  const gameOfYear = topRated[0];
  const hero = gameOfYear || mostPlayed[0] || yearGames[0];

  const monthly = months.map((month, index) => ({
    label: month,
    value: yearGames.filter((game) => getMonth(game) === index).length,
  }));

  const gallery = yearGames.filter((game) => poster(game)).slice(0, 18);

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.25),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.25),transparent_35%),linear-gradient(180deg,#06111f,#020617)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-black text-cyan-200 hover:text-white">
            ← Back
          </Link>
          <StatsYearSelect years={years.length ? years : [selectedYear]} selectedYear={selectedYear} />
        </div>

        <section className="relative mb-8 overflow-hidden rounded-[2.5rem] border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-cyan-950/40">
          {hero && wide(hero) && (
            <img src={wide(hero)} alt={hero.title} className="absolute inset-0 h-full w-full object-cover opacity-35 blur-[1px]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
          <div className="relative grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-10">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.45em] text-cyan-300">
                Nawaf Gaming Replay
              </p>
              <h1 className="text-6xl font-black leading-none tracking-tight md:text-8xl">
                {selectedYear}
                <span className="block bg-gradient-to-r from-cyan-200 via-blue-300 to-fuchsia-300 bg-clip-text text-transparent">
                  RECAP
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                Your gaming year in numbers, covers, rankings, stores, platforms and pure backlog chaos.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Games", yearGames.length],
                  ["Hours", Math.round(totalHours)],
                  ["Completed", completed.length],
                  ["Spent", `${Math.round(totalSpent)} SAR`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs font-black uppercase text-cyan-200">{label}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {gallery.slice(0, 9).map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl transition hover:-translate-y-1 hover:scale-105"
                >
                  <img src={poster(game)} alt={game.title} className="h-full w-full object-cover" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-3">
          {[
            ["🏆 Game of the Year", gameOfYear, gameOfYear?.score ? `Score ${gameOfYear.score}` : "Highest rated"],
            ["⏱ Most Played", mostPlayed[0], `${Math.round(Number(mostPlayed[0]?.hours_played || 0))} Hours`],
            ["💸 Biggest Purchase", biggestPurchase, `${Math.round(Number(biggestPurchase?.price || 0))} SAR`],
          ].map(([label, game, meta]: any) => (
            <div key={label} className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
              <div className="aspect-video bg-slate-900">
                {game && wide(game) && <img src={wide(game)} alt={game.title} className="h-full w-full object-cover" />}
              </div>
              <div className="p-5">
                <p className="text-sm font-black text-cyan-300">{label}</p>
                <h2 className="mt-2 truncate text-2xl font-black">{game?.title || "No Data"}</h2>
                <p className="mt-1 text-sm text-slate-400">{meta}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-cyan-300/10 bg-slate-950/80 p-5 shadow-2xl">
            <h2 className="mb-5 text-xl font-black">Monthly Activity</h2>
            <div className="flex h-64 items-end gap-2">
              {monthly.map((item) => {
                const max = Math.max(...monthly.map((m) => m.value), 1);
                return (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-cyan-400 to-fuchsia-400"
                      style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <BarList
            title="Status Breakdown"
            data={[
              { label: "Completed", value: completed.length },
              { label: "Playing", value: playing.length },
              { label: "Dropped", value: dropped.length },
            ]}
          />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <BarList title="Stores" data={countBy(yearGames, "store")} />
          <BarList title="Platforms" data={countBy(yearGames, "platform")} />
          <BarList title="Genres" data={countBy(yearGames, "genre")} />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <BarList
            title="Top Played"
            data={mostPlayed.slice(0, 6).map((game) => ({
              label: game.title,
              value: Math.round(Number(game.hours_played || 0)),
            }))}
          />

          <BarList
            title="Top Rated"
            data={topRated.slice(0, 6).map((game) => ({
              label: game.title,
              value: Math.round(Number(game.score || 0)),
            }))}
          />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-black">Year Gallery</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {gallery.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="group aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
              >
                <img
                  src={poster(game)}
                  alt={game.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}