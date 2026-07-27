import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import WatchImportReviewClient from "./WatchImportReviewClient";

export default async function WatchImportPage() {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    redirect("/admin-login");
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <AppNav />
        <Suspense
          fallback={
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-sm font-bold text-zinc-400">
              Loading import items...
            </div>
          }
        >
          <WatchImportReviewClient />
        </Suspense>
      </div>
    </main>
  );
}
