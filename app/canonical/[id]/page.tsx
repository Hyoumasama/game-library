import AppNav from "@/components/AppNav";
import GameRelationships from "@/components/games/GameRelationships";
import { uuid } from "@/lib/relationships/validation";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    uuid(id);
  } catch {
    notFound();
  }
  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <GameRelationships canonicalId={id} />
      </div>
    </main>
  );
}
