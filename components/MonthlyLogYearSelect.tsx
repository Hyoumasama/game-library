"use client";

type MonthlyLogYearSelectProps = {
  years: number[];
  selectedYear: number;
};

export default function MonthlyLogYearSelect({
  years,
  selectedYear,
}: MonthlyLogYearSelectProps) {
  return (
    <select
      defaultValue={selectedYear}
      onChange={(event) => {
        window.location.href = `/monthly-log?year=${event.target.value}`;
      }}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-black text-white outline-none sm:w-auto"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}