// Test-only database. Never imports the live Supabase client or reads credentials.
export const tables = new Map();
export const calls = [];
let nextId = 100;
let failure = null;
export function reset() { tables.clear(); calls.length = 0; nextId = 100; failure = null; }
export function failNext(table, operation, message) { failure = { table, operation, message }; }
export async function getGameById(id) { return tables.get("games")?.find((g) => g.id === id) || null; }
export const supabase = {
  from(table) {
    let operation = "select", payload, single = false;
    const filters = [];
    const query = {
      select() { return query; },
      insert(value) { operation = "insert"; payload = value; return query; },
      update(value) { operation = "update"; payload = value; return query; },
      upsert(value) { operation = "upsert"; payload = value; return query; },
      delete() { operation = "delete"; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      single() { single = true; return query; },
      maybeSingle() { single = true; return query; },
      then(fulfilled, rejected) {
        return Promise.resolve().then(() => {
          calls.push({ table, operation, payload, filters });
          if (failure?.table === table && failure.operation === operation) {
            const error = { message: failure.message }; failure = null;
            return { data: null, error };
          }
          const rows = tables.get(table) || [];
          const matches = (row) => filters.every(([key, value]) => row[key] === value);
          let data = rows.filter(matches);
          if (operation === "insert") {
            data = [{ ...payload, id: nextId++ }]; rows.push(...data);
          } else if (operation === "upsert") {
            const existing = rows.find((row) => row.game_id === payload.game_id);
            if (existing) Object.assign(existing, payload); else rows.push({ ...payload });
            data = [payload];
          } else if (operation === "update") data.forEach((row) => Object.assign(row, payload));
          else if (operation === "delete") { tables.set(table, rows.filter((row) => !matches(row))); data = []; }
          if (operation !== "delete") tables.set(table, rows);
          return { data: single ? data[0] || null : data, error: null };
        }).then(fulfilled, rejected);
      },
    };
    return query;
  },
};
