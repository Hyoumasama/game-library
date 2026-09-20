import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { RelatedEntry } from "@/lib/relatedEntries";
export default function RelatedEntries({ entries }: { entries: RelatedEntry[] }) {
  if (!entries.length) return null;
  return (
    <section aria-label="Related Entries" className="mt-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Related Entries</h2>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {entries.map(entry => {
          const content = <>
            {entry.cover_url ? <SafeImage src={entry.cover_url} alt="" width={48} height={64} sizes="48px" className="h-16 w-12 shrink-0 rounded object-cover" /> : <div aria-hidden="true" className="h-16 w-12 shrink-0 rounded bg-zinc-800" />}
            <div className="min-w-0">
              <p className="text-[11px] leading-4 text-cyan-300">{entry.label}</p>
              <p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-100">{entry.title}</p>
              <p className="text-xs leading-5 text-zinc-400">{entry.release_date?.slice(0, 4)}{entry.release_date && entry.library_game_id !== null ? " · " : ""}{entry.library_game_id !== null ? <span className="text-emerald-300">Owned</span> : null}</p>
            </div>
          </>;
          const style = "flex min-w-0 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2";
          return entry.library_game_id !== null ? <Link key={entry.key} href={`/game/${entry.library_game_id}`} className={`${style} transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 focus-visible:outline-2 focus-visible:outline-cyan-300`}>{content}</Link> : <div key={entry.key} className={style}>{content}</div>;
        })}
      </div>
    </section>
  );
}
