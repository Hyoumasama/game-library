"use client";

import Link from "next/link";
import { setAdminStatus, useIsAdmin } from "@/lib/useAdminStatus";

export default function AuthButton() {
  const isAdmin = useIsAdmin();

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    setAdminStatus(false);
  }

  if (isAdmin) {
    return (
      <button
        onClick={logout}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
      >
        Logout
      </button>
    );
  }

  return (
    <Link
      href="/admin-login"
      className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500"
    >
      Login
    </Link>
  );
}
