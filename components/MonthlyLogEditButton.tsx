"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EditableLog = {
  log_id: number;
  title: string;
  hours: number;
  month: number;
  year: number;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const inputClass = "mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400";

export default function MonthlyLogEditButton({ log }: { log: EditableLog }) {
  const router = useRouter();
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [hours, setHours] = useState(String(log.hours));
  const [month, setMonth] = useState(String(log.month));
  const [year, setYear] = useState(String(log.year));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function open() {
    setHours(String(log.hours));
    setMonth(String(log.month));
    setYear(String(log.year));
    setError("");
    dialog.current?.showModal();
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/monthly-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_id: log.log_id, hours: Number(hours), month: Number(month), year: Number(year),
          expectedHours: Number(log.hours), expectedMonth: log.month, expectedYear: log.year,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to update monthly log");
        return;
      }
      dialog.current?.close();
      if (Number(year) !== log.year) {
        router.push(`/monthly-log?year=${Number(year)}`);
      }
      router.refresh();
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} aria-label={`Edit log for ${log.title}`}
        className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-400 transition hover:text-cyan-300 focus-visible:outline-cyan-400">
        Edit
      </button>
      <dialog ref={dialog} aria-labelledby={headingId}
        onCancel={(event) => { if (saving.current) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-left text-white shadow-2xl backdrop:bg-black/80">
        <form onSubmit={save}>
          <h2 id={headingId} className="text-xl font-black">Edit Monthly Log</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-400">{log.title}</p>
          <fieldset disabled={isSaving} className="mt-5 space-y-4 disabled:opacity-60">
            <label className="block text-sm font-bold text-zinc-400">
              Log Hours
              <input autoFocus required type="number" min="0.01" step="0.01" value={hours}
                onChange={(event) => setHours(event.target.value)} className={inputClass} />
            </label>
            <p className="text-xs font-semibold text-zinc-500">Enter hours for this log. The game’s total adjusts automatically.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold text-zinc-400">
                Month
                <select value={month} onChange={(event) => setMonth(event.target.value)} className={inputClass}>
                  {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-zinc-400">
                Year
                <input required type="number" min="2000" max="9999" step="1" value={year}
                  onChange={(event) => setYear(event.target.value)} className={inputClass} />
              </label>
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={isSaving} onClick={() => dialog.current?.close()}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:opacity-50">
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
