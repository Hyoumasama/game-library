import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/adminAuth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoggedIn = await verifyAdminSessionValue(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  );

  const isAdminLogin = pathname === "/admin-login";
  const isAdminLoginApi = pathname === "/api/admin/login";
  const isAdminMeApi = pathname === "/api/admin/me";
  const isMonthlyLogsWrite =
    pathname === "/api/monthly-logs" &&
    (request.method === "POST" || request.method === "DELETE");

  const isProtectedApi =
    (pathname.startsWith("/api/admin") && !isAdminLoginApi && !isAdminMeApi) ||
    isMonthlyLogsWrite;

  if (isProtectedApi && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/monthly-logs", "/admin-login"],
};
