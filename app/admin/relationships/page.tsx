import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import RelationshipReviewClient from "./RelationshipReviewClient";
export default async function Page() {
  const store = await cookies();
  if (!(await verifyAdminSessionValue(store.get(ADMIN_SESSION_COOKIE)?.value)))
    redirect("/admin-login");
  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <RelationshipReviewClient />
      </div>
    </main>
  );
}
