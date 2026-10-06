import type { Metadata } from "next";
import PlayConstellationsPage from "@/components/constellations/PlayConstellationsPage";
import { getPlayRoutes } from "@/lib/server/constellations";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Play Constellations | Game Library",
};

export default async function Page() {
  const result = await getPlayRoutes()
    .then((routes) => ({ routes, error: "" }))
    .catch(() => ({
      routes: [],
      error: "Unable to load your routes. Please try again.",
    }));
  return (
    <PlayConstellationsPage
      initialRoutes={result.routes}
      initialError={result.error}
    />
  );
}
