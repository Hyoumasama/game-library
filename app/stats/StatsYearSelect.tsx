"use client";

import { useRouter } from "next/navigation";

export default function StatsYearSelect({
  years,
  selectedYear,
}: {
  years: number[];
  selectedYear: number;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedYear}
      onChange={(event) => router.push(`/stats?year=${event.target.value}`)}
      className="rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-white outline-none hover:border-zinc-500"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}