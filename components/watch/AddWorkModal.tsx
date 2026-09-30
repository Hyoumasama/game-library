"use client";

import EpisodeRangesEditor, {
  allRegularSeasons,
  hasRangeErrors,
  type EpisodeEditorSeason,
  type EpisodeRanges,
} from "@/components/watch/EpisodeRangesEditor";
import SourcesPicker from "@/components/watch/SourcesPicker";
import type { TmdbSearchResult } from "@/lib/server/watch/tmdb";
import { watchStatusOptions } from "@/lib/watchFilters";
import { HARD_DISK } from "@/lib/watchSources";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type TmdbType = "tv" | "movie";

const inputClass = "mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-normal";

// Admin "+ Add Work" button and modal for the watch section, the counterpart
// of AddGameModal: search TMDB, pick a result, set format, status, source, owned and watched
// episodes, then save.
export default function AddWorkModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TmdbType>("tv");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null);
  const [seasons, setSeasons] = useState<EpisodeEditorSeason[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [format, setFormat] = useState("series");
  const [status, setStatus] = useState("Plan to Watch");
  const [owned, setOwned] = useState<EpisodeRanges>({});
  const [watched, setWatched] = useState<EpisodeRanges>({});
  const [sources, setSources] = useState<string[]>([]);
  const onDisk = sources.includes(HARD_DISK);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [existingId, setExistingId] = useState<number | null>(null);

  function reset() {
    setType("tv");
    setQuery("");
    setResults([]);
    setSelected(null);
    setSeasons([]);
    setFormat("series");
    setStatus("Plan to Watch");
    setOwned({});
    setSources([]);
    setWatched({});
    setMessage("");
    setExistingId(null);
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function search() {
    if (query.trim().length < 2) return;

    setIsSearching(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ q: query.trim(), type });
      const response = await fetch(`/api/admin/watch/search?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Search failed");

      setResults(data.results || []);
      if (!data.results?.length) setMessage("No results.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsSearching(false);
    }
  }

  async function select(result: TmdbSearchResult) {
    setSelected(result);
    setResults([]);
    setMessage("");
    setExistingId(null);
    setFormat(result.type === "movie" ? "movie" : "series");
    setSeasons([]);
    setOwned({});
    setWatched({});
    // Most works come from the hard disk; turn it off for streaming-only ones.
    setSources([HARD_DISK]);

    if (result.type !== "tv") return;

    setIsLoadingSeasons(true);

    try {
      const response = await fetch(`/api/admin/watch/seasons?tmdbId=${result.id}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not load seasons");

      const outline: EpisodeEditorSeason[] = (data.seasons || []).map(
        (season: { seasonNumber: number; title: string | null; episodeCount: number }) => ({
          seasonNumber: season.seasonNumber,
          title: season.title,
          episodeNumbers: Array.from({ length: season.episodeCount }, (_, index) => index + 1),
        })
      );

      setSeasons(outline);
      // Regular seasons default to fully owned; specials default to none.
      setOwned(allRegularSeasons(outline));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoadingSeasons(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) return;

    setIsSaving(true);
    setMessage("");
    setExistingId(null);

    try {
      const response = await fetch("/api/admin/watch/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          tmdbType: selected.type,
          format,
          watchStatus: status,
          watched,
          owned: onDisk ? owned : {},
          sources,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to add work");
        if (data.mediaId) setExistingId(data.mediaId);
        return;
      }

      // Like Add Game: stay on the current page and refresh its lists.
      close();
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black"
      >
        + Add Work
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            className="h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 text-left text-white sm:w-[calc(100vw-24px)] sm:rounded-3xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Work</h2>
              <button type="button" onClick={close} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as TmdbType);
                    setResults([]);
                  }}
                  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
                >
                  <option value="tv">Series</option>
                  <option value="movie">Movie</option>
                </select>

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      search();
                    }
                  }}
                  placeholder="Search TMDB by title"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
                />

                <button
                  type="button"
                  onClick={search}
                  disabled={isSearching}
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-60"
                >
                  {isSearching ? "..." : "Search"}
                </button>
              </div>

              {results.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => select(result)}
                      className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-black p-3 text-left transition hover:border-zinc-500"
                    >
                      {result.posterUrl ? (
                        <img
                          src={result.posterUrl}
                          alt={result.title}
                          className="h-24 w-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-500">
                          No image
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-bold">{result.title}</p>
                        <p className="text-sm text-zinc-400">
                          {result.year || "Unknown year"} · TMDB ID: {result.id}
                          {result.originalTitle && result.originalTitle !== result.title
                            ? ` · ${result.originalTitle}`
                            : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                          {result.overview || "No summary"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-3 md:col-span-2">
                  {selected.posterUrl && (
                    <img
                      src={selected.posterUrl}
                      alt=""
                      className="h-20 w-14 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">{selected.title}</p>
                    <p className="text-sm text-zinc-400">
                      {selected.year || "Unknown year"} · TMDB {selected.type} {selected.id}
                    </p>
                  </div>
                </div>

                <label className="text-sm font-bold text-zinc-300">
                  Format
                  <select
                    value={format}
                    onChange={(event) => setFormat(event.target.value)}
                    className={inputClass}
                  >
                    {selected.type === "tv" ? (
                      <option value="series">Series</option>
                    ) : (
                      <option value="movie">Movie</option>
                    )}
                    <option value="ova">OVA</option>
                  </select>
                </label>

                <label className="text-sm font-bold text-zinc-300">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={inputClass}
                  >
                    {watchStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <SourcesPicker value={sources} onChange={setSources} />

                {isLoadingSeasons ? (
                  <p className="text-sm text-zinc-500 md:col-span-2">Loading seasons...</p>
                ) : (
                  <>
                    <EpisodeRangesEditor
                      title="Episodes Watched"
                      description="What you have already seen, on any source."
                      seasons={seasons}
                      value={watched}
                      onChange={setWatched}
                    />

                    {onDisk && (
                      <EpisodeRangesEditor
                        title="Episodes on Hard Disk"
                        description="The episode files you keep."
                        seasons={seasons}
                        value={owned}
                        onChange={setOwned}
                      />
                    )}
                  </>
                )}

                {message && (
                  <p className="text-sm font-bold text-red-400 md:col-span-2">
                    {message}
                    {existingId && (
                      <>
                        {" "}
                        <Link
                          href={`/watch/${existingId}`}
                          onClick={close}
                          className="text-cyan-300 underline"
                        >
                          Open it
                        </Link>
                      </>
                    )}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    isLoadingSeasons ||
                    hasRangeErrors(seasons, watched) ||
                    (onDisk && hasRangeErrors(seasons, owned))
                  }
                  className="rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-60 md:col-span-2"
                >
                  {isSaving ? "Adding..." : "Add Work"}
                </button>
              </form>
            )}

            {!selected && message && (
              <p className="text-sm font-bold text-zinc-400">{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
