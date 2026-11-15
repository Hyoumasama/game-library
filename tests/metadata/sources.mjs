export const state = { games: [], hltb: null, metacritic: null, authenticated: true, calls: [], beforeWrite: null };
export async function cookies() { return { get: () => state.authenticated ? { value: state.cookie } : undefined }; }
export class HltbRateLimitError extends Error {}
export async function findHltbTimes() { state.calls.push("hltb-search"); if (state.hltb instanceof Error) throw state.hltb; return state.hltb; }
export async function getHltbTimesById() { state.calls.push("hltb-id"); if (state.hltb instanceof Error) throw state.hltb; return state.hltb; }
export async function findMetacriticScore() { state.calls.push("metacritic"); if (state.metacritic instanceof Error) throw state.metacritic; return state.metacritic; }
export const supabase = { from() {
  const filters = []; let patch; let start = 0; let end = Infinity; let single = false;
  const query = {
    select() { return query; }, order() { return query; },
    range(from, to) { start = from; end = to; return query; },
    eq(key, value) { filters.push(row => row[key] === value); return query; },
    is(key) { filters.push(row => row[key] == null); return query; },
    filter(key) { filters.push(row => Array.isArray(row[key]) && row[key].length === 0); return query; },
    update(value) { patch = value; return query; }, maybeSingle() { single = true; return query; },
    then(resolve, reject) { return Promise.resolve().then(() => {
      if (patch && state.beforeWrite) { state.beforeWrite(); state.beforeWrite = null; }
      const rows = state.games.filter(row => filters.every(filter => filter(row))).slice(start, end + 1);
      if (patch) for (const row of rows) Object.assign(row, patch);
      return { data: single ? structuredClone(rows[0] || null) : structuredClone(rows), error: null };
    }).then(resolve, reject); },
  }; return query;
} };
