import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoggedIn = request.cookies.get("admin_auth")?.value === "true";

  const isAdminLogin = pathname === "/admin-login";
  const isAdminLoginApi = pathname === "/api/admin/login";
  const isAdminMeApi = pathname === "/api/admin/me";

  const isProtectedPage = false;

  const isProtectedApi =
    pathname.startsWith("/api/admin") && !isAdminLoginApi && !isAdminMeApi;

  if ((isProtectedPage || isProtectedApi) && !isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  if (isAdminLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin-login"],
};