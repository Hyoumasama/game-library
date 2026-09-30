"use client";

import EpisodeRangesEditor, {
  allRegularSeasons,
  hasAnyEpisodes,
  hasRangeErrors,
  type EpisodeEditorSeason,
  type EpisodeRanges,
} from "@/components/watch/EpisodeRangesEditor";
import SourcesPicker from "@/components/watch/SourcesPicker";
import { HARD_DISK } from "@/lib/watchSources";
import type { WatchEpisode, WatchMediaDetails } from "@/lib/server/watch/library";
import { formatEpisodeRanges } from "@/lib/watchEpisodeRanges";
import { watchStatusOptions } from "@/lib/watchFilters";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

const inputClass = "mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-normal";

function initialForm(details: WatchMediaDetails, status: string) {
  const { entry } = details;

  return {
    watch_status: status,
    // Stored 0-10, edited out of 100 like game scores.
    my_score: entry.my_score == null ? "" : String(Math.round(entry.my_score * 10)),
    date_started: entry.date_started || "",
    completion_last_watched: entry.completion_last_watched || "",
    rewatch_count: String(entry.rewatch_count || 0),
    notes: entry.notes || "",
  };
}

function rangesFor(details: WatchMediaDetails, flag: (episode: WatchEpisode) => boolean) {
  return Object.fromEntries(
    details.seasons.map((season) => [
      season.season_number,
      formatEpisodeRanges(
        season.episodes.filter(flag).map((episode) => episode.episode_number),
        season.episodes.map((episode) => episode.episode_number)
      ),
    ])
  ) as EpisodeRanges;
}

// Admin "Edit" button and modal on a watch work's page, the counterpart of
// EditGameModal: library entry fields, source, watched and owned episodes,
// and delete.
// currentStatus / watchedIds are the work page's live state, which can be
// ahead of `details` after the ✓ buttons, so the form opens with them.
export default function EditWorkModal({
  details,
  currentStatus,
  watchedIds,
}: {
  details: WatchMediaDetails;
  currentStatus: string;
  watchedIds: Set<number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(details, currentStatus));
  const seasons: EpisodeEditorSeason[] = useMemo(
    () =>
      details.seasons.map((season) => ({
        seasonNumber: season.season_number,
        title: season.title,
        episodeNumbers: season.episodes.map((episode) => episode.episode_number),
      })),
    [details.seasons]
  );
  const initialOwned = useMemo(() => rangesFor(details, (episode) => episode.owned), [details]);
  const initialWatched = useMemo(
    () => rangesFor(details, (episode) => watchedIds.has(episode.id)),
    [details, watchedIds]
  );
  const [owned, setOwned] = useState<EpisodeRanges>(initialOwned);
  const [watched, setWatched] = useState<EpisodeRanges>(initialWatched);
  const [sources, setSources] = useState(details.entry.watch_sources);
  const onDisk = sources.includes(HARD_DISK);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  function openModal() {
    setForm(initialForm(details, currentStatus));
    setOwned(initialOwned);
    setWatched(initialWatched);
    setSources(details.entry.watch_sources);
    setMessage("");
    setOpen(true);
  }

  function changeSources(next: string[]) {
    // Turning Hard Disk on for a series with nothing recorded yet starts
    // from every regular season owned.
    if (next.includes(HARD_DISK) && !onDisk && !hasAnyEpisodes(seasons, owned)) {
      setOwned(allRegularSeasons(seasons));
    }

    setSources(next);
  }

  function setField(field: keyof ReturnType<typeof initialForm>, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/watch/works/${details.media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          my_score: form.my_score === "" ? "" : Number(form.my_score) / 10,
          watch_sources: sources,
          ...(seasons.length ? { owned: onDisk ? owned : {}, watched } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to save");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${details.media.title}" from the watch library?`)) return;

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/watch/works/${details.media.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to delete");
        return;
      }

      setOpen(false);
      router.push("/watch/all-works");
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded border border-zinc-600 bg-black/50 px-3 py-1 text-xs font-black text-white hover:border-cyan-300"
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 text-left text-white sm:w-[calc(100vw-24px)] sm:rounded-3xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-2xl font-bold">Edit {details.media.title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-zinc-300">
                Status
                <select
                  value={form.watch_status}
                  onChange={(event) => setField("watch_status", event.target.value)}
                  className={inputClass}
                >
                  {watchStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold text-zinc-300">
                My Score (0-100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.my_score}
                  onChange={(event) => setField("my_score", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-bold text-zinc-300">
                Date Started
                <input
                  type="date"
                  value={form.date_started}
                  onChange={(event) => setField("date_started", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-bold text-zinc-300">
                Last Watched / Completed
                <input
                  type="date"
                  value={form.completion_last_watched}
                  onChange={(event) => setField("completion_last_watched", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-bold text-zinc-300 md:col-span-2">
                Rewatch Count
                <input
                  type="number"
                  min={0}
                  value={form.rewatch_count}
                  onChange={(event) => setField("rewatch_count", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-bold text-zinc-300 md:col-span-2">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </label>

              <SourcesPicker value={sources} onChange={changeSources} />

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

              {message && (
                <p className="text-sm font-bold text-red-400 md:col-span-2">{message}</p>
              )}

              <button
                type="submit"
                disabled={
                  isSaving ||
                  isDeleting ||
                  hasRangeErrors(seasons, watched) ||
                  (onDisk && hasRangeErrors(seasons, owned))
                }
                className="rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-60 md:col-span-2"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={remove}
                disabled={isSaving || isDeleting}
                className="rounded-xl border border-red-500/50 px-4 py-3 font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-60 md:col-span-2"
              >
                {isDeleting ? "Deleting..." : "Delete Work"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
