import "server-only";

import { searchAniListAnimeByTitle } from "@/lib/server/watch/anilist";
import { getTmdbTvDetails, searchTmdbByTitle } from "@/lib/server/watch/tmdb";
import type {
  AniListSearchCandidate,
  TmdbSearchCandidate,
  WatchLocalType,
  WatchMatchCandidate,
  WatchMatchInput,
  WatchMatchPreview,
} from "@/lib/server/watch/types";

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])
  );
}

function getYear(date: string | null | undefined) {
  if (!date) return null;

  const year = Number(date.slice(0, 4));

  return Number.isSafeInteger(year) ? year : null;
}

function getTypeCompatibilityScore(
  localType: WatchLocalType | undefined,
  sourceType: string,
  sourceFormat?: string | null
) {
  if (!localType) return { score: 0, reason: null };

  const normalizedFormat = sourceFormat?.toLowerCase() || "";

  if (localType === "Movie") {
    const compatible = sourceType === "movie" || normalizedFormat === "movie";
    return {
      score: compatible ? 16 : -18,
      reason: compatible ? "Type matches local movie" : "Type differs from local movie",
    };
  }

  if (localType === "Series") {
    const compatible =
      sourceType === "tv" ||
      ["tv", "tv_short", "ona"].includes(normalizedFormat);
    return {
      score: compatible ? 16 : -12,
      reason: compatible ? "Type matches local series" : "Type differs from local series",
    };
  }

  const compatible = ["ova", "special"].includes(normalizedFormat);
  return {
    score: compatible ? 14 : 0,
    reason: compatible ? "Format matches local OVA" : null,
  };
}

function scoreTitleMatch(queryTitle: string, titles: string[]) {
  const normalizedQuery = normalizeTitle(queryTitle);
  const normalizedTitles = titles.map(normalizeTitle);

  if (normalizedTitles.includes(normalizedQuery)) {
    return {
      score: 42,
      reason: "Normalized title match",
    };
  }

  if (
    normalizedTitles.some(
      (title) => title.includes(normalizedQuery) || normalizedQuery.includes(title)
    )
  ) {
    return {
      score: 24,
      reason: "Close title match",
    };
  }

  return {
    score: 0,
    reason: null,
  };
}

