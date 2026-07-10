import HomePageClient from "@/components/HomePageClient";
import { getHomeGames } from "@/lib/server/homeGames";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const homeGames = await getHomeGames();

  return <HomePageClient initialData={homeGames} />;
}
