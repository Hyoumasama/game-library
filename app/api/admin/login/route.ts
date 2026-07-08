import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionValue,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const password = body.password;

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  const sessionValue = await createAdminSessionValue();

  if (!sessionValue) {
    return Response.json(
      { error: "Admin session secret is not configured" },
      { status: 500 }
    );
  }

  cookieStore.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  return Response.json({ success: true });
}
