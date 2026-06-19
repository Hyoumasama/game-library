"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthButton() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    setIsAdmin(false);
window.location.reload();
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