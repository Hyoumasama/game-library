"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AddAssetModal() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState("hardware");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
  new Date().toISOString().slice(0, 10)
);
  const [price, setPrice] = useState("");
  const [market, setMarket] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("Owned");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const [options, setOptions] = useState({
  types: [] as string[],
  categories: [] as string[],
  brands: [] as string[],
  markets: [] as string[],
  statuses: [] as string[],
});

useEffect(() => {
  fetch("/api/admin/assets")
    .then((res) => res.json())
    .then((data) => setOptions(data));
}, []);

  async function addAsset(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Saving...");

    const response = await fetch("/api/admin/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        category,
        name,
        brand,
        purchaseDate,
        price,
        market,
        imageUrl,
        status,
        notes,
      }),
    });

    if (!response.ok) {
      setMessage("Failed to save");
      return;
    }

    setMessage("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-4 py-3 font-bold text-black"
      >
        + Add Asset
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Asset</h2>

              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addAsset} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
              >
                <option value="hardware">Hardware</option>
                <option value="service">Subscription</option>
              </select>

              <input
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  list="asset-categories"
  placeholder="Category"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="asset-categories">
  {options.categories.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
              />

              <input
  value={brand}
  onChange={(e) => setBrand(e.target.value)}
  list="asset-brands"
  placeholder="Brand"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="asset-brands">
  {options.brands.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>

              <input
  type="date"
  value={purchaseDate}
  onChange={(e) => setPurchaseDate(e.target.value)}
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
              />

              <input
  value={market}
  onChange={(e) => setMarket(e.target.value)}
  list="asset-markets"
  placeholder="Market"
  className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
/>

<datalist id="asset-markets">
  {options.markets.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>

              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL"
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3"
              >
                <option>Owned</option>
                <option>Retired</option>
                <option>Active</option>
                <option>Expired</option>
              </select>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="min-h-24 rounded-xl border border-zinc-700 bg-black px-4 py-3 md:col-span-2"
              />

              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 font-bold text-black md:col-span-2"
              >
                Save Asset
              </button>

              {message && (
                <p className="text-zinc-400 md:col-span-2">{message}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}