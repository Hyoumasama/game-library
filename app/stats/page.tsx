import Link from "next/link";

export default function StatsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <Link
        href="/"
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        ← Back to Library
      </Link>

      <section className="mx-auto mt-20 max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950/80 p-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
          Stats
        </p>

        <h1 className="mt-4 text-4xl font-black">
          Stats page is being rebuilt
        </h1>

        <p className="mt-4 text-zinc-400">
          This page will be rebuilt using Supabase-powered statistics.
        </p>
      </section>
    </main>
  );
}