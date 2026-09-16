# Game relationship system

The live Supabase schema was audited before implementation: 2,234 ownership rows, bigint game IDs, title and slug required, RLS enabled on games with public SELECT only. Existing migration files and games CRUD were inspected. The project uses handwritten database types rather than generated Supabase types.

## Model

- `games`: existing purchases/library copies. All existing fields, IDs, achievements, logs, and CRUD remain intact.
- `canonical_games`: a specific release identity, independent of ownership. External identifiers are indexed but deliberately not unique so bad/disputed metadata can remain separate for review. Titles are not unique identifiers.
- `game_identity_links`: one canonical identity per owned row, with matching provenance and numeric confidence. Many ownership rows can share an identity.
- `game_versions`: edition/remake/remaster descriptors for a canonical release. An edition that represents a distinct release has its own canonical identity and an edition relationship to the original. A composite FK prevents a library link from selecting another identity's version descriptor.
- `game_series`: a series, optionally belonging to a franchise. Membership supports manual sort order and multiple series per game.
- `game_franchises`: broad franchises, with independent many-to-many game membership. Franchise membership also displays through a series' parent franchise.
- `game_relationships`: directed canonical-to-canonical facts. Never ownership-copy endpoints and never a `same_game` edge.
- `game_relationship_reviews`: private pending/approved/rejected proposals with reasons, identifiers, confidence, and resolution timestamps.
- `game_relationship_backfill_runs`: private historical execution reports.

Ownership deletion cascades only its identity link. Canonical identities can outlive ownership. Relationships restrict endpoint deletion. Memberships and version descriptors cascade when their canonical identity is deliberately removed. Franchise deletion is restricted while series reference it. Deleting a relationship never deletes games.

## Direction and inverse display

The source is the derived release and the target is the original: Requiem `sequel_of` Innocence, Alan Wake Remastered `remaster_of` Alan Wake, Iceborne `expansion_of` World. A collection is the source of `collection_contains`; the contained game is the target.

One row produces both displays through `relationshipLabel`: Requiem shows "Sequel to: Innocence" and Innocence shows "Sequel: Requiem". A unique expression index also rejects `A sequel_of B` plus `B prequel_of A`, and reversed duplicate `related_to` edges, including concurrent inserts. Unique source/target/type constraints reject all identical edges. Self references and unknown relationship types are rejected by the database and API.

All 15 supported types are defined in `lib/relationships/model.ts`. No redundant reverse rows are created.

## Security and application access

The existing application authenticates administrators with its signed `admin_auth` cookie, not Supabase user sessions. New public metadata tables grant SELECT only to anon/authenticated and use explicit public SELECT RLS policies. The queue and execution reports have no client grants/policies intentionally; only service_role can access them. Writes pass through `/api/admin/relationships`, where both the existing proxy and route handlers enforce admin authentication. Browser writes check Origin when supplied. Service/secret keys stay server-only. Mutation RPCs use SECURITY INVOKER, a fixed empty search_path, and EXECUTE grants only to service_role.

`lib/server/relationships/data.ts` loads copies, memberships, incoming/outgoing relationships, and version metadata in a bounded number of batched queries. It fetches endpoints and inherited franchises using IN queries, not a query per game. FK indexes cover both traversal directions and membership lookups. Canonical search uses normalized title prefix matching and an indexed column. Search returns 50 results, the queue uses stable pages of 30, taxonomy pickers return up to 1,000 entities, and detail lists return up to 500 copies/edges per identity. These bounds cover the current library; pagination should be extended if an individual identity exceeds those limits.

## Using the interface

Open a game detail page to see its canonical identity, library copies, edition descriptor, series, franchises, and related games. Clicking a related game opens `/canonical/[id]` with one canonical view and its linked library copies. Administrators can add/edit/remove relationships, choose either endpoint, change type/confidence/evidence, rename a canonical identity, or relink an owned copy. Deletion requires confirmation.

"Manage series & franchises" creates taxonomies, adds/removes memberships, sets sort order, and assigns an existing series to a parent franchise. IGDB collections populate series, IGDB franchises populate franchise memberships. A shared franchise does not imply a sequel relationship. Parent franchise hierarchy is assigned explicitly in the admin interface rather than inferred from names.

`/admin/relationships` is the authenticated review queue, also linked in admin navigation. Review the identifiers and full evidence before approving an identity consolidation. Approving identity review moves library mappings only; canonical metadata is retained, and consolidation is blocked if the source already has relationships or memberships so no graph facts are lost. Historical unused canonical records remain available. When two releases are actually editions/remakes or belong to a bundle, reject the identity proposal and add the appropriate relationship instead. Approval/rejection is atomic with the resulting relationship/mapping changes and locks the review row, preventing double decisions.

