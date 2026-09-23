import { notFound } from "next/navigation";
import EntityPageLayout from "@/components/browsing/EntityPageLayout";
import { getDeveloperPageData } from "@/lib/server/browsingEntities";

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getDeveloperPageData(slug);

  if (!data) notFound();

  return <EntityPageLayout data={data} />;
}
