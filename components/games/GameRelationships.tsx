"use client";
import { relationshipRequest } from "@/lib/relationships/client";
import Link from "next/link";
import GameRelationshipSections from "./GameRelationshipSections";
import { useCallback, useEffect, useState } from "react";
import {
  labels,
  relationTypes,
  relationshipLabel,
  type CanonicalGame,
  type Relationship,
  type RelationshipDetail,
  type Series,
  type Franchise,
} from "@/lib/relationships/model";
const input =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none";
const button =
  "rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold hover:border-cyan-300 disabled:opacity-40";
export function CanonicalPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [games, setGames] = useState<Pick<CanonicalGame, "id" | "title">[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/relationships?mode=search&q=${encodeURIComponent(query)}&selected=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGames(data.games);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, value]);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold">
        {label}
        <input
          className={`${input} mt-2`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search from the start of the title"
        />
      </label>
      <select
        aria-label={`Choose ${label}`}
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a canonical game</option>
        {value && !games.some((g) => g.id === value) && (
          <option value={value}>Selected identity / {value.slice(0, 8)}</option>
        )}
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
      {loading && <p className="text-xs text-zinc-400">Searching...</p>}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !games.length && !error && (
        <p className="text-xs text-zinc-400">No matching identities.</p>
      )}
    </div>
  );
}
function RelationForm({
  currentId,
  editing,
  onDone,
  onCancel,
}: {
  currentId: string;
  editing?: Relationship;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState(editing?.source_game_id || currentId),
    [target, setTarget] = useState(editing?.target_game_id || ""),
    [type, setType] = useState(editing?.relation_type || "sequel_of"),
    [confidence, setConfidence] = useState(editing?.confidence ?? 1),
    [provenance, setProvenance] = useState(editing?.source || "manual"),
    [notes, setNotes] = useState(editing?.notes || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await relationshipRequest(
        {
          action: "relationship",
          id: editing?.id,
          source_game_id: source,
          target_game_id: target,
          relation_type: type,
          confidence,
          source: provenance,
          notes,
        },
        editing ? "PATCH" : "POST",
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-xl border border-cyan-300/30 bg-zinc-900/60 p-4"
    >
      <h3 className="font-bold">
        {editing ? "Edit relationship" : "Add relationship"}
      </h3>
      <p className="text-sm text-zinc-400">
        Source is the derived game; target is the original. A collection is the
        source of Contains.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <CanonicalPicker
          label="Source game"
          value={source}
          onChange={setSource}
        />
        <CanonicalPicker
          label="Target game"
          value={target}
          onChange={setTarget}
        />
        <label className="text-sm">
          Relationship
          <select
            className={`${input} mt-2`}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            {relationTypes.map((t) => (
              <option key={t} value={t}>
                {labels[t][0]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Confidence (0-1)
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            required
            className={`${input} mt-2`}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
          />
        </label>
      </div>
      <label className="block text-sm">
        Source / evidence
        <input
          required
          maxLength={100}
          className={`${input} mt-2`}
          value={provenance}
          onChange={(e) => setProvenance(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Notes
        <textarea
          maxLength={2000}
          className={`${input} mt-2`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          className={`${button} bg-cyan-300 text-black`}
          disabled={busy || !source || !target}
        >
          {busy ? "Saving..." : "Save relationship"}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
function MembershipEditor({
  detail,
  onDone,
}: {
  detail: RelationshipDetail;
  onDone: () => void;
}) {
  const [series, setSeries] = useState<Series[]>([]),
    [franchises, setFranchises] = useState<Franchise[]>([]),
    [kind, setKind] = useState("series"),
    [entity, setEntity] = useState(""),
    [order, setOrder] = useState(""),
    [name, setName] = useState(""),
    [parent, setParent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/relationships?mode=taxonomy", {
        signal,
      });
      const d = await res.json();
      if (signal?.aborted) return;
      if (!res.ok) throw new Error(d.error);
      setSeries(d.series);
      setFranchises(d.franchises);
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : "Could not load series");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function act(body: Record<string, unknown>, method = "POST") {
    setBusy(true);
    setError("");
    try {
      await relationshipRequest(body, method);
      await load();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save membership");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-zinc-800 p-4">
      <summary className="cursor-pointer font-bold">
        Manage series & franchises
      </summary>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            ...detail.series.map((s) => ({ ...s, kind: "series" })),
            ...detail.franchises.map((f) => ({ ...f, kind: "franchise" })),
          ].map((e) => (
            <button
              key={`${e.kind}:${e.id}`}
              className={button}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Remove direct ${e.kind} membership for ${e.name}? Franchise membership inherited through a series will remain.`,
                  )
                )
                  void act(
                    {
                      action: "membership",
                      kind: e.kind,
                      canonical_game_id: detail.canonical.id,
                      entity_id: e.id,
                    },
                    "DELETE",
                  );
              }}
            >
              Remove {e.name}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            aria-label="Membership type"
            className={input}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setEntity("");
            }}
          >
            <option value="series">Series</option>
            <option value="franchise">Franchise</option>
          </select>
          <select
            aria-label="Series or franchise"
            className={input}
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            <option value="">Choose membership</option>
            {(kind === "series" ? series : franchises).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            aria-label="Series sort order"
            placeholder="Series sort order (optional)"
            className={input}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        <button
          className={button}
          disabled={busy || !entity}
          onClick={() =>
            void act({
              action: "membership",
              kind,
              entity_id: entity,
              canonical_game_id: detail.canonical.id,
              sort_order: order === "" ? null : Number(order),
            })
          }
        >
          Add membership
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="New series or franchise name"
            className={input}
            placeholder={`New ${kind} name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {kind === "series" && (
            <select
              aria-label="Parent franchise"
              className={input}
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            >
              <option value="">No parent franchise</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          className={button}
          disabled={busy || !name.trim()}
          onClick={() =>
            void act({
              action: "taxonomy",
              kind,
              name,
              franchise_id: parent || null,
            })
          }
        >
          Create {kind}
        </button>
        {kind === "series" && entity && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              void act(
                {
                  action: "taxonomy",
                  kind: "series",
                  id: entity,
                  franchise_id: parent || null,
                },
                "PATCH",
              )
            }
          >
            Set parent franchise for selected series
          </button>
        )}
        {busy && <p role="status">Saving...</p>}
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
export default function GameRelationships({
  gameId,
  canonicalId,
  initialDetail,
  initialError = "",
}: {
  gameId?: number;
  canonicalId?: string;
  initialDetail?: RelationshipDetail | null;
  initialError?: string;
}) {
  const [detail, setDetail] = useState<RelationshipDetail | null>(
      initialDetail || null,
    ),
    [loading, setLoading] = useState(
      initialDetail === undefined && !initialError,
    ),
    [error, setError] = useState(initialError),
    [isAdmin, setAdmin] = useState(false),
    [form, setForm] = useState<Relationship | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [linkTarget, setLinkTarget] = useState(""),
    [title, setTitle] = useState(initialDetail?.canonical.title || "");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(
          `/api/game-relationships?${canonicalId ? `canonical=${canonicalId}` : `game=${gameId}`}`,
          { signal },
        );
        const data = await res.json();
        if (signal?.aborted) return;
        if (!res.ok) throw new Error(data.error);
        setDetail(data.detail);
        setTitle(data.detail?.canonical.title || "");
        setError("");
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load relationships",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [gameId, canonicalId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (
        !controller.signal.aborted &&
        initialDetail === undefined &&
        !initialError
      )
        return load(controller.signal);
    });
    fetch("/api/admin/me", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!controller.signal.aborted) setAdmin(!!d.isAdmin);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAdmin(false);
      });
    return () => controller.abort();
  }, [load, initialDetail, initialError]);
  async function mutate(body: Record<string, unknown>, method = "POST") {
    setBusy(true);
    setError("");
    try {
      await relationshipRequest(body, method);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  if (
    !loading &&
    !error &&
    !isAdmin &&
    (!detail ||
      !(
        detail.copies.length ||
        detail.series.length ||
        detail.franchises.length ||
        detail.relationships.length
      ))
  )
    return null;
  return (
    <section
      className="relative mx-auto my-8 max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 text-white sm:p-8"
      aria-labelledby="relationships-heading"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Explore this game
          </p>
          <h2 id="relationships-heading" className="mt-2 text-2xl font-bold">
            {canonicalId && detail
              ? detail.canonical.title
              : "Game relationships"}
          </h2>
        </div>
        {isAdmin && (
          <Link className={button} href="/admin/relationships">
            Review queue
          </Link>
        )}
      </div>
      {loading ? (
        <p role="status" className="animate-pulse text-zinc-400">
          Loading identity and related games...
        </p>
      ) : error ? (
        <div role="alert">
          <p className="text-red-300">{error}</p>
          <button className={`${button} mt-3`} onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : !detail ? (
        <p className="text-zinc-400">
          {canonicalId
            ? "Canonical identity not found."
            : "This copy has no canonical identity yet. An administrator can link it below."}
        </p>
      ) : (
        <div className="space-y-6">
          <GameRelationshipSections detail={detail} />
          {isAdmin && (
            <details className="rounded-xl border border-zinc-800 p-4">
              <summary className="cursor-pointer font-bold">
                Manage relationships
              </summary>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Related games</h3>
                  {isAdmin && (
                    <button className={button} onClick={() => setForm("new")}>
                      Add relationship
                    </button>
                  )}
                </div>
                {!detail.relationships.length && (
                  <p className="text-sm text-zinc-400">
                    No verified relationships yet.
                  </p>
                )}
                <ul className="space-y-3">
                  {detail.relationships.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-4"
                    >
                      <div>
                        <Link
                          href={`/canonical/${r.other.id}`}
                          className="font-bold hover:text-cyan-200"
                        >
                          <span className="mr-2 text-zinc-400">
                            {relationshipLabel(r, detail.canonical.id)}:
                          </span>
                          {r.other.title}
                        </Link>
                        {isAdmin && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Confidence {Number(r.confidence).toFixed(2)} /{" "}
                            {r.source}
                            {r.notes ? ` / ${r.notes}` : ""}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            className={button}
                            onClick={() => setForm(r)}
                          >
                            Edit
                          </button>
                          <button
                            disabled={busy}
                            className={`${button} text-red-300`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete this relationship with ${r.other.title}? Library copies will remain.`,
                                )
                              )
                                void mutate({ id: r.id }, "DELETE");
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
          {isAdmin && form && (
            <RelationForm
              key={form === "new" ? "new" : form.id}
              currentId={detail.canonical.id}
              editing={form === "new" ? undefined : form}
              onCancel={() => setForm(null)}
              onDone={() => {
                setForm(null);
                void load();
              }}
            />
          )}
          {isAdmin && (
            <MembershipEditor detail={detail} onDone={() => void load()} />
          )}
        </div>
      )}
      {isAdmin && (
        <details className="mt-6 rounded-xl border border-zinc-800 p-4">
          <summary className="cursor-pointer font-bold">
            Manage canonical identity
          </summary>
          <div className="mt-4 space-y-4">
            {detail && (
              <div className="flex flex-wrap gap-3">
                <input
                  aria-label="Canonical title"
                  className={`${input} sm:flex-1`}
                  maxLength={300}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button
                  disabled={busy || !title.trim()}
                  className={button}
                  onClick={() =>
                    void mutate(
                      { action: "canonical", id: detail.canonical.id, title },
                      "PATCH",
                    )
                  }
                >
                  Update title
                </button>
              </div>
            )}
            {gameId && (
              <>
                <CanonicalPicker
                  label="Canonical identity for this library copy"
                  value={linkTarget}
                  onChange={setLinkTarget}
                />
                <button
                  disabled={busy || !linkTarget}
                  className={button}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Change the canonical identity of this library copy?",
                      )
                    )
                      void mutate({
                        action: "link",
                        game_id: gameId,
                        canonical_game_id: linkTarget,
                      });
                  }}
                >
                  Link this copy
                </button>
              </>
            )}
          </div>
        </details>
      )}
      {busy && (
        <p role="status" className="mt-3 text-sm text-cyan-300">
          Saving...
        </p>
      )}
    </section>
  );
}
