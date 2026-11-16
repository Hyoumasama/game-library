import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("monthly log edits adjust only the hours difference and reject stale writes atomically", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table public.games (id bigint primary key, hours_played numeric, status text);
      create table public.monthly_play_logs (
        log_id bigint primary key, game_id bigint, title text, hours numeric,
        month integer, year integer, created_at timestamptz default now()
      );
      insert into games values (1, 80, 'Dropped'), (2, 50, 'Playing');
      insert into monthly_play_logs (log_id,game_id,title,hours,month,year)
        values (10,1,'First',10,12,2025), (11,1,'Other month',20,1,2026), (12,2,'Other game',5,1,2026);
    `);
    await db.exec(readFileSync(new URL("../../supabase/migrations/20261116210504_monthly_log_atomic_update.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../../supabase/migrations/20261116211125_monthly_log_conflict_status.sql", import.meta.url), "utf8"));
    const update = (hours, month, year, oldHours, oldMonth, oldYear, id = 10) => db.query(
      "select * from public.update_monthly_play_log($1,$2,$3,$4,$5,$6,$7)",
      [id, hours, month, year, oldHours, oldMonth, oldYear],
    );
    const total = async () => Number((await db.query("select hours_played from games where id=1")).rows[0].hours_played);
    const result = await update(7.5, 2, 2026, 10, 12, 2025);
    assert.equal(Number(result.rows[0].hours), 7.5);
    assert.equal(result.rows[0].year, 2026);
    assert.equal(result.rows[0].month, 2);
    assert.equal(result.rows[0].title, "First");
    assert.equal(await total(), 77.5);
    await update(12.5, 2, 2026, 7.5, 2, 2026);
    assert.equal(await total(), 82.5);
    await update(12.5, 3, 2024, 12.5, 2, 2026);
    assert.equal(await total(), 82.5, "moving months/years preserves total hours");
    await assert.rejects(update(99, 2, 2026, 10, 12, 2025), { code: "PT409" });
    assert.equal(await total(), 82.5);
    for (const [hours, month, year] of [[0,1,2026],[-1,1,2026],[1,13,2026],[1,1,1999],["NaN",1,2026],["Infinity",1,2026]]) {
      await assert.rejects(update(hours, month, year, 12.5, 3, 2024), { code: "22023" });
    }
    await assert.rejects(update(1, 1, 2026, 1, 1, 2026, 999), { code: "P0002" });
    await db.exec("insert into monthly_play_logs(log_id,game_id,hours,month,year) values(99,999,2,1,2026)");
    await assert.rejects(update(3, 1, 2026, 2, 1, 2026, 99), { code: "P0002" });
    assert.equal(Number((await db.query("select hours from monthly_play_logs where log_id=99")).rows[0].hours), 2, "failed game update rolls back the log update");
    assert.deepEqual((await db.query("select id,hours_played,status from games order by id")).rows,
      [{id:1,hours_played:"82.5",status:"Dropped"},{id:2,hours_played:"50",status:"Playing"}]);
    assert.equal(Number((await db.query("select hours from monthly_play_logs where log_id=11")).rows[0].hours), 20);
    const permissions = await db.query(`select
      has_function_privilege('anon', 'public.update_monthly_play_log(bigint,numeric,integer,integer,numeric,integer,integer)', 'EXECUTE') as anon,
      has_function_privilege('authenticated', 'public.update_monthly_play_log(bigint,numeric,integer,integer,numeric,integer,integer)', 'EXECUTE') as authenticated,
      has_function_privilege('service_role', 'public.update_monthly_play_log(bigint,numeric,integer,integer,numeric,integer,integer)', 'EXECUTE') as server`);
    assert.deepEqual(permissions.rows[0], { anon:false, authenticated:false, server:true });
  } finally {
    await db.close();
  }
});
