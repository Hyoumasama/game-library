# Game Awards implementation review

Branch: `feature/game-awards`. No merge, deployment, or production database writes.

The GOTY showcase supports ceremony years, category anchors, search, winners, and an optional ownership filter. Published awards appear in Game Details, shared game card badges, and the all-time Stats section. Unowned and unlinked nominees appear normally by default. The signed-admin matching queue is at `/goty/review`.

## Verified history

All twelve ceremonies from 2014 through 2025 are verified and published in the checked-in JSON and unapplied seed: **355 categories, 1,773 nomination/recipient entries, and 365 winners/recipient groups**. Winners count as nominations; honorary awards can have multiple recipient groups.

See [the per-year verification report](game-awards-verification-2026-10-08.md), [entry-level evidence](../data/awards/verification/report.json), [source records](../data/awards/verification/sources.json), and [reviewed corrections](../data/awards/verification/corrections.json). Official cached rewind records were prioritized, with contemporary complete nominee lists and separate honorary recipient evidence. Source disagreements and withdrawn nominees are documented by year. Ceremony dates remain null; the verification concerns nomination lists and results.

The read-only inventory contains 2,348 games. Local SQL and JavaScript agree on **734 matched** game-associated award entries and **710 unresolved**, including all **16 reviewed ambiguous matches**. Another 329 entries have no associated nominated game. No game was created and no uncertain match was forced. These are local review results, not production database links.

## Database and publication

Apply only to a development database for review, in order:

1. `supabase/migrations/20261008170017_game_awards.sql`
2. `supabase/migrations/20261008172122_seed_game_awards_history.sql`

Tables: `award_events`, `award_categories`, `award_event_categories`, and `award_entries`. `award_details` is a security-invoker view. RLS is enabled; public direct table/function access is revoked. Server-only service credentials and signed admin cookies follow the existing application architecture. Imports are atomic and idempotent; invalid winners, duplicate keys, and unverified publication are rejected. Existing manual and blocked links survive reimports.

The authenticated `POST /api/admin/awards` accepts a ceremony year and imports only the checked-in verified payload. Its digest must match `verification/publication.json`. After the transaction succeeds, awards, home/library, browsing, and Stats tags expire immediately. Existing manual-link writes use the same invalidation. An optional expected database URL prevents the CLI from using a misconfigured app target.

For CLI dry runs:

```powershell
npm.cmd run awards:import -- data/awards/tga-2025.json
```

For an explicitly selected development database, set `AWARDS_SUPABASE_URL`, `AWARDS_SUPABASE_SERVICE_ROLE_KEY`, `AWARDS_APP_URL`, and `AWARDS_ADMIN_SESSION` (the development app's signed `admin_auth` cookie), then use `--apply`. The CLI uses the authenticated application route to invalidate caches. It never defaults to a production write. The CLI is restricted to payloads in the verified publication manifest.

Regenerate the unapplied seed after a documented source review:

```powershell
node scripts/awards/generate-seed.mjs supabase/migrations/20261008172122_seed_game_awards_history.sql
```

The generator rejects published data changed after verification. `awards:fetch` refuses to overwrite verified history; new research must be staged separately. Applied migrations must receive a subsequent correction migration or an event import, rather than editing already applied history. Direct SQL migration application bypasses application cache invalidation; use the authenticated import route when refreshing an already running app.

Automatic library matching preserves edition, remake, DLC, collection, numeral, and accent distinctions. Duplicate copies resolve only with one fully verified canonical identity and matching title/IGDB identity. An owned copy is preferred; all compatible copies receive the same award through `library_game_ids`. Uncertain entries remain null. Ownership is never inferred from remake or edition relationships.

## Validation

- Five awards tests: matching, Stats, migration/seed repeatability, RLS, atomic rollback, canonical copies, future links, verification digests, and all sixteen unresolved ambiguities.
- All 51 existing regression tests, typecheck, lint, and production build.
- Browser checks at 1440, 768, and 390 pixels: filters, year URLs, category navigation, unowned/unlinked entries, Game Details, badges, Stats, and no horizontal overflow.
- [Publication check](awards-publication-report.json): staged caches were warmed, wrong database/unverified year rejected, 2025 imported into localhost PGlite, and all four surfaces updated on the next request. Owned awards won rose from 146 to 163.

Local browser previews use PGlite on port 4401 and Next on port 4400 with `AWARDS_PREVIEW_BUILD_DIR=.next-awards-preview`. They run beside the user's existing development server. No tests write production Supabase. The seed remains unapplied remotely, as requested.

