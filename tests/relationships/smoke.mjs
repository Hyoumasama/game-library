import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createAdminSessionValue } from "../../lib/adminAuth.ts";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.RELATIONSHIP_TEST_URL || "http://localhost:3001";
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const a = randomUUID(),
  b = randomUUID();
const canonicalIds = [a, b];
const taxonomyIds = { series: [], franchises: [] };
const session = await createAdminSessionValue();
assert.ok(session, "Admin secret required for authenticated smoke tests");
async function request(path, body, method = "GET", admin = true) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(admin ? { Cookie: `admin_auth=${session}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
async function db(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
try {
  await db(
    await client.from("canonical_games").insert([
      {
        id: a,
        title: "Relationship smoke original",
        normalized_title: "relationship smoke original",
      },
      {
        id: b,
        title: "Relationship smoke derived",
        normalized_title: "relationship smoke derived",
      },
    ]),
  );
  assert.equal(
    (await request("/api/admin/relationships", null, "GET", false)).status,
    401,
  );
  const search = await request(
    "/api/admin/relationships?mode=search&q=relationship%20smoke",
  );
  assert.equal(search.status, 200);
  assert.ok(search.data.games.some((g) => g.id === a));
  const queue = await request("/api/admin/relationships");
  assert.equal(queue.status, 200);
  assert.ok(Array.isArray(queue.data.reviews));
  const taxonomy = await request("/api/admin/relationships?mode=taxonomy");
  assert.equal(taxonomy.status, 200);
  const unique = randomUUID();
  const canonicalTitle = `Relationship smoke created ${unique}`;
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { action: "canonical", title: canonicalTitle },
        "POST",
      )
    ).status,
    200,
  );
  const created = await db(
    await client
      .from("canonical_games")
      .select("id")
      .eq("title", canonicalTitle)
      .single(),
  );
  canonicalIds.push(created.id);
  const franchiseName = `Smoke franchise ${unique}`,
    seriesName = `Smoke series ${unique}`;
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { action: "taxonomy", kind: "franchise", name: franchiseName },
        "POST",
      )
    ).status,
    200,
  );
  const franchise = await db(
    await client
      .from("game_franchises")
      .select("id")
      .eq("name", franchiseName)
      .single(),
  );
  taxonomyIds.franchises.push(franchise.id);
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { action: "taxonomy", kind: "series", name: seriesName },
        "POST",
      )
    ).status,
    200,
  );
  const series = await db(
    await client
      .from("game_series")
      .select("id")
      .eq("name", seriesName)
      .single(),
  );
  taxonomyIds.series.push(series.id);
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        {
          action: "taxonomy",
          kind: "series",
          id: series.id,
          franchise_id: franchise.id,
        },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        {
          action: "membership",
          kind: "series",
          canonical_game_id: a,
          entity_id: series.id,
          sort_order: 1,
        },
        "POST",
      )
    ).status,
    200,
  );
  const grouped = await request(
    `/api/game-relationships?canonical=${a}`,
    null,
    "GET",
    false,
  );
  assert.equal(grouped.data.detail.series[0].id, series.id);
  assert.equal(grouped.data.detail.franchises[0].id, franchise.id);
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        {
          action: "membership",
          kind: "series",
          canonical_game_id: a,
          entity_id: series.id,
        },
        "DELETE",
      )
    ).status,
    200,
  );
  const edge = {
    action: "relationship",
    source_game_id: b,
    target_game_id: a,
    relation_type: "sequel_of",
    confidence: 1,
    source: "smoke_test",
  };
  assert.equal(
    (await request("/api/admin/relationships", edge, "POST")).status,
    200,
  );
  assert.equal(
    (await request("/api/admin/relationships", edge, "POST")).status,
    409,
  );
  const detail = await request(
    `/api/game-relationships?canonical=${a}`,
    null,
    "GET",
    false,
  );
  assert.equal(detail.status, 200);
  assert.equal(detail.data.detail.relationships[0].other.id, b);
  const rid = detail.data.detail.relationships[0].id;
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { ...edge, id: rid, relation_type: "remaster_of" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/admin/relationships", { id: rid }, "DELETE")).status,
    200,
  );
  const reviewid = randomUUID();
  await db(
    await client.from("game_relationship_reviews").insert({
      id: reviewid,
      candidate_key: reviewid,
      kind: "relationship",
      source_game_id: b,
      target_game_id: a,
      proposed_relation: "expansion_of",
      confidence: 0.8,
      reason: "Smoke test ambiguity",
    }),
  );
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { action: "review", id: reviewid, approve: true },
        "POST",
      )
    ).status,
    200,
  );
  const final = await request(
    `/api/game-relationships?canonical=${a}`,
    null,
    "GET",
    false,
  );
  assert.equal(
    final.data.detail.relationships[0].relation_type,
    "expansion_of",
  );
  assert.equal(
    (
      await request(
        "/api/admin/relationships",
        { ...edge, target_game_id: b },
        "POST",
      )
    ).status,
    400,
  );
  console.log(
    "PASS: public details, admin access, canonical search, review queue, taxonomy, relationship create/edit/delete/uniqueness, inverse lookup, review approval, validation",
  );
} finally {
  await db(
    await client
      .from("game_relationship_reviews")
      .delete()
      .in("source_game_id", [a, b]),
  );
  await db(
    await client
      .from("game_relationships")
      .delete()
      .in("source_game_id", [a, b]),
  );
  await db(
    await client.from("canonical_games").delete().in("id", canonicalIds),
  );
  if (taxonomyIds.series.length)
    await db(
      await client.from("game_series").delete().in("id", taxonomyIds.series),
    );
  if (taxonomyIds.franchises.length)
    await db(
      await client
        .from("game_franchises")
        .delete()
        .in("id", taxonomyIds.franchises),
    );
}
