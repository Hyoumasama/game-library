import WatchLibraryClient from "@/app/watch/WatchLibraryClient";
import { getWatchLibrary } from "@/lib/server/watch/library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WatchPageProps = {
  searchParams: Promise<{
    type?: string;
    search?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const [params, library] = await Promise.all([
    searchParams,
    getWatchLibrary(),
  ]);

  return (
    <WatchLibraryClient
      initialData={library}
      initialFilters={{
        type: params.type || "all",
        search: params.search || "",
        status: params.status || "all",
        sort: params.sort || "recently-added",
      }}
    />
  );
}
