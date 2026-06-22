import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MonthlyLogAddModal from "@/components/MonthlyLogAddModal";
import MonthlyLogYearSelect from "@/components/MonthlyLogYearSelect";

const monthNames = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type MonthlyLogPageProps = {
  searchParams: Promise<{
    year?: string;
  }>;
};

export default async function MonthlyLogPage({
  searchParams,
}: MonthlyLogPageProps) {
  const params = await searchParams;

  const { data: yearsData, error: yearsError } = await supabase
    .from("monthly_play_logs")
    .select("year")
    .order("year", { ascending: false });

  if (yearsError) {
    throw yearsError;
  }

  const availableYears = Array.from(
    new Set((yearsData || []).map((item) => item.year))
  ).sort((a, b) => b - a);

  const selectedYear = Number(params.year || availableYears[0]);

  const { data: logs, error } = await supabase
    .from("monthly_play_logs")
    .select(
      "log_id, game_id, title, hours, month, year, created_at, games(steam_vertical_cover)"
    )
    .eq("year", selectedYear)
    .order("month", { ascending: false })
    .order("hours", { ascending: false });

  if (error) {
    throw error;
  }

  const logsByMonth = (logs || []).reduce<Record<number, typeof logs>>(
    (groups, log) => {
      if (!groups[log.month]) {
        groups[log.month] = [];
      }

      groups[log.month].push(log);
      return groups;
    },
    {}
  );

  const months = Object.keys(logsByMonth)
    .map(Number)
    .sort((a, b) => b - a);

  const selectedYearTotalHours = (logs || []).reduce(
    (total, log) => total + Number(log.hours || 0),
    0
  );

  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-block text-sm font-bold text-zinc-400 hover:text-white"
            >
              ← Back to Library
            </Link>

            <h1 className="text-4xl font-black">Monthly Log</h1>

            <p className="mt-2 text-zinc-400">
              {selectedYearTotalHours.toFixed(2)} hours tracked in{" "}
              {selectedYear}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

           <MonthlyLogYearSelect
  years={availableYears}
  selectedYear={selectedYear}
/>

            <MonthlyLogAddModal />
          </div>
        </div>

        {months.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-zinc-400">
            No logs found for {selectedYear}.
          </div>
        )}

        {months.map((month) => {
          const monthLogs = logsByMonth[month];
          const monthTotalHours = monthLogs.reduce(
            (total, log) => total + Number(log.hours || 0),
            0
          );

          return (
            <section key={month} className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    {monthNames[month] || month} {selectedYear}
                  </h2>

                  <p className="mt-1 text-sm font-bold text-zinc-500">
                    {monthTotalHours.toFixed(2)} hours
                  </p>
                </div>

                <p className="text-sm font-bold text-zinc-500">
                  {monthLogs.length} games
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 md:hidden">
                {monthLogs.map((log) => (
                  <Link
                    key={log.log_id}
                    href={`/game/${log.game_id}`}
                    className="block border-b border-zinc-900 px-4 py-3 last:border-b-0 active:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {log.games?.[0]?.steam_vertical_cover && (
                          <img
                            src={log.games[0].steam_vertical_cover}
                            alt={log.title}
                            className="h-14 w-10 shrink-0 rounded-md object-cover"
                          />
                        )}

                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {log.title}
                          </div>

                          <div className="mt-1 text-xs font-bold text-zinc-500">
                            {monthNames[log.month] || log.month} {log.year}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-black text-cyan-300">
                          {Number(log.hours).toFixed(2)}h
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 md:block">
                <div className="grid grid-cols-[1fr_120px_120px] border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-black text-zinc-300">
                  <div>Game</div>
                  <div>Hours</div>
                  <div>Month</div>
                </div>

                {monthLogs.map((log) => (
                  <div
                    key={log.log_id}
                    className="grid grid-cols-[1fr_120px_120px] border-b border-zinc-900 px-4 py-3 text-sm last:border-b-0"
                  >
                    <Link
                      href={`/game/${log.game_id}`}
                      className="flex min-w-0 items-center gap-3 font-bold text-white hover:text-cyan-300"
                    >
                      {log.games?.[0]?.steam_vertical_cover && (
                        <img
                          src={log.games[0].steam_vertical_cover}
                          alt={log.title}
                          className="h-12 w-9 shrink-0 rounded-md object-cover"
                        />
                      )}

                      <span className="truncate">{log.title}</span>
                    </Link>

                    <div className="text-cyan-300">
                      {Number(log.hours).toFixed(2)}
                    </div>

                    <div>{monthNames[log.month] || log.month}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}