"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  labels,
  type Review,
  type CanonicalGame,
} from "@/lib/relationships/model";
import { relationshipRequest } from "@/lib/relationships/client";
type Item = Review & {
  source_game: Pick<CanonicalGame, "id" | "title" | "igdb_id" | "steam_appid">;
  target_game: Pick<CanonicalGame, "id" | "title" | "igdb_id" | "steam_appid">;
};
const button =
  "rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-cyan-300 disabled:opacity-40";
export default function RelationshipReviewClient() {
  const [items, setItems] = useState<Item[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(0),
    [status, setStatus] = useState("pending"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [name, setName] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/admin/relationships?status=${status}&page=${page}`,
          { signal },
        );
        const d = await r.json();
        if (signal?.aborted) return;
        if (!r.ok) throw new Error(d.error);
        setItems(d.reviews);
        setCount(d.count);
        setError("");
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load review queue",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [status, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function decide(item: Item, approve: boolean) {
    if (
      approve &&
      item.kind === "identity" &&
      !window.confirm(
        `Map all copies of ${item.source_game.title} to ${item.target_game.title}? Verify these are the same game, including the release and edition.`,
      )
    )
      return;
    setBusy(item.id);
    try {
      await relationshipRequest({ action: "review", id: item.id, approve });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(null);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    try {
      await relationshipRequest({ action: "canonical", title: name });
      setName("");
      setNotice(
        "Canonical identity created. Search for it when linking a copy or adding a relationship.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Relationship management
          </p>
          <h1 className="mt-2 text-3xl font-black">Review game connections</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Verify identity conflicts and inferred relationships before they
            appear in the library. Owned copies stay intact.
          </p>
        </div>
        <label className="text-sm">
          Review status
          <select
            className="ml-3 rounded-lg border border-zinc-700 bg-zinc-900 p-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-zinc-400">
        {count} {status} candidates / page {page + 1}
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 p-4 text-red-300"
        >
          {error}
          <button className={`${button} ml-3`} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="animate-pulse rounded-xl bg-zinc-900 p-8">
          Loading review candidates...
        </p>
      ) : !items.length ? (
        <div className="rounded-xl border border-zinc-800 p-8 text-zinc-400">
          No {status} candidates.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
                  {item.kind === "identity"
                    ? "Same identity?"
                    : item.proposed_relation
                      ? labels[item.proposed_relation][0]
                      : "Relationship"}
                </span>
                <span className="text-xs text-zinc-400">
                  Confidence {Number(item.confidence).toFixed(2)}
                </span>
              </div>
              <div className="my-4 grid gap-4 sm:grid-cols-2">
                {[item.source_game, item.target_game].map((g, i) => (
                  <div
                    key={`${i}:${g.id}`}
                    className="rounded-lg bg-zinc-900 p-4"
                  >
                    <p className="mb-2 text-xs text-zinc-500">
                      {i === 0 ? "Source" : "Target"}
                    </p>
                    <Link
                      className="font-bold text-cyan-100 hover:underline"
                      href={`/canonical/${g.id}`}
                    >
                      {g.title}
                    </Link>
                    <p className="mt-2 text-xs text-zinc-400">
                      IGDB {g.igdb_id || "Unknown"} / Steam{" "}
                      {g.steam_appid || "Unknown"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-zinc-300">{item.reason}</p>
              <details className="mt-3 text-xs text-zinc-400">
                <summary className="cursor-pointer">
                  Identifiers & evidence
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black p-3">
                  {JSON.stringify(item.identifiers, null, 2)}
                </pre>
              </details>
              {status === "pending" && (
                <div className="mt-4 flex gap-3">
                  <button
                    disabled={!!busy}
                    className={`${button} bg-cyan-300 text-black`}
                    onClick={() => void decide(item, true)}
                  >
                    {busy === item.id ? "Saving..." : "Approve"}
                  </button>
                  <button
                    disabled={!!busy}
                    className={`${button} text-red-300`}
                    onClick={() => void decide(item, false)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="flex justify-between">
        <button
          className={button}
          disabled={loading || !!busy || page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <button
          className={button}
          disabled={loading || !!busy || (page + 1) * 30 >= count}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <form onSubmit={create} className="rounded-xl border border-zinc-800 p-5">
        <label className="block font-bold">
          Create a canonical identity
          <input
            required
            maxLength={300}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-black p-3 text-sm"
            placeholder="Game title"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className={`${button} mt-3`} disabled={!!busy}>
          Create identity
        </button>
        {notice && (
          <p role="status" className="mt-3 text-sm text-cyan-200">
            {notice}
          </p>
        )}
      </form>
    </div>
  );
}
