// Where a watch-library work is watched from, stored per library entry in
// watch_library_entries.watch_sources. "Hard Disk" means local files; the
// rest are streaming services. "Hard Disk" is picked by hand; for series the
// server also drops it when no episode is on the disk.

export const HARD_DISK = "Hard Disk";

export const STREAMING_SOURCES = [
  "Netflix",
  "OSN+",
  "Crunchyroll",
  "Shahid",
  "Disney+",
  "Prime Video",
  "Apple TV+",
];

const MAX_SOURCES = 12;
const MAX_SOURCE_LENGTH = 40;

// Trims, drops empties and case-insensitive duplicates, and caps the list.
// Known names are normalized to their canonical spelling.
export function normalizeSources(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const known = new Map(
    [HARD_DISK, ...STREAMING_SOURCES].map((source) => [source.toLowerCase(), source])
  );
  const seen = new Set<string>();
  const sources: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;

    const trimmed = value.trim().slice(0, MAX_SOURCE_LENGTH);
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) continue;

    seen.add(key);
    sources.push(known.get(key) || trimmed);
  }

  return sources.slice(0, MAX_SOURCES);
}

export function withDiskSource(sources: string[], onDisk: boolean) {
  const streaming = sources.filter((source) => source !== HARD_DISK);

  return onDisk ? [HARD_DISK, ...streaming] : streaming;
}

export function streamingSources(sources: string[]) {
  return sources.filter((source) => source !== HARD_DISK);
}
