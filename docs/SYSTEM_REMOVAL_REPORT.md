# Game relationship subsystem removal

Completed on 2026-09-17 for Supabase project `odohyafmagygisgvonch` (Nawaf Game Library). The application reads its original `games` data; the game canonical/relationship subsystem has no active tables, functions, triggers, UI, APIs, backfills or tests.

## Database objects removed

| Table | Backed-up rows |
| --- | ---: |
| `canonical_game_franchises` | 612 |
| `canonical_game_series` | 971 |
| `canonical_games` | 2025 |
| `game_franchises` | 225 |
| `game_identity_links` | 2235 |
| `game_relationship_backfill_runs` | 11 |
| `game_relationship_reviews` | 222 |
| `game_relationships` | 192 |
| `game_semantic_cleanup_archive` | 23 |
| `game_series` | 525 |
| `game_versions` | 121 |

Also removed 18 functions, 11 triggers, 34 indexes, 50 constraints, RLS policies/grants belonging to those tables, the owned archive identity sequence and internal TOAST objects. Objects attached to deleted tables disappeared with their tables. Only `link_new_library_game_identity` was removed from the retained `games` table; its original columns/indexes/other triggers remain.

Functions:

- `apply_game_identity_backfill(jsonb)`
- `apply_game_relationship_enrichment(jsonb)`
- `audit_game_relationship_integrity()`
- `audit_game_relationship_integrity_core()`
- `enforce_game_series_exclusions()`
- `game_identity_compatible(uuid, text, bigint, bigint, date)`
- `game_identity_markers(text)`
- `game_identity_title(text)`
- `game_release_class(text)`
- `game_review_fact_key(text, uuid, uuid, text)`
- `game_review_identifiers(uuid, uuid)`
- `game_review_resolution(text, uuid, uuid, text)`
- `link_new_library_game_identity()`
- `prepare_game_relationship_review()`
- `prevent_duplicate_verified_canonical()`
- `reconcile_game_relationship_reviews()`
- `relationship_updated_at()`
- `resolve_game_relationship_review(uuid, boolean, text)`

Triggers:

- `canonical_games.relationship_updated_at`
- `game_versions.relationship_updated_at`
- `game_identity_links.relationship_updated_at`
- `game_franchises.relationship_updated_at`
- `game_series.relationship_updated_at`
- `game_relationships.relationship_updated_at`
- `game_relationship_reviews.relationship_updated_at`
- `games.link_new_library_game_identity`
- `game_relationship_reviews.prepare_game_relationship_review`
- `canonical_games.prevent_duplicate_verified_canonical`
- `canonical_game_series.enforce_game_series_exclusions`

Full index/constraint names are listed in `SYSTEM_REMOVAL_QA.json`.

## Backup and dependency audit

`backups/retired-game-system-20260917/` holds the private, Git-ignored schema/data recovery archive: 11 tables, 7,162 rows, 34 SQL data chunks, table JSON files, a PostgreSQL schema catalog, constraints/indexes/RLS/grants, functions/triggers, sequence state/ACL and `restore.sql`. Every table's exported row count and exact PostgreSQL JSON SHA-256 checksum matched the live database. `manifest.json` records file hashes. No `games` rows or `games` schema are included; retained-table files contain only counts/hashes.

See the backup's `README.md` for transaction-based restoration with psql. A restore into an isolated database was not performed; count/checksum and generated SQL structure were verified. The archive stays on this machine and is not deployed.

No outside foreign keys, public function callers, function callers in other schemas or views depended on the retired objects. The project has no Edge functions and no cron schema/jobs. Remaining catalog dependencies were internal TOAST objects and the owned archive identity sequence. Deletion used explicit object names and `RESTRICT`, never `CASCADE`.

## Library data preservation

Immediately before teardown, after teardown, and after browser QA:

- `games` row count: **2235** at all three checkpoints.
- SHA-256 checksum, full JSON rows ordered by game ID: `5ecb00b4332aef604d38959231ca84a57ec6ad66698f888a8fa14dcd56536968` at all three checkpoints.
- All 16 retained public tables matched their immediate pre-teardown counts/checksums, including achievements, assets, monthly logs, Watch data and original backup tables.
- Hashes for 53 existing public assets and 12 existing screenshots are unchanged.
- This task sent no live INSERT/UPDATE/DELETE to `games`, library data, assets or auth.

**Concurrent-change limitation:** the initial audit recorded `games` checksum `456a7c93923b4d491acbc39be859119b994cd8bb9413bd0f3aeaf21d66feb618`. Before teardown, a concurrent change altered `games` content and added one `game_achievements` row (845 → 846). The task had issued only SELECTs to retained live tables, and CRUD tests used a mocked database. The change was observed before deletion, retained, and documented in the private `concurrent-change.json`. Therefore the task confirms that teardown and QA left `games` unchanged; it does not claim the initial-to-final checksum was identical during concurrent editing.

