import HomePageClient from "@/components/HomePageClient";
import { getHomeGames } from "@/lib/server/homeGames";

export default async function Home() {
  const homeGames = await getHomeGames();

  return <HomePageClient initialData={homeGames} />;
}
