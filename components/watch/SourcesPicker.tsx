"use client";

import {
  HARD_DISK,
  STREAMING_SOURCES,
  normalizeSources,
  streamingSources,
} from "@/lib/watchSources";
import { useState } from "react";

function chipClass(isActive: boolean) {
  return `rounded-lg border px-3 py-1.5 text-sm font-black transition ${
    isActive
      ? "border-cyan-300 bg-cyan-300 text-black"
      : "border-zinc-700 bg-black text-zinc-300 hover:border-zinc-500 hover:text-white"
  }`;
}

// Where the work is watched from: Hard Disk and/or streaming services. The
// forms show the "Episodes on Hard Disk" editor only while Hard Disk is on.
export default function SourcesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const streaming = streamingSources(value);
  const options = [
    HARD_DISK,
    ...STREAMING_SOURCES,
    ...streaming.filter((source) => !STREAMING_SOURCES.includes(source)),
  ];

  function toggle(source: string) {
    onChange(
      value.includes(source)
        ? value.filter((entry) => entry !== source)
        : normalizeSources([...value, source])
    );
  }

  function addCustom() {
    if (!custom.trim()) return;

    onChange(normalizeSources([...value, custom]));
    setCustom("");
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2">
      <p className="text-sm font-bold text-zinc-300">Source</p>
      <p className="mt-1 text-xs text-zinc-500">
        Where you watch it. Turn off Hard Disk for works you only stream.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((source) => {
          const isActive = value.includes(source);

          return (
            <button
              key={source}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggle(source)}
              className={chipClass(isActive)}
            >
              {isActive && "✓ "}
              {source}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other service..."
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-200 hover:border-zinc-500"
        >
          Add
        </button>
      </div>
    </div>
  );
}