## Verification

| Check | Result |
| --- | --- |
| Core tests | 10 passed, 0 failed |
| Add/edit/delete/read handlers | Real route handlers with isolated in-memory database; dependent rows and rollback tested |
| Admin UI | Add and Edit dialogs open; Delete confirmation opens and is dismissed |
| Typecheck | Passed after regenerating stale Next.js route types with production build |
| Lint | Passed: 0 errors, 42 pre-existing warnings outside the cleanup |
| Production build | Passed; retired routes absent |
| Game renders | 18 passed: nine game identities at 390px and 1440px; no horizontal overflow |
| Route smoke | 18 passed: 13 existing routes and 5 retired routes returning 404 |
| Runtime | 0 page errors, 0 retired API requests, 0 live database writes; browser writes blocked |
| Supabase catalog | 0 retired tables/functions, 0 identity triggers on games, no archive sequence or remaining function references |

The nine tested games were Kingdom Come: Deliverance, Alan Wake, Alan Wake Remastered, Silent Hill 2 (2001), Silent Hill 2 (2024), Stellar Blade, Supraland, F.E.A.R. and Ninja Gaiden: Master Collection. Existing Home, All Games, Stats, Monthly Log, Assets and Watch pages rendered normally; auth and original game APIs worked.

Initial typecheck errors referenced deleted routes in generated `.next/types/validator.ts`; the production build regenerated those types and subsequent typecheck passed. No source types remained broken.

## Code and configuration changes

Removed all game relationship components and types, canonical/franchise routes, public/admin APIs and admin review pages, data layer, old tests, backfill scripts and 15 creation/enrichment/audit migrations. Deleted the old docs and generated relationship snapshot/plans, including ignored files. Removed the relationships navigation link and Related Entries from both game hero layouts. Original developer/publisher metadata and Add/Edit/Delete controls are preserved.

No relationship-only environment keys existed in `.env.local`; original Supabase/auth/IGDB/SteamGridDB/RAWG variables and Watch configuration were left intact. No dependencies or lockfiles were changed. `npm test` now runs original-library regression tests instead of deleted relationship tests.

Modified files:

- `app/game/[id]/page.tsx`
- `components/AppNav.tsx`
- `package.json`
- `README.md`
- `.gitignore`

Added files:

- `tests/core/setup.mjs`
- `tests/core/database.mjs`
- `tests/core/games-api.test.mjs`
- `tests/core/library.test.mjs`
- `supabase/migrations/20260917152125_retire_game_identity_system.sql`
- `docs/SYSTEM_REMOVAL_REPORT.md`
- `docs/SYSTEM_REMOVAL_QA.json`

Files removed (including previously untracked components/docs and ignored generated snapshots):

