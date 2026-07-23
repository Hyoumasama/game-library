"use client";

export default function BackButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      aria-label="Go back"
      className={`flex h-[52px] shrink-0 items-center justify-center text-sm font-bold text-zinc-300 transition hover:text-white ${
        compact ? "w-8 text-xl" : "px-1"
      }`}
    >
      {compact ? "←" : "← Back"}
    </button>
  );
}
