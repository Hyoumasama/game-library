import HomePageClient from "@/components/HomePageClient";
import { getHomeGames } from "@/lib/server/homeGames";
import { getSteamNewsTicker } from "@/lib/server/steamNews";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [homeGames, steamNews] = await Promise.all([
    getHomeGames(),
    // The ticker is extra; a missing table or Supabase hiccup must not take
    // the home page down with it.
    getSteamNewsTicker().catch((error) => {
      console.error("STEAM NEWS TICKER ERROR:", error);
      return [];
    }),
  ]);

  return <HomePageClient initialData={homeGames} steamNews={steamNews} />;
}