- `lib/relationships/client.ts`
- `lib/relationships/compact.ts`
- `lib/relationships/model.ts`
- `lib/relationships/presentation.ts`
- `lib/relationships/relatedEntries.ts`
- `lib/relationships/validation.ts`
- `lib/server/relationships/data.ts`
- `app/canonical/[id]/loading.tsx`
- `app/canonical/[id]/page.tsx`
- `app/franchise/[id]/page.tsx`
- `app/admin/relationships/loading.tsx`
- `app/admin/relationships/page.tsx`
- `app/admin/relationships/RelationshipReviewClient.tsx`
- `app/api/admin/relationships/route.ts`
- `app/api/game-relationships/route.ts`
- `components/games/CanonicalPicker.tsx`
- `components/games/GameCompactMetadata.tsx`
- `components/games/GameRelationships.tsx`
- `components/games/GameRelationshipsServer.tsx`
- `components/games/GameRelationshipSections.tsx`
- `components/games/ManageGameModal.tsx`
- `components/games/OwnedCopiesIndicator.tsx`
- `components/games/RelatedEntries.tsx`
- `scripts/relationships/audit.mjs`
- `scripts/relationships/backfill.mjs`
- `scripts/relationships/cleanup-snapshot.mjs`
- `scripts/relationships/enrich.mjs`
- `scripts/relationships/enrichment-planner.mjs`
- `scripts/relationships/planner.mjs`
- `scripts/relationships/reference-candidates.mjs`
- `scripts/relationships/report.mjs`
- `scripts/relationships/semantic-metadata.mjs`
- `scripts/relationships/semantic-report.mjs`
- `scripts/relationships/semantic-snapshot.mjs`
- `scripts/relationships/ui-games-diff.mjs`
- `tests/relationships/browser-qa.mjs`
- `tests/relationships/cleanup-http.mjs`
- `tests/relationships/compact-browser.mjs`
- `tests/relationships/database.sql`
- `tests/relationships/details-http.mjs`
- `tests/relationships/game-details-browser.mjs`
- `tests/relationships/model.test.mjs`
- `tests/relationships/presentation.test.mjs`
- `tests/relationships/related-entries-browser.mjs`
- `tests/relationships/related-entries.test.mjs`
- `tests/relationships/semantic-http.mjs`
- `tests/relationships/semantic.sql`
- `tests/relationships/semantic.test.mjs`
- `tests/relationships/smoke.mjs`
- `docs/GAME_RELATIONSHIPS.md`
- `docs/GAME_RELATIONSHIPS_BROWSER_QA.json`
- `docs/GAME_RELATIONSHIPS_UI.md`
- `docs/RELATIONSHIP_BACKFILL_REPORT.md`
- `docs/RELATIONSHIP_CLEANUP_AFTER.json`
- `docs/RELATIONSHIP_CLEANUP_BEFORE.json`
- `docs/RELATIONSHIP_CLEANUP_REPORT.md`
- `docs/RELATIONSHIP_INTEGRITY_AUDIT.json`
- `docs/RELATIONSHIP_INTEGRITY_AUDIT.md`
- `docs/RELATIONSHIP_REVIEW_CANDIDATES.json`
- `docs/SEMANTIC_CLEANUP.md`
- `docs/SEMANTIC_CLEANUP_AFTER.json`
- `docs/SEMANTIC_CLEANUP_BEFORE.json`
- `docs/SEMANTIC_RELATIONSHIP_REVIEW.json`
- `docs/GAME_DETAILS_COMPACT_QA.json`
- `docs/GAME_DETAILS_RESTORED_QA.json`
- `docs/RELATED_ENTRIES_DIRECTION_AUDIT.md`
- `docs/RELATED_ENTRIES_QA.json`
- `supabase/migrations/20260916090336_game_relationship_system.sql`
- `supabase/migrations/20260916091210_game_relationship_integrity.sql`
- `supabase/migrations/20260916091406_game_relationship_enrichment.sql`
- `supabase/migrations/20260916091738_game_relationship_review_safety.sql`
- `supabase/migrations/20260916111145_relationship_finalization.sql`
- `supabase/migrations/20260916111421_relationship_integrity_audit.sql`
- `supabase/migrations/20260916111757_relationship_audit_release_years.sql`
- `supabase/migrations/20260916113610_relationship_release_cleanup.sql`
- `supabase/migrations/20260916114036_relationship_cleanup_audit.sql`
- `supabase/migrations/20260916114542_relationship_audit_execution.sql`
- `supabase/migrations/20260916114735_relationship_cleanup_review_decisions.sql`
- `supabase/migrations/20260916161119_game_semantic_cleanup.sql`
- `supabase/migrations/20260916161910_semantic_identity_predicate_fix.sql`
- `supabase/migrations/20260916162252_semantic_original_release_targets.sql`
- `supabase/migrations/20260916162652_historical_identity_reuse.sql`
- `data/relationships/backfill-plan.json`
- `data/relationships/backfill-report.json`
- `data/relationships/cleanup-after.json`
- `data/relationships/cleanup-before.json`
- `data/relationships/enrichment-plan.json`
- `data/relationships/lint-results.json`
- `data/relationships/semantic-after.json`
- `data/relationships/semantic-before.json`
- `data/relationships/semantic-igdb.json`
- `data/relationships/ui-games-current.json`
- `data/relationships/ui-games-diff.json`

## Intentionally retained

- The private recovery archive and this removal report: required backup and evidence.
- `supabase/migrations/20260917152125_retire_game_identity_system.sql`: removal-only migration for review and teardown of other existing environments; it does not create a subsystem.
- Shared Supabase migration history retains its 15 historical subsystem records plus the teardown record for auditing. There are no active subsystem objects. Old subsystem SQL files are deleted locally; this repository's documented workflow uses SQL Editor, not migration-history repair.
- Git history and all 12 screenshots are preserved. Nine screenshots that were previously untracked are committed unchanged so they remain available in future clones.
- Watch's canonical media metadata and media/season relationships belong to the separate Watch feature and are preserved.

## Reviewable commits

- `580a8ff` — remove application relationships and restore library-only pages; add isolated core tests.
- `d3edfc8` — remove obsolete migrations and add the guarded, applied teardown migration.
- The final documentation commit records this report and verification and preserves existing untracked screenshots unchanged.
