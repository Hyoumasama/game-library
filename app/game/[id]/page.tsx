import AppNav from "@/components/AppNav";
import GameHeroActions from "@/components/games/GameHeroActions";
import { getFranchiseRef, getGameIdentity, getGameRow } from "@/lib/games";
import {
  formatDisplayDate,
  formatHours,
  getDaysBetween,
  getIcon,
  getYearFromDate,
  slugify,
} from "@/lib/gameHelpers";
import { getRankFromDatabase } from "@/lib/server/gameRanking";
import Image from "next/image";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import RelatedEntries from "@/components/games/RelatedEntries";
import { getRelatedEntries } from "@/lib/server/relatedEntries";
import {
  getIgdbGameUrl,
  getSteamStoreUrl,
} from "@/lib/server/gameExternalLinks";
import ExpandableGameSummary from "@/components/games/ExpandableGameSummary";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  // The game row and its identity link don't depend on each other, so
  // fetch them together instead of one after the other.
  const [gameRow, canonicalGameId] = await Promise.all([
    getGameRow(numericId),
    getGameIdentity(numericId),
  ]);

if (!gameRow) {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      Game not found
    </main>
  );
}

const releaseYear = getYearFromDate(gameRow.Release);
const completedYear = getYearFromDate(gameRow["Completion Last Played"]);
const status = gameRow.Status?.trim();

// Franchise, related entries, and both ranks are all independent of each
// other once we have gameRow/canonicalGameId, so run them together too
// (getRelatedEntries reuses canonicalGameId instead of re-fetching the
// identity link itself).
const [franchiseRef, relatedEntries, scoreRank, completedRank] = await Promise.all([
  canonicalGameId ? getFranchiseRef(canonicalGameId) : Promise.resolve(null),
  getRelatedEntries(numericId, canonicalGameId),
  getRankFromDatabase({
    column: "score",
    currentValue: Number(gameRow.Score || 0),
    yearColumn: "release",
    currentYear: releaseYear,
  }),
  status === "Completed"
    ? getRankFromDatabase({
        column: "hours_played",
        currentValue: Number(gameRow["Hours Played"] || 0),
        yearColumn: "completion_last_played",
        currentYear: completedYear,
        status: "Completed",
      })
    : Promise.resolve(undefined),
]);

const game = { ...gameRow, franchise: franchiseRef?.name ?? null };
// Whole stored developer/publisher string is treated as one entity for
// /developer and /publisher (see lib/server/browsingEntities.ts) - the
// data has no reliable delimiter to split multi-company credits into
// separate links (some legal names already contain a comma, e.g.
// "Thekla, Inc"), so each field links out as a single page.
const developerSlug = game.developer ? slugify(game.developer) : null;
const publisherSlug = game.publisher ? slugify(game.publisher) : null;

const coverImage = game.cover_url || undefined;
const steamVerticalCover = game.steam_vertical_cover || undefined;
const primaryCoverImage = steamVerticalCover || coverImage;
const heroImage = game.hero_url || undefined;
const wideCoverImage = game.wide_cover_url || undefined;
const gameGenres = Array.isArray(game.genres)
  ? game.genres.filter(Boolean)
  : [];
const steamUrl = getSteamStoreUrl(game.steam_appid);
const igdbUrl = getIgdbGameUrl(game.igdb_slug);

    const daysToPurchase = getDaysBetween(
  game.Release,
  game["Date of Purchase"]
);

const daysToComplete = getDaysBetween(
  game.date_started,
  game["Completion Last Played"]
);

