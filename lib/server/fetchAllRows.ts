import "server-only";

export const SUPABASE_MAX_ROWS = 1000;

// Supabase caps an unpaginated select at 1000 rows and silently truncates
// anything past that (no error). The games library is well past 1000 rows,
// so any query that needs every matching row must page through with
// `.range()` - pass a callback that applies `.range(from, to)` to a query
// with a stable `.order(...)`.
export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const rows: T[] = [];
  for (let from = 0; ; from += SUPABASE_MAX_ROWS) {
    const { data, error } = await fetchPage(from, from + SUPABASE_MAX_ROWS - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < SUPABASE_MAX_ROWS) return { data: rows, error: null };
  }
}
