"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Asset } from "@/lib/assets";
import AssetModal from "./AssetModal";

export default function AssetAdminActions({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editSignal, setEditSignal] = useState(0);
  const [deleting, setDeleting] = useState(false);

  async function deleteAsset() {
    setOpen(false);
    if (!window.confirm(`Delete ${asset.name}?`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/assets/${asset.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete asset");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete asset");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AssetModal asset={asset} hideButton openSignal={editSignal} />

      {open && (
        <button
          type="button"
          aria-label="Close asset actions"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="absolute bottom-3 right-3 z-30">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Actions for ${asset.name}`}
          disabled={deleting}
          onClick={() => setOpen((current) => !current)}
          className={`flex h-9 w-9 items-center justify-center transition disabled:cursor-wait disabled:opacity-40 ${
            open
              ? "text-cyan-300 opacity-100"
              : "text-zinc-500 opacity-60 hover:text-cyan-300 hover:opacity-100 md:opacity-0 md:group-hover:opacity-60 md:hover:opacity-100"
          }`}
        >
          <span className="flex flex-col items-center gap-0.5" aria-hidden="true">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute bottom-11 right-0 w-36 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setEditSignal((value) => value + 1);
              }}
              className="block w-full border-b border-zinc-800 px-4 py-3 text-left text-xs font-black text-white hover:bg-zinc-900"
            >
              Edit Asset
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={deleteAsset}
              className="block w-full px-4 py-3 text-left text-xs font-black text-red-400 hover:bg-zinc-900"
            >
              Delete Asset
            </button>
          </div>
        )}
      </div>
    </>
  );
}