## Backfill and enrichment

The four new migration files beginning `2026091609` have already been applied to the current project in order. On another deployment, apply these migration files after its existing games schema. The legacy repository migrations were originally applied outside recorded migration history; do not blindly replay them on the live project.

```powershell
npm.cmd run relationships:preview
npm.cmd run relationships:backfill
npm.cmd run relationships:enrich-preview
npm.cmd run relationships:enrich
npm.cmd run relationships:report
```

Preview commands write local plans under ignored `data/relationships/`. They make no database changes. Apply commands regenerate the plan, then apply it atomically through service-only RPCs. Reads paginate past Supabase's default row limit. Game snapshots are checked before identity backfill; metadata changes abort stale plans. An advisory transaction lock serializes identity backfills and new ownership matching. Reruns preserve manual links, existing identities, and accepted/rejected review decisions, with deterministic IDs/candidate keys and conflict handling. Future ownership inserts receive identity links atomically: a single exact identifier/title/year match is reused; otherwise a separate identity is created. Rerun preview/backfill periodically to surface new ambiguous groups for review.

Identity matching uses exact positive IGDB IDs first, then Steam IDs for rows without IGDB, partitioned by normalized full title and release year. Different titles, edition naming, release years, conflicting IGDB IDs sharing Steam IDs, demos, bundles, and playtests remain separate. Similar titles alone never consolidate ownership. Missing-identifier rows receive independent identities. Numeric confidence uses 1.0 for deterministic identifier/copy assignment, 0.95 for externally verified facts, and lower values for inference. Match provenance includes igdb_exact, steam_exact, import, and manual.

Suffix recognition proposes version relationships at 0.8; numbered-title narrative proposals use 0.65. User-provided reference examples are review-only proposals at 0.9 and live in tooling, never UI code. Only explicit IGDB relationship fields with unique locally matched identities, exact names/alternative names, and compatible release years are accepted at 0.95. Edition parent names must also match the stripped edition base. Ambiguous external metadata remains review-only at 0.85. Verified records reference games already present in the canonical layer; enrichment does not create unowned external catalog entries. IGDB enrichment uses batched queries, timeouts, and a request rate below its documented limit. A failed metadata request aborts before any writes. It never manufactures sequels from franchise membership.

Explicit rejections remain authoritative. Enrichment can downgrade only untouched facts it inserted when current evidence is suspicious; manually edited facts are retained. Matching pending heuristic reviews are resolved only after a verified fact exists. See the [IGDB field reference](https://api-docs.igdb.com/#game) and [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Preservation and rollback

Existing `games` rows remain the ownership history and are never merged, deleted, or rewritten by these backfills. Identity review approval changes only the mapping layer. Prefer preserving current behavior whenever normalization would require changing ownership records. Ambiguous cases remain review proposals.

Application commits can be reverted in reverse order with `git revert`. The additive database tables can remain while the interface is disabled; reverting Git commits does not undo already-applied Supabase migrations. If disabling automatic linking is needed, use a separate migration to disable the new ownership-insert trigger. Do not drop or rewrite `games` or remove ownership history as part of rollback.

## Verification and report

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
# With a local production server on port 3001 (or RELATIONSHIP_TEST_URL set):
npm.cmd run test:relationships:smoke
```

The unit suite covers identity creation, duplicate ownership mapping, Steam matching, ambiguous identifiers/releases, preserving mappings on rerun, relationship validation, inverse display, sequel/remaster/expansion/edition labels, verified IGDB matching, and franchise separation. `tests/relationships/database.sql` asserts uniqueness (including inverse duplicates), deletion, approval/rejection/double resolution, automatic ownership mapping, version-link FK consistency, and private API grants inside a rolled-back transaction. Run it through the Supabase SQL interface or a disposable test database. HTTP smoke tests exercise authenticated/unauthenticated reads, canonical search, taxonomy loading, creating/editing/deleting relationships, duplicate rejection, inverse lookup, and review approval; isolated synthetic records are cleaned up in finally.

Typecheck, unit tests, SQL integration tests, HTTP smoke tests, and production build were executed successfully. Repository lint passes with existing warnings; all new relationship files lint cleanly. Browser automation is unavailable in this environment, so interactive visual checks on mobile/desktop were not performed. Existing security advisor warnings outside the new schema remain outside this change; the queue/report RLS-with-no-policy informational findings are intentional.

The current counts and all 34 ambiguous identity pairs are in [RELATIONSHIP_BACKFILL_REPORT.md](RELATIONSHIP_BACKFILL_REPORT.md). All 155 pending decisions are in [RELATIONSHIP_REVIEW_CANDIDATES.json](RELATIONSHIP_REVIEW_CANDIDATES.json). Refresh the report command after review decisions to update these snapshots.
