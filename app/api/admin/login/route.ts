import { cookies } from "next/headers";

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

  cookieStore.set("admin_auth", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ success: true });
}