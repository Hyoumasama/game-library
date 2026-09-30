"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import AuthButton from "@/components/admin/AuthButton";
import HomeGameSearch from "@/components/HomeGameSearch";
import BackButton from "@/components/BackButton";
import { useIsAdmin } from "@/lib/useAdminStatus";

// Only admins ever see this modal, so keep it out of everyone else's
// initial JS bundle and fetch it on demand once we know isAdmin is true.
const AddGameModal = dynamic(() => import("@/components/games/AddGameModal"), {
  ssr: false,
});
const AddWorkModal = dynamic(() => import("@/components/watch/AddWorkModal"), {
  ssr: false,
});

type NavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
};

// The site has two sections, games and watch. The nav shows a switch between
// them plus the links of the section the current page belongs to.
const gameItems: NavItem[] = [
  { href: "/", label: "Home", match: (path) => path === "/" },
  {
    href: "/all-games",
    label: "All Games",
    match: (path) => path.startsWith("/all-games"),
  },
  { href: "/news", label: "News", match: (path) => path.startsWith("/news") },
  { href: "/stats", label: "Stats", match: (path) => path.startsWith("/stats") },
  {
    href: "/monthly-log",
    label: "Monthly Log",
    match: (path) => path.startsWith("/monthly-log"),
  },
  {
    href: "/assets",
    label: "Assets",
    match: (path) => path.startsWith("/assets"),
  },
];

const watchItems: NavItem[] = [
  { href: "/watch", label: "Home", match: (path) => path === "/watch" },
  {
    href: "/watch/all-works",
    label: "All Works",
    match: (path) => path.startsWith("/watch/all-works"),
  },
  {
    href: "/watch/news",
    label: "News",
    match: (path) => path.startsWith("/watch/news"),
  },
];

const sections = [
  { key: "games", href: "/", label: "Games" },
  { key: "watch", href: "/watch", label: "Watch" },
] as const;

function isWatchPath(path: string) {
  return path === "/watch" || path.startsWith("/watch/");
}

function navItemClass(isActive: boolean) {
  return isActive
    ? "rounded-xl border border-cyan-300/50 bg-cyan-300 px-4 py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(103,232,249,0.22)]"
    : "rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:border-zinc-500";
}

function SectionSwitch({
  current,
  onNavigate,
  fullWidth = false,
}: {
  current: "games" | "watch";
  onNavigate?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 rounded-xl border border-zinc-700 bg-zinc-950 p-1 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {sections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          onClick={onNavigate}
          aria-current={section.key === current ? "page" : undefined}
          className={`rounded-lg px-4 py-2 text-center text-sm font-black ${
            fullWidth ? "flex-1" : ""
          } ${
            section.key === current
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {section.label}
        </Link>
      ))}
    </div>
  );
}

function WatchSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    router.push(
      trimmed
        ? `/watch/all-works?search=${encodeURIComponent(trimmed)}`
        : "/watch/all-works"
    );
  }

  return (
    <form onSubmit={submit}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search watch library..."
        aria-label="Search watch library"
        className="h-[52px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-500 hover:border-zinc-600 focus:border-cyan-300"
      />
    </form>
  );
}

type AppNavProps = {
  onGameAdded?: () => void;
  actions?: React.ReactNode;
};

export default function AppNav({ onGameAdded, actions }: AppNavProps) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const section = isWatchPath(pathname) ? "watch" : "games";
  const items = section === "watch" ? watchItems : gameItems;
  const isSectionHome = pathname === "/" || pathname === "/watch";
  const search = section === "watch" ? <WatchSearch /> : <HomeGameSearch />;
  const showAddGame = isAdmin && section === "games";
  const showAddWork = isAdmin && section === "watch";

  return (
    <div className="mb-5">
      <div className="hidden items-center gap-3 lg:flex">
        {!isSectionHome && <BackButton />}

        <SectionSwitch current={section} />

        <div className="min-w-[220px] flex-1">{search}</div>

        <div className="flex shrink-0 items-center gap-3">
          {items.map((item) => {
            const isActive = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={navItemClass(isActive)}
              >
                {item.label}
              </Link>
            );
          })}

          {actions}
          <AuthButton />
          {showAddGame && <AddGameModal onGameAdded={onGameAdded} />}
          {showAddWork && <AddWorkModal />}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:hidden">
        {!isSectionHome && <BackButton compact />}

        <div className="min-w-0 flex-1">{search}</div>

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
              <SectionSwitch
                current={section}
                onNavigate={() => setIsMenuOpen(false)}
                fullWidth
              />

              {items.map((item) => {
                const isActive = item.match(pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`${navItemClass(isActive)} text-center`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {actions && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 [&>div]:flex-col [&>div]:gap-3 [&_a]:w-full [&_a]:justify-center [&_a]:py-3 [&_button]:w-full [&_button]:justify-center [&_button]:py-3">
                  {actions}
                </div>
              )}
              {showAddGame && <AddGameModal onGameAdded={onGameAdded} />}
              {showAddWork && <AddWorkModal />}
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