function scoreEpisodeMatch(localEpisodes: number | undefined, episodeCount: number | null) {
  if (!localEpisodes || !episodeCount) {
    return { score: 0, reason: null };
  }

  if (localEpisodes === episodeCount) {
    return {
      score: 18,
      reason: "Episode count matches local files",
    };
  }

  const distance = Math.abs(localEpisodes - episodeCount);

  if (distance <= 2) {
    return {
      score: 8,
      reason: "Episode count is close",
    };
  }

  return {
    score: -8,
    reason: "Episode count differs",
  };
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildConfidence({
  query,
  titles,
  sourceType,
  sourceFormat,
  episodeCount,
  releaseYear,
}: {
  query: WatchMatchInput;
  titles: string[];
  sourceType: string;
  sourceFormat?: string | null;
  episodeCount: number | null;
  releaseYear: number | null;
}) {
  const reasons: string[] = [];
  let score = 20;
  const titleScore = scoreTitleMatch(query.title, titles);
  const typeScore = getTypeCompatibilityScore(
    query.localType,
    sourceType,
    sourceFormat
  );
  const episodeScore = scoreEpisodeMatch(query.localEpisodes, episodeCount);

  score += titleScore.score + typeScore.score + episodeScore.score;

  for (const reason of [titleScore.reason, typeScore.reason, episodeScore.reason]) {
    if (reason) reasons.push(reason);
  }

  if (releaseYear) {
    score += 4;
    reasons.push(`Has release year ${releaseYear}`);
  }

  if (query.localSeasons && sourceType === "tv") {
    score += 2;
    reasons.push("Season-aware source result");
  }

  return {
    confidence: clampConfidence(score),
    confidenceReasons: reasons.length ? reasons : ["Candidate returned by source search"],
  };
}

function mapTmdbCandidate(
  query: WatchMatchInput,
  candidate: TmdbSearchCandidate,
  episodeCount: number | null
): WatchMatchCandidate {
  const releaseDate =
    candidate.tmdb_type === "movie"
      ? candidate.release_date
      : candidate.first_air_date;
  const releaseYear = getYear(releaseDate);
  const alternativeTitles = uniqueStrings([
    candidate.original_title,
    candidate.title,
  ]).filter((title) => title !== candidate.title);
  const confidence = buildConfidence({
    query,
    titles: [candidate.title, ...alternativeTitles],
    sourceType: candidate.tmdb_type,
    sourceFormat: candidate.tmdb_type === "movie" ? "movie" : "series",
    episodeCount,
    releaseYear,
  });

  return {
    source: "tmdb",
    sourceId: candidate.tmdb_id,
    tmdbType: candidate.tmdb_type,
    displayTitle: candidate.title,
    originalTitle: candidate.original_title,
    alternativeTitles,
    type: candidate.tmdb_type,
    format: candidate.tmdb_type === "movie" ? "movie" : "series",
    releaseYear,
    episodeCount,
    posterUrl: candidate.poster_url,
    score: candidate.vote_average,
    ...confidence,
  };
}

async function mapTmdbCandidates(
  query: WatchMatchInput,
  candidates: TmdbSearchCandidate[]
) {
  return Promise.all(
    candidates.map(async (candidate) => {
      if (candidate.tmdb_type !== "tv") {
        return mapTmdbCandidate(query, candidate, null);
      }

      try {
        const details = await getTmdbTvDetails(candidate.tmdb_id);

        return mapTmdbCandidate(
          query,
          candidate,
          details.number_of_episodes || null
        );
      } catch {
        return mapTmdbCandidate(query, candidate, null);
      }
    })
  );
}

function mapAniListCandidate(
  query: WatchMatchInput,
  candidate: AniListSearchCandidate
): WatchMatchCandidate {
  const titles = uniqueStrings([
    candidate.title.userPreferred,
    candidate.title.english,
    candidate.title.romaji,
    candidate.title.native,
    ...candidate.synonyms,
  ]);
  const displayTitle = titles[0] || `AniList ${candidate.id}`;
  const alternativeTitles = titles.filter((title) => title !== displayTitle);
  const releaseYear = candidate.seasonYear || getYear(candidate.startDate);
  const confidence = buildConfidence({
    query,
    titles,
    sourceType: "anime",
    sourceFormat: candidate.format,
    episodeCount: candidate.episodes,
    releaseYear,
  });

  return {
    source: "anilist",
    sourceId: candidate.id,
    malId: candidate.idMal,
    displayTitle,
    englishTitle: candidate.title.english,
    nativeTitle: candidate.title.native,
    alternativeTitles,
    type: "anime",
    format: candidate.format,
    releaseYear,
    episodeCount: candidate.episodes,
    posterUrl: candidate.coverImage?.extraLarge || candidate.coverImage?.large || null,
    score: candidate.score,
    ...confidence,
  };
}

export async function matchWatchTitle(
  input: WatchMatchInput
): Promise<WatchMatchPreview> {
  const query = {
    title: input.title.trim(),
    localType: input.localType,
    localSeasons: input.localSeasons,
    localEpisodes: input.localEpisodes,
  };

  const [tmdbResults, anilistResults] = await Promise.all([
    searchTmdbByTitle(query.title),
    searchAniListAnimeByTitle(query.title),
  ]);

  return {
    query,
    tmdbCandidates: await mapTmdbCandidates(query, tmdbResults.slice(0, 10)),
    anilistCandidates: anilistResults.slice(0, 10).map((candidate) =>
      mapAniListCandidate(query, candidate)
    ),
  };
}
