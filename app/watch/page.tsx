import AppNav from "@/components/AppNav";
import WatchNewsRow from "@/components/watch/WatchNewsRow";
import { WatchPosterRow } from "@/app/watch/WatchWorkCards";
import {
  getWatchLibrary,
  type WatchLibraryItem,
} from "@/lib/server/watch/library";
import { getWatchNews } from "@/lib/server/watch/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// A home row fills one line of the 7-column grid.
const ROW_SIZE = 7;
const inProgressStatuses = new Set(["Watching", "Rewatching"]);

function timeValue(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function newestFirst(
  items: WatchLibraryItem[],
  field: "created_at" | "updated_at"
) {
  return items
    .slice()
    .sort(
      (first, second) =>
        timeValue(second.entry[field]) - timeValue(first.entry[field])
    );
}

// Laid out like the games home: news on top, then the library rows.
export default async function WatchHomePage() {
  const [{ items }, news] = await Promise.all([
    getWatchLibrary(),
    // News is extra; a feed outage must not take the page down with it.
    getWatchNews().catch((error) => {
      console.error("WATCH NEWS ERROR:", error);
      return [];
    }),
  ]);
  const continueWatching = newestFirst(
    items.filter((item) => inProgressStatuses.has(item.entry.watch_status)),
    "updated_at"
  ).slice(0, ROW_SIZE);
  const recentlyAdded = newestFirst(items, "created_at").slice(0, ROW_SIZE);

  return (
    <main className="min-h-screen bg-[#070a0f] p-4 text-white md:p-8">
      <div className="relative mx-auto max-w-7xl">
        <AppNav />

        <WatchNewsRow items={news} nowIso={new Date().toISOString()} />

        <WatchPosterRow
          title="Continue Watching"
          items={continueWatching}
          href="/watch/all-works?status=Watching,Rewatching"
          emptyMessage="Nothing in progress. Works set to Watching show up here."
          showNextEpisode
        />

        <WatchPosterRow
          title="Recently Added"
          items={recentlyAdded}
          href="/watch/all-works?sort=recently-added"
          emptyMessage="Your watch library is empty."
        />
      </div>
    </main>
  );
}
