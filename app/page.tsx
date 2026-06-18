export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold mb-2">
          🎮 Nawaf&apos;s Game Library
        </h1>

        <p className="text-zinc-400 mb-8">
          My personal gaming database, playtime tracker, and year-in-review hub.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-zinc-900 p-5">
            <p className="text-zinc-400">Total Games</p>
            <p className="text-3xl font-bold">2038</p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5">
            <p className="text-zinc-400">Completed</p>
            <p className="text-3xl font-bold">---</p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5">
            <p className="text-zinc-400">Playing</p>
            <p className="text-3xl font-bold">---</p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5">
            <p className="text-zinc-400">Wishlist</p>
            <p className="text-3xl font-bold">---</p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold mb-3">Next Step</h2>
          <p className="text-zinc-400">
            We will connect your Excel game database and display your real games here.
          </p>
        </div>
      </section>
    </main>
  );
}