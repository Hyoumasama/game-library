import { notFound } from "next/navigation";
import EntityPageLayout from "@/components/browsing/EntityPageLayout";
import { readFiltersFromPageSearchParams } from "@/lib/gameFilters";
import { getFranchisePageData } from "@/lib/server/browsingEntities";

export default async function FranchisePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await getFranchisePageData(slug);

  if (!data) notFound();

  return (
    <EntityPageLayout
      data={data}
      basePath={`/franchise/${slug}`}
      initialFilters={readFiltersFromPageSearchParams(query)}
    />
  );
}
