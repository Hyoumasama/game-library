import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_auth")?.value === "true";

  return Response.json({ isAdmin });
}