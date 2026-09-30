import WatchAllWorksClient from "@/app/watch/all-works/WatchAllWorksClient";
import { getWatchLibrary } from "@/lib/server/watch/library";
import { readWatchFilters } from "@/lib/watchFilters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WatchAllWorksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, library] = await Promise.all([searchParams, getWatchLibrary()]);
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") urlParams.set(key, value);
  }

  return (
    <WatchAllWorksClient
      // A search submitted from the nav while already on this page only
      // changes the URL, so remount to pick up the new filters.
      key={urlParams.get("search") || ""}
      initialData={library}
      initialFilters={readWatchFilters(urlParams)}
    />
  );
}
