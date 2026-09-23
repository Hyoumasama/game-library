import { notFound } from "next/navigation";
import EntityPageLayout from "@/components/browsing/EntityPageLayout";
import { getPublisherPageData } from "@/lib/server/browsingEntities";

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublisherPageData(slug);

  if (!data) notFound();

  return <EntityPageLayout data={data} />;
}
