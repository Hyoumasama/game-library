import { notFound } from "next/navigation";
import EntityPageLayout from "@/components/browsing/EntityPageLayout";
import { getFranchisePageData } from "@/lib/server/browsingEntities";

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getFranchisePageData(slug);

  if (!data) notFound();

  return <EntityPageLayout data={data} />;
}