const displayPrice =
  game.Price && !isNaN(Number(game.Price))
    ? `${game.Price} SAR`
    : game.Price || "-";

  const statusStyle =
  status === "Completed"
    ? { backgroundColor: "rgba(34, 211, 238, 0.15)", color: "#67e8f9" }
    : status === "Playing"
      ? { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd" }
    : status === "Dropped"
        ? { backgroundColor: "rgba(248, 113, 113, 0.15)", color: "#fca5a5" }
        : status === "Skipped"
          ? { backgroundColor: "rgba(113, 113, 122, 0.18)", color: "#d4d4d8" }
          : status === "Unplayed"
            ? { backgroundColor: "rgba(250, 204, 21, 0.15)", color: "#fde047" }
            : status === "Wishlist"
              ? { backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#d8b4fe" }
              : { backgroundColor: "#27272a", color: "#e4e4e7" };

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_30%)]" />

      {/* AppNav is already fully self-responsive (its own hidden/lg:flex
          classes), so one shared instance covers both breakpoints instead
          of mounting (and fetching admin status for) two copies. The
          padding here reproduces each breakpoint's original top spacing
          exactly: mobile matched px-4 pt-3, desktop matched px-6 py-12
          (top half); the content wrappers below keep the matching bottom
          half. */}
      <div className="mx-auto max-w-[430px] px-4 pt-3 lg:max-w-6xl lg:px-6 lg:pt-12">
        <AppNav />
      </div>

      <div className="mx-auto hidden max-w-6xl px-6 pb-12 lg:block">
        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[264px_1fr]">
          <div className="w-[264px] self-start">
            <div>
            <div className="relative h-fit overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
  {primaryCoverImage ? (
    <SafeImage
      src={primaryCoverImage}
      alt={game.Title}
      width={264}
      height={396}
      sizes="264px"
      // This and the mobile-block cover below are the same art-direction
      // pattern Next.js recommends for "different image per breakpoint"
      // (next/image can't swap sources by media query on its own): two
      // Image elements, one hidden per breakpoint via CSS. loading="lazy"
      // (not "eager"/priority) on both is what makes that efficient -
      // browsers skip fetching a lazy image whose ancestor is
      // display:none, so only the cover for the active breakpoint is ever
      // downloaded instead of both on every page load.
      loading="lazy"
      className="aspect-[2/3] w-full object-cover"
    />
  ) : (
    <div className="flex aspect-[2/3] items-center justify-center text-4xl font-black text-zinc-600">
      No Image
    </div>
  )}

  {Number(game.Score || 0) > 0 && (
    <span
      className={`absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black ${
        Number(game.Score) >= 76
          ? "bg-emerald-400 text-black"
          : Number(game.Score) >= 60
            ? "bg-yellow-400 text-black"
            : "bg-red-400 text-black"
      }`}
    >
      {game.Score}
    </span>
  )}

  {Number(game["Hours Played"] || 0) > 0 && (
    <span className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
      {formatHours(game["Hours Played"])}h
    </span>
  )}
            </div>

            <GameExternalLinks
              steamUrl={steamUrl}
              igdbUrl={igdbUrl}
            />
            </div>
          </div>

          <div>
            <div className="mb-1">
              <span
                style={{
                  ...statusStyle,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                {status}
{completedRank ? ` • ${completedRank}` : ""}
{scoreRank ? ` • Score ${scoreRank}` : ""}
              </span>
            </div>

                  <div className="relative">
                    <h1 className="mb-1 text-5xl font-bold leading-tight">{game.Title}</h1>
                    <div className="absolute right-0 top-0">
                      <GameHeroActions game={game} />
                    </div>
                  </div>

            <ExpandableGameSummary
              summary={game.summary}
              containerClassName="mb-4 max-w-3xl"
              textClassName="text-lg leading-8 text-zinc-300"
            />

           {gameGenres.length > 0 ? (
  <div className="mb-4 flex flex-wrap gap-2">
    {gameGenres.map((genre: string) => (
      <span
        key={genre}
        className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
      >
        {genre}
      </span>
    ))}
  </div>
) : null}

            {game.developer || game.publisher || game.franchise ? (
  <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-zinc-400">
    <p>
      Developers:
      <span className="text-zinc-200">
        {" "}
        {game.developer && developerSlug ? (
          <Link
            href={`/developer/${developerSlug}`}
            className="hover:text-cyan-300 hover:underline"
          >
            {game.developer}
          </Link>
        ) : (
          "-"
        )}
      </span>
    </p>

    <p>
      Publishers:
      <span className="text-zinc-200">
        {" "}
        {game.publisher && publisherSlug ? (
          <Link
            href={`/publisher/${publisherSlug}`}
            className="hover:text-cyan-300 hover:underline"
          >
            {game.publisher}
          </Link>
        ) : (
          "-"
        )}
      </span>
    </p>

    {franchiseRef ? (
      <p>
        Franchise:
        <span className="text-zinc-200">
          {" "}
          <Link
            href={`/franchise/${franchiseRef.slug}`}
            className="hover:text-cyan-300 hover:underline"
          >
            {franchiseRef.name}
          </Link>
        </span>
      </p>
    ) : null}
  </div>
) : null}

            <RelatedEntries entries={relatedEntries} />
          </div>
        </div>

        <section className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6">
          <h2 className="mb-5 text-2xl font-bold">Library Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <Info label="Release Date" value={formatDisplayDate(game.Release)} />
  <Info label="Purchase Date" value={formatDisplayDate(game["Date of Purchase"])} />
  <Info label="Days to Purchase" value={daysToPurchase} />

  <Info label="Start Date" value={formatDisplayDate(game.date_started)} />
  <Info
    label="Completion / Last Played"
    value={formatDisplayDate(game["Completion Last Played"])}
  />
  <Info label="Days to Complete" value={daysToComplete} />

  <Info label="Price" value={displayPrice} />

  <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
    <p className="text-sm border-zinc-800">Store</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
     
      <span>{game.Store || "-"}</span>
    </div>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
    <p className="text-sm border-zinc-800">Platform</p>

    <div className="mt-2 flex items-center gap-2 font-semibold">
      
      <span>{game.Platform || "-"}</span>
    </div>
  </div>
</div>
        </section>
        {game.screenshots ? (
  <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6">
    <h2 className="mb-5 text-2xl font-bold">Screenshots</h2>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {game.screenshots
        .split(",")
        .map((url: string) => url.trim())
        .filter(Boolean)
        .map((url: string) => (
          <div
            key={url}
            className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800"
          >
            <SafeImage
              src={url}
              alt={`${game.Title} screenshot`}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
    </div>
  </section>
) : null}
      </div>
      <div className="mx-auto max-w-[430px] px-4 pb-10 lg:hidden">
  <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
    {wideCoverImage ? (
  <SafeImage
    src={wideCoverImage}
    alt={game.Title}
    width={430}
    height={242}
    sizes="(max-width: 1023px) 100vw, 430px"
    // See the desktop cover's comment above: lazy (not eager) lets the
    // browser skip this fetch entirely when this block is display:none
    // (i.e. on desktop), instead of always downloading both covers.
    loading="lazy"
    className="aspect-video w-full object-cover"
  />
) : heroImage ? (
  <SafeImage
  src={wideCoverImage || heroImage}
  alt=""
  fill
  sizes="(max-width: 1023px) 100vw, 430px"
  loading="lazy"
  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm"
/>
) : coverImage ? (
  <SafeImage
    src={coverImage}
    alt={game.Title}
    width={430}
    height={242}
    sizes="(max-width: 1023px) 100vw, 430px"
    loading="lazy"
    className="aspect-video w-full object-cover"
  />
) : (
      <div className="flex aspect-video items-center justify-center bg-zinc-900 text-6xl">
        🎮
      </div>
    )}

    <div className="p-4">
      <GameExternalLinks
        steamUrl={steamUrl}
        igdbUrl={igdbUrl}
      />

      <span
        style={{
          ...statusStyle,
          padding: "4px 8px",
          borderRadius: "6px",
          fontSize: "12px",
        }}
      >
        {status}
{completedRank ? ` • ${completedRank}` : ""}
{scoreRank ? ` • Score ${scoreRank}` : ""}
      </span>
      {Number(game.Score || 0) > 0 && (
  <span
    className={`absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black ${
      Number(game.Score) >= 76
        ? "bg-emerald-400 text-black"
        : Number(game.Score) >= 60
          ? "bg-yellow-400 text-black"
          : "bg-red-400 text-black"
    }`}
  >
    {game.Score}
  </span>
)}

{Number(game["Hours Played"] || 0) > 0 && (
  <span className="absolute right-3 top-[calc(56.25vw-50px)] rounded-full border border-cyan-400/40 bg-black/70 px-3 py-1 text-xs font-black text-cyan-300">
    {formatHours(game["Hours Played"])}h
  </span>
)}

      <div className="relative">
        <h1 className="mt-3 text-3xl font-black leading-tight">{game.Title}</h1>
        <div className="absolute right-0 top-0">
          <GameHeroActions game={game} />
        </div>
      </div>

      <ExpandableGameSummary
        summary={game.summary}
        containerClassName="mt-3"
        textClassName="text-sm leading-6 text-zinc-300"
      />

            {gameGenres.length > 0 ? (
  <div className="mt-4 flex flex-wrap gap-2">
    {gameGenres.map((genre: string) => (
          <span
            key={genre}
            className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200"
          >
            {genre}
          </span>
        ))}
  </div>
) : null}

  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
    {game.developer && developerSlug && (
      <p>
        Developers:{" "}
        <span className="text-zinc-200">
          <Link href={`/developer/${developerSlug}`} className="hover:text-cyan-300 hover:underline">
            {game.developer}
          </Link>
        </span>
      </p>
    )}
    {game.publisher && publisherSlug && (
      <p>
        Publishers:{" "}
        <span className="text-zinc-200">
          <Link href={`/publisher/${publisherSlug}`} className="hover:text-cyan-300 hover:underline">
            {game.publisher}
          </Link>
        </span>
      </p>
    )}
    {franchiseRef && (
      <p>
        Franchise:{" "}
        <span className="text-zinc-200">
          <Link href={`/franchise/${franchiseRef.slug}`} className="hover:text-cyan-300 hover:underline">
            {franchiseRef.name}
          </Link>
        </span>
      </p>
    )}
  </div>
  <RelatedEntries entries={relatedEntries} />
  <div className="mt-2 flex flex-wrap items-center gap-2">
  {/* No price (e.g. wishlist games) would render an empty "-" chip here;
      Library Details below already shows the "-". */}
  {displayPrice !== "-" && (
  <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200">
          {displayPrice}
        </span>
  )}

{getIcon(game.Platform) && (
            <span className="rounded-md bg-zinc-800 px-2 py-1">
            <Image
              src={getIcon(game.Platform)!}
              alt=""
              width={16}
              height={16}
              sizes="16px"
              className="h-4 w-4 object-contain"
            />
          </span>
        )}

        {getIcon(game["Hardware (1)"]) && (
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            <Image
              src={getIcon(game["Hardware (1)"])!}
              alt=""
              width={16}
              height={16}
              sizes="16px"
              className="h-4 w-4 object-contain"
            />
          </span>
        )}
      </div>
    </div>
  </div>

  <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
    <h2 className="mb-4 text-xl font-bold">Library Details</h2>

    <div className="space-y-3 text-sm">
      <DetailRow label="Release Date" value={formatDisplayDate(game.Release)} />
      <DetailRow
        label="Purchase Date"
        value={formatDisplayDate(game["Date of Purchase"])}
      />
      <DetailRow label="Days to Purchase" value={daysToPurchase} />
      <DetailRow label="Start Date" value={formatDisplayDate(game.date_started)} />
      <DetailRow
        label="Completion / Last Played"
        value={formatDisplayDate(game["Completion Last Played"])}
      />
      <DetailRow label="Days to Complete" value={daysToComplete} />
      <DetailRow label="Price" value={displayPrice} />
      <DetailRow label="Store" value={game.Store || "-"} />
      <DetailRow label="Platform" value={game.Platform || "-"} last />
    </div>
  </section>

  {game.screenshots ? (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
      <h2 className="mb-4 text-xl font-bold">Screenshots</h2>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {game.screenshots
          .split(",")
          .map((url: string) => url.trim())
          .filter(Boolean)
          .map((url: string) => (
            <div
              key={url}
              className="relative aspect-video w-[260px] shrink-0 overflow-hidden rounded-xl border border-zinc-800"
            >
              <SafeImage
                src={url}
                alt={`${game.Title} screenshot`}
                fill
                sizes="260px"
                className="object-cover"
              />
            </div>
          ))}
      </div>
    </section>
  ) : null}
</div>

    </main>
    
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4">
      <p className="text-sm border-zinc-800">{label}</p>
      <p className="mt-1 font-semibold">{value || "-"}</p>
    </div>
  );
}

function GameExternalLinks({
  igdbUrl,
  steamUrl,
  className = "",
}: {
  igdbUrl?: string | null;
  steamUrl?: string | null;
  className?: string;
}) {
  if (!igdbUrl && !steamUrl) return null;

  return (
    <div className={`mt-2 flex flex-wrap gap-2 ${className}`}>
      {steamUrl ? <ExternalGameLink href={steamUrl} label="Steam" /> : null}
      {igdbUrl ? <ExternalGameLink href={igdbUrl} label="IGDB" /> : null}
    </div>
  );
}

function ExternalGameLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-cyan-400/60 hover:bg-zinc-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      aria-label={`Open ${label} page in a new tab`}
    >
      {label}
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M7 4H4.75A1.75 1.75 0 0 0 3 5.75v9.5C3 16.22 3.78 17 4.75 17h9.5A1.75 1.75 0 0 0 16 15.25V13M11 3h6v6M17 3l-8 8" />
      </svg>
    </a>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value?: string | number | null;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        last ? "" : "border-b border-zinc-800 pb-2"
      }`}
    >
      <span className="text-zinc-400">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}
