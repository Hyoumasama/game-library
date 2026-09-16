"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Asset, AssetFormValues, assetToFormValues } from "@/lib/assets";

type AssetOptions = {
  types: string[];
  categories: string[];
  brands: string[];
  markets: string[];
  statuses: string[];
};

const emptyOptions: AssetOptions = {
  types: [], categories: [], brands: [], markets: [], statuses: [],
};

const inputClass = "rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white";

async function responseError(response: Response) {
  const data = await response.json().catch(() => null);
  if (response.status === 401) return "Your admin session has expired. Sign in again.";
  return data?.error || "Something went wrong. Please try again.";
}

export default function AssetModal({ asset }: { asset?: Asset }) {
  const router = useRouter();
  const editing = Boolean(asset);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AssetFormValues>(() => assetToFormValues(asset));
  const [options, setOptions] = useState<AssetOptions>(emptyOptions);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    fetch("/api/admin/assets")
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json() as Promise<AssetOptions>;
      })
      .then((data) => !cancelled && setOptions({ ...emptyOptions, ...data }))
      .catch((error) => {
        if (!cancelled) {
          setOptions(emptyOptions);
          setMessage(error instanceof Error ? error.message : "Failed to load options");
        }
      });

    return () => { cancelled = true; };
  }, [asset, open]);

  function update<K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function openModal() {
    setValues(assetToFormValues(asset));
    setMessage("");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving...");

    try {
      const response = await fetch(
        editing ? `/api/admin/assets/${asset!.id}` : "/api/admin/assets",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      if (!response.ok) throw new Error(await responseError(response));

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={editing
          ? "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white"
          : "rounded-xl bg-white px-4 py-3 font-bold text-black"}
      >
        {editing ? "Edit" : "+ Add Asset"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editing ? "Edit Asset" : "Add Asset"}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Type"><input value={values.type} onChange={(e) => update("type", e.target.value)} list="asset-types" required className={inputClass} /></Field>
              <Options id="asset-types" values={options.types} />
              <Field label="Category"><input value={values.category} onChange={(e) => update("category", e.target.value)} list="asset-categories" className={inputClass} /></Field>
              <Options id="asset-categories" values={options.categories} />
              <Field label="Name" wide><input value={values.name} onChange={(e) => update("name", e.target.value)} required className={inputClass} /></Field>
              <Field label="Brand"><input value={values.brand} onChange={(e) => update("brand", e.target.value)} list="asset-brands" className={inputClass} /></Field>
              <Options id="asset-brands" values={options.brands} />
              <Field label="Purchase date"><input type="date" value={values.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} className={inputClass} /></Field>
              <Field label="Price"><input value={values.price} onChange={(e) => update("price", e.target.value)} placeholder="SAR 1,500.00" className={inputClass} /></Field>
              <Field label="Market"><input value={values.market} onChange={(e) => update("market", e.target.value)} list="asset-markets" className={inputClass} /></Field>
              <Options id="asset-markets" values={options.markets} />
              <Field label="Image URL" wide><input type="url" value={values.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} className={inputClass} /></Field>
              <Field label="Status"><input value={values.status} onChange={(e) => update("status", e.target.value)} list="asset-statuses" className={inputClass} /></Field>
              <Options id="asset-statuses" values={options.statuses} />
              <Field label="Notes" wide><textarea value={values.notes} onChange={(e) => update("notes", e.target.value)} className={`${inputClass} min-h-24`} /></Field>

              <button type="submit" disabled={saving} className="rounded-xl bg-white px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2">
                {saving ? "Saving..." : editing ? "Save Changes" : "Save Asset"}
              </button>
              {message && <p role="status" className="text-sm text-amber-300 md:col-span-2">{message}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-1 text-sm text-zinc-400 ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>;
}

function Options({ id, values }: { id: string; values: string[] }) {
  return <datalist id={id}>{values.map((value) => <option key={value} value={value} />)}</datalist>;
}
