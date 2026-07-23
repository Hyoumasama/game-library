"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButton from "@/components/admin/AuthButton";
import AddGameModal from "@/components/games/AddGameModal";
import HomeGameSearch from "@/components/HomeGameSearch";
import BackButton from "@/components/BackButton";

const navItems = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  {
    href: "/all-games",
    label: "All Games",
    match: (path: string) => path.startsWith("/all-games"),
  },
  {
    href: "/stats",
    label: "Stats",
    match: (path: string) => path.startsWith("/stats"),
  },
  {
    href: "/monthly-log",
    label: "Monthly Log",
    match: (path: string) => path.startsWith("/monthly-log"),
  },
  {
    href: "/assets",
    label: "Assets",
    match: (path: string) => path.startsWith("/assets"),
  },
];

function navItemClass(label: string) {
  if (label === "Home") {
    return "rounded-xl border border-cyan-300/50 bg-cyan-300 px-4 py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(103,232,249,0.22)] hover:bg-cyan-200";
  }

  return "rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500";
}

function mobileNavItemClass(label: string) {
  if (label === "Home") {
    return "rounded-xl border border-cyan-300/50 bg-cyan-300 px-4 py-3 text-center text-sm font-black text-black";
  }

  return "rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white";
}

type AppNavProps = {
  onGameAdded?: () => void;
  actions?: React.ReactNode;
};

export default function AppNav({ onGameAdded, actions }: AppNavProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const visibleItems = navItems.filter((item) => !item.match(pathname));

  useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    }

    checkAdmin();
  }, []);

  return (
    <div className="mb-5">
      <div className="hidden items-center gap-3 lg:flex">
        {!isHome && <BackButton />}

        <div className="min-w-[280px] flex-1">
          <HomeGameSearch />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navItemClass(item.label)}
            >
              {item.label}
            </Link>
          ))}

          {actions}
          <AuthButton />
          {isAdmin && <AddGameModal onGameAdded={onGameAdded} />}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:hidden">
        {!isHome && <BackButton compact />}

        <div className="min-w-0 flex-1">
          <HomeGameSearch />
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-2xl font-black leading-none text-white"
        >
          ☰
        </button>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 p-4 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="mx-auto max-w-sm rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-black text-white">Menu</p>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-black text-white"
              >
                x
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={mobileNavItemClass(item.label)}
                >
                  {item.label}
                </Link>
              ))}

              {actions && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 [&>div]:flex-col [&>div]:gap-3 [&_a]:w-full [&_a]:justify-center [&_a]:py-3 [&_button]:w-full [&_button]:justify-center [&_button]:py-3">
                  {actions}
                </div>
              )}
              {isAdmin && <AddGameModal onGameAdded={onGameAdded} />}
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
