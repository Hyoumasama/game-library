import Link from "next/link";
import { getAwards } from "@/lib/server/awards";
import { awardStats } from "@/lib/awards";
import TrophyIcon from "./TrophyIcon";
export default async function AwardsStats() {
  const entries = (await getAwards()).filter(e => e.owned);
  if (!entries.length) return null;
  const stats = awardStats(entries);
  const ranked = [...new Set(entries.map(e => e.game_id))].map(id => {
    const awards = entries.filter(e => e.game_id === id);
    return { id, name: awards[0].game_title || awards[0].nominee_name, wins: awards.filter(e => e.status === "winner").length };
  }).sort((a,b) => b.wins-a.wins).slice(0,3);
  return <section className="my-8 rounded-2xl border border-amber-300/20 bg-zinc-950/80 p-6"><Link href="/goty" className="flex items-center gap-3 font-bold text-amber-200"><TrophyIcon/>All-Time Game Awards</Link><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">{[["GOTY winners owned",stats.goty],["Award-winning games",stats.winningGames],["Nominations",stats.nominations],["Awards won",stats.wins]].map(([label,n]) => <div key={label}><p className="text-2xl font-black">{n}</p><p className="text-xs text-zinc-500">{label}</p></div>)}</div><div className="mt-5 flex flex-wrap gap-3">{ranked.filter(g => g.wins).map(g => <Link key={g.id} href={`/game/${g.id}`} className="text-xs text-amber-200 hover:underline">{g.name} · {g.wins} wins</Link>)}</div></section>;
}
