"use client";

import { ReactNode, useRef, useState } from "react";

export default function LongPressGameCard({
  children,
  title,
  footer,
  imageUrl,
  onEdit,
  onDelete,
  disabled = false,
}: {
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
  imageUrl?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockClickRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  function clearLongPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  if (disabled) return <>{children}</>;

  return (
    <div className="contents">
      <div
        className="contents"
        onTouchStart={() => {
          blockClickRef.current = false;

          timerRef.current = setTimeout(() => {
            blockClickRef.current = true;
            setMenuOpen(true);
setTimeout(() => setMenuVisible(true), 10);
          }, 420);
        }}
        onTouchMove={clearLongPress}
        onTouchEnd={clearLongPress}
        onClickCapture={(event) => {
          if (!blockClickRef.current) return;

          event.preventDefault();
          event.stopPropagation();
          blockClickRef.current = false;
        }}
      >
        {children}
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            onClick={() => {
  setMenuVisible(false);
  setTimeout(() => setMenuOpen(false), 150);
}}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />

          <div className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border-t border-zinc-700 bg-zinc-950 p-4 shadow-2xl transition-all duration-150 ease-out md:hidden ${
  menuVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
}`}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-700" />

            <div className="mb-4 flex items-center gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title || "Game cover"}
                  className="h-16 w-12 rounded-xl object-cover"
                />
              )}

              <div className="min-w-0">
                {title && (
                  <p className="truncate text-base font-black text-white">
                    {title}
                  </p>
                )}

                {footer && (
                  <div className="mt-2 flex items-center gap-2">
                    {footer}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMenuVisible(false);
setTimeout(() => setMenuOpen(false), 150);;
                  onEdit();
                }}
                className="block w-full border-b border-zinc-800 bg-zinc-900 px-4 py-4 text-left text-sm font-black text-white active:bg-zinc-800"
              >
                ✏️ Edit Game
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuVisible(false);
setTimeout(() => setMenuOpen(false), 150);;
                  onDelete();
                }}
                className="block w-full bg-zinc-900 px-4 py-4 text-left text-sm font-black text-red-400 active:bg-zinc-800"
              >
                🗑 Delete Game
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
  setMenuVisible(false);
  setTimeout(() => setMenuOpen(false), 150);
}}
              className="mt-3 block w-full rounded-2xl bg-zinc-800 px-4 py-4 text-sm font-black text-white active:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}