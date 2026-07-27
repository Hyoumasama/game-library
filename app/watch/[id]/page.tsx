import WatchMediaDetailsClient from "@/app/watch/[id]/WatchMediaDetailsClient";
import { getWatchMediaDetails } from "@/lib/server/watch/library";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WatchMediaPageProps = {
  params: Promise<{ id: string }>;
};

function parseMediaId(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function WatchMediaPage({ params }: WatchMediaPageProps) {
  const { id: rawId } = await params;
  const id = parseMediaId(rawId);

  if (!id) notFound();

  const details = await getWatchMediaDetails(id);

  if (!details) notFound();

  return <WatchMediaDetailsClient details={details} />;
}
