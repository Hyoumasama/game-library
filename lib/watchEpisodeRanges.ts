// Owned episodes are edited per season as text: "all", "" (none), or ranges
// like "1-12, 14, 16-20". Shared by the add/edit forms and the server.

export function parseEpisodeRanges(
  text: string,
  episodeNumbers: number[]
): { episodes: number[] } | { error: string } {
  const value = text.trim().toLowerCase();

  if (!value) return { episodes: [] };
  if (value === "all") return { episodes: episodeNumbers.slice() };

  const available = new Set(episodeNumbers);
  const picked = new Set<number>();

  for (const part of value.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) return { error: `"${part}" is not an episode number or range` };

    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;

    if (to < from) return { error: `"${part}" goes backwards` };

    for (let episode = from; episode <= to; episode += 1) {
      if (!available.has(episode)) {
        return { error: `Episode ${episode} does not exist in this season` };
      }

      picked.add(episode);
    }
  }

  return { episodes: [...picked].sort((a, b) => a - b) };
}

export function formatEpisodeRanges(owned: number[], episodeNumbers: number[]) {
  if (!owned.length) return "";

  const sorted = [...new Set(owned)].sort((a, b) => a - b);

  if (episodeNumbers.length && sorted.length === episodeNumbers.length) return "all";

  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (const episode of [...sorted.slice(1), NaN]) {
    if (episode === previous + 1) {
      previous = episode;
      continue;
    }

    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = episode;
    previous = episode;
  }

  return ranges.join(", ");
}
