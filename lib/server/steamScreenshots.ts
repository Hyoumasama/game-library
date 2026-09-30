import "server-only";

// Screenshots for adult games come from Steam only, never IGDB. Returns the
// full-size Steam screenshot URLs as the comma-separated string stored in
// games.screenshots, or null when Steam has none or the lookup fails (best
// effort: it must never break a search or backfill).
export async function fetchSteamScreenshots(appId: number, limit = 8) {
  try {
    // cc=US is required: without it Steam picks the region from the caller's
    // IP, and in regions that block adult content it answers success:false.
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=screenshots&l=en&cc=US`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as Record<
      string,
      { success?: boolean; data?: { screenshots?: { path_full?: string }[] } }
    >;
    const urls = (data?.[appId]?.data?.screenshots || [])
      .map((screenshot) => screenshot.path_full)
      .filter((url): url is string => Boolean(url))
      .slice(0, limit);

    return urls.length ? urls.join(",") : null;
  } catch (error) {
    console.error(`Steam screenshots lookup failed for app ${appId}:`, error);
    return null;
  }
}
