import AppNav from "@/components/AppNav";
import { getAwardEvents, getAwards } from "@/lib/server/awards";
import AwardsShowcase from "@/components/awards/AwardsShowcase";
export const metadata = { title: "GOTY · Game Library" };
export default async function GotyPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const [params, events] = await Promise.all([searchParams, getAwardEvents()]);
  const selected = events.find(e => e.year === Number(params.year)) || events.find(e => e.status === "published") || events[0];
  const entries = selected ? await getAwards(selected.year, null, true) : [];
  return <main className="min-h-screen bg-[#070a0f] text-white"><div className="mx-auto max-w-7xl px-4 py-6 md:px-8"><AppNav />
    {selected ? <AwardsShowcase key={selected.year} events={events} event={selected} entries={entries}/> : <section className="py-24 text-center"><h1 className="text-4xl font-black text-amber-200">Game Awards</h1><p className="mt-4 text-zinc-400">The historical archive has not been imported yet.</p></section>}
  </div></main>;
}
