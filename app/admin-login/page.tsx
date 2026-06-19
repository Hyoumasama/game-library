"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Checking...");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setMessage("Wrong password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
      <form
        onSubmit={login}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
      >
        <h1 className="mb-2 text-3xl font-bold">Admin Login</h1>
        <p className="mb-6 text-zinc-400">
          Enter password to manage the game library.
        </p>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-white"
        />

        <button className="w-full rounded-xl bg-white px-4 py-3 font-bold text-black">
          Login
        </button>

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
      </form>
    </main>
  );
}