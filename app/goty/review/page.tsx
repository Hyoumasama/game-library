import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";
import AppNav from "@/components/AppNav";
import AwardsReview from "@/components/awards/AwardsReview";
export default async function ReviewPage() {
  if (!await verifyAdminSessionValue((await cookies()).get(ADMIN_SESSION_COOKIE)?.value)) redirect("/admin-login");
  return <main className="min-h-screen bg-[#070a0f] text-white"><div className="mx-auto max-w-5xl px-4 py-6"><AppNav/><h1 className="my-8 text-3xl font-bold text-amber-200">Review awards matches</h1><p className="mb-6 text-sm text-zinc-400">Select the precise library entry. Editions, remakes, DLC and collections must be reviewed individually. Rejecting a match prevents automatic future linking.</p><AwardsReview/></div></main>;
}
