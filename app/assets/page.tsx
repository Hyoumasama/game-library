import AddAssetModal from "@/components/assets/AddAssetModal";
import AppNav from "@/components/AppNav";
import SafeImage from "@/components/SafeImage";
import { supabase } from "@/lib/supabase";

type Asset = {
  id: number;
  type: string;
  category: string | null;
  name: string;
  brand: string | null;
  purchase_date: string | null;
  price: string | null;
  market: string | null;
  image_url: string | null;
  status: string | null;
  notes: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return date;
}

export default async function AssetsPage() {
  const { data, error } = await supabase
    .from("library_assets")
    .select("*")
    .order("purchase_date", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Failed to load assets.
      </main>
    );
  }

  const assets = (data || []) as Asset[];

  const hardware = assets.filter(
    (asset) => asset.type?.toLowerCase() === "hardware"
  );

  const subscriptions = assets.filter((asset) => {
    const type = asset.type?.toLowerCase();
    return type === "service" || type === "subscription";
  });

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <AppNav />

        <div className="mb-10 flex items-start justify-between gap-4">
  <div>
    <h1 className="mb-2 text-4xl font-bold">My Assets</h1>

    <p className="text-zinc-400">
      Hardware, subscriptions, and services used across the game library.
    </p>
  </div>

  <AddAssetModal />
</div>

        <section className="mb-12">
  <h2 className="mb-5 text-2xl font-bold">Hardware</h2>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {hardware.map((asset) => (
      <div
        key={asset.id}
        className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
      >
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-black">
          {asset.image_url ? (
            <SafeImage
  src={asset.image_url}
  alt={asset.name}
  width={80}
  height={80}
  sizes="80px"
  className="h-full w-full object-cover"
/>
          ) : (
            <span className="text-3xl">🎮</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-bold">{asset.name}</h3>

          <p className="mt-1 text-sm text-zinc-400">
            {asset.brand || asset.category || "-"}
          </p>

          <p className="mt-2 font-bold">{asset.price || "-"}</p>

          <p className="mt-1 text-xs text-zinc-500">
            {formatDate(asset.purchase_date)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            asset.status === "Owned" || asset.status === "Active"
              ? "bg-green-500/15 text-green-400"
              : asset.status === "Retired" || asset.status === "Expired"
              ? "bg-red-500/15 text-red-400"
              : "bg-zinc-700/30 text-zinc-300"
          }`}
        >
          {asset.status || "-"}
        </span>
      </div>
    ))}
  </div>
</section>

        <section>
          <h2 className="mb-5 text-2xl font-bold">Subscriptions</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {subscriptions.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black">
                  {asset.image_url ? (
                    <SafeImage
                      src={asset.image_url}
                      alt={asset.name}
                      width={64}
                      height={64}
                      sizes="64px"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-2xl">💳</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{asset.name}</h3>

                  <p className="mt-1 text-sm text-zinc-400">
                    {asset.price || "-"}
                  </p>

                  <p
  className={`mt-1 text-xs font-medium ${
    asset.status === "Owned" ||
    asset.status === "Active"
      ? "text-green-400"
      : asset.status === "Retired" ||
        asset.status === "Expired"
      ? "text-red-400"
      : "text-zinc-500"
  }`}
>
  {asset.status || "-"}
</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
