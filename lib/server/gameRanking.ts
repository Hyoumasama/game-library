import { supabase } from "@/lib/supabase";

export async function getRankFromDatabase({
  column,
  currentValue,
  yearColumn,
  currentYear,
  status,
}: {
  column: "score" | "hours_played";
  currentValue: number;
  yearColumn: "release" | "completion_last_played";
  currentYear: string;
  status?: string;
}) {
  if (!currentValue || !currentYear) return undefined;

  const startDate = `${currentYear}-01-01`;
  const endDate = `${Number(currentYear) + 1}-01-01`;

  let query = supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .gte(yearColumn, startDate)
    .lt(yearColumn, endDate)
    .gt(column, currentValue);

  if (status) {
    query = query.eq("status", status);
  }

  const { count } = await query;

  return `Ranked #${(count || 0) + 1} (${currentYear})`;
}