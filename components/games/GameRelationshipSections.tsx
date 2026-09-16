import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { getIcon } from "@/lib/gameIcons";
import type { RelationshipDetail } from "@/lib/relationships/model";
import {
  gameDestination,
  groupRelationships,
  sectionTitles,
  sortMemberships,
  type RelationshipCard,
} from "@/lib/relationships/presentation";

const badge =
  "inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-sm break-words";
function GameConnectionCard({ card }: { card: RelationshipCard }) {
  const { game } = card;
  return (
    <Link
      href={gameDestination(game)}
      className="group flex min-w-0 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-cyan-300/50 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md bg-zinc-800">
        {game.cover_url ? (
          <SafeImage
            src={game.cover_url}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full items-center justify-center text-xl text-zinc-500"
          >
            —
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 self-center">
        <h4 className="break-words text-sm font-bold leading-snug text-zinc-100 group-hover:text-cyan-200">
          {game.title}
        </h4>
        <p className="mt-1 break-words text-xs leading-relaxed text-zinc-400">
          {card.labels.join(" · ")}
          {game.release_date ? ` · ${game.release_date.slice(0, 4)}` : ""}
        </p>
        <span
          className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${game.owned_count ? "bg-cyan-400/10 text-cyan-200" : "bg-zinc-800 text-zinc-400"}`}
        >
          {game.owned_count ? "Owned" : "Not owned"}
        </span>
      </div>
    </Link>
  );
}
function CardSection({
  title,
  cards,
}: {
  title: string;
  cards: RelationshipCard[];
}) {
  if (!cards.length) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <GameConnectionCard key={card.game.id} card={card} />
        ))}
      </div>
    </section>
  );
}
export function GameSeriesSection({ detail }: { detail: RelationshipDetail }) {
  if (!detail.series.length) return null;
  return (
    <section aria-label="Part of Series">
      <h3 className="mb-3 text-base font-bold">Part of Series</h3>
      <div className="flex flex-wrap gap-2">
        {sortMemberships(detail.series).map((s) => (
          <span
            key={s.id}
            className={`${badge} border-cyan-400/20 bg-cyan-400/5 font-semibold text-cyan-100`}
          >
            {s.name}
          </span>
        ))}
      </div>
    </section>
  );
}
export function GameFranchiseSection({
  detail,
}: {
  detail: RelationshipDetail;
}) {
  if (!detail.franchises.length) return null;
  return (
    <section aria-label="Franchise">
      <h3 className="mb-3 text-base font-bold">Franchise</h3>
      <div className="flex flex-wrap gap-2">
        {sortMemberships(detail.franchises).map((f) => {
          const role = f.membership_role || "unspecified",
            primary = role === "primary",
            secondary = role === "appearance" || role === "crossover";
          return (
            <span
              key={f.id}
              data-membership-role={role}
              className={`${badge} ${primary ? "border-cyan-400/30 bg-cyan-400/10 font-bold text-cyan-100" : secondary ? "border-zinc-800 bg-transparent text-xs text-zinc-400" : "border-zinc-700 bg-zinc-900 text-zinc-200"}`}
            >
              {f.name}
              {role !== "unspecified" && (
                <span className="text-[10px] font-normal capitalize opacity-70">
                  {role}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
export function GameOwnedCopiesSection({
  detail,
}: {
  detail: RelationshipDetail;
}) {
  if (!detail.copies.length) return null;
  return (
    <section aria-label="Owned copies">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base font-bold">Owned copies</h3>
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {detail.copies.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.copies.map((c) => (
          <Link
            key={c.id}
            href={`/game/${c.id}`}
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-cyan-300/50 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <p className="flex items-center gap-2 break-words text-sm font-bold">
              {getIcon(c.store) && (
                <SafeImage
                  src={getIcon(c.store)!}
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0 object-contain"
                />
              )}
              {c.store || "Library copy"}
            </p>
            <p className="mt-1 break-words text-xs text-zinc-400">
              {[c.platform, c.hardware, c.status].filter(Boolean).join(" · ")}
            </p>
            {c.title !== detail.canonical.title && (
              <p className="mt-2 break-words text-xs text-zinc-300">
                {c.title}
              </p>
            )}
            {c.version_label && (
              <p className="mt-2 break-words text-xs text-cyan-200">
                {c.version_label}
              </p>
            )}
            {c.date_of_purchase && (
              <p className="mt-2 text-xs text-zinc-500">
                Purchased {c.date_of_purchase.slice(0, 10)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
export default function GameRelationshipSections({
  detail,
}: {
  detail: RelationshipDetail;
}) {
  const groups = groupRelationships(detail);
  return (
    <div className="min-w-0 space-y-7">
      {!!(detail.series.length || detail.franchises.length) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <GameSeriesSection detail={detail} />
          <GameFranchiseSection detail={detail} />
        </div>
      )}
      {Object.entries(groups).map(([key, cards]) => (
        <CardSection
          key={key}
          title={sectionTitles[key as keyof typeof groups]}
          cards={cards}
        />
      ))}
      <GameOwnedCopiesSection detail={detail} />
    </div>
  );
}
