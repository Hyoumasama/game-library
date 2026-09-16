# Game relationship details UI

Implemented on the existing `/game/[id]` and `/canonical/[id]` routes. The existing canonical graph is read directly; no migration, backfill, new taxonomy route, or existing games-row write is introduced.

## Sections

| Section | Presentation |
|---|---|
| Part of Series | Wrapping badges ordered by primary role if present, then non-null sort order, name and ID. No invented series links. Current series schema provides sort order, not membership role. |
| Franchise | Primary memberships are highlighted; unspecified/hierarchy memberships are neutral; appearances and crossovers use lighter, smaller badges with readable role labels. Direct membership roles override inherited hierarchy labels. |
| Versions & Editions | Compact cards for editions, enhanced editions, remakes and remasters in both directions. Labels include Edition of, Other edition, Remake of and Remastered version. |
| Sequels & Prequels | Previous installment / Next installment, derived from source-to-predecessor direction. Multiple installments sort by release date, unknown dates last; no immediate narrative-continuation claim. |
| Related content | Separate DLC & Expansions, Demos & Previews, and Related Games sections. Prologues and spin-offs appear under Related Games. Collection contents and other supported relationship types are preserved. |
| Owned copies | One entry per mapped library row, with store icon, platform, hardware, status, differing title alias, available version name and purchase date. A canonical without library mappings has no Owned copies section. Related historical cards show Not owned. |

All empty sections are omitted. Related canonical identities render once across sections; multiple relationship labels are retained on their single card. Cards contain available artwork, title, release year and ownership status. Owned cards link to the lowest-ID mapped library entry; historical cards link to the valid existing canonical route.

The layout follows the existing black/zinc/cyan palette, rounded cards, spacing, typography and existing store icon assets. It uses one mobile column, two tablet columns and three desktop columns, wrapping long labels. No UI dependency was added. Existing admin operations remain in a collapsed Manage relationships control and existing identity/membership editors.

## Data architecture

`GameRelationshipsServer` streams through a Suspense boundary in the existing server-rendered pages. It resolves the library mapping, calls `getRelationshipDetail`, and supplies initial data to the existing client management component. Public connections are rendered in server HTML; there is no duplicate relationship API request during hydration. Admin mutations still refresh through the existing API.

The data function reads current canonical identity, copies, series with sort order, franchises with membership role, both edge directions and the version descriptor. Independent reads run concurrently. Ownership and edge reads page in batches of 500 so every mapped copy is included. Related canonicals and their library mappings/artwork are fetched in groups of 100, with paginated mapping reads. The common case uses eight scoped database requests, plus one only when series provide inherited franchise memberships, and a mapping lookup for a library route. Requests scale by batch/page count, not by individual card. There is no full games-table fetch and no per-card query. Existing indexes and existing fresh-read behavior are retained; no persistent cache was added.

`presentation.ts` centralizes direction-aware labels, grouping, stable ordering, deduplication and link destinations. No reverse rows or frontend taxonomy inference are created. Failure of related-data reading produces a recoverable connections fallback while the main game detail remains available. A unit test simulates this failure.

## Files

- `app/game/[id]/page.tsx`, `app/canonical/[id]/page.tsx`: streamed server integration.
- `components/games/GameRelationshipsServer.tsx`: server loading and recoverable failure boundary.
- `components/games/GameRelationshipSections.tsx`: reusable taxonomy, card and owned-copy sections.
- `components/games/GameRelationships.tsx`: server-provided initial state, new public sections and preserved admin tools.
- `lib/server/relationships/data.ts`: scoped batch reads, pagination, membership roles and card artwork/ownership.
- `lib/relationships/model.ts`: additive typed card/copy/membership fields.
- `lib/relationships/presentation.ts`: central presentation rules.
- `tests/relationships/presentation.test.mjs`: rendering, direction, empty sections, roles, deduplication, fallback and a 501-copy pagination fixture with peer-batch assertions.
- `tests/relationships/details-http.mjs`: read-only checks of real pages and Supabase-backed detail APIs.
- `tests/relationships/browser-qa.mjs`: ephemeral headless Playwright/Edge QA, screenshots and overflow assertions.

## Verification

- Unit/component/data tests: 63/63 pass, including 12 added cases.
- Typecheck: pass.
- Lint: zero errors, 42 existing warnings.
- Next.js 16.2.9 production build: pass.
- Read-only HTTP checks: 20 actual identities/pages, including both Stellar Blade full games and demos, all three Kingdom Come cases, Silent Hill original/remake/SH3, DOOM historical/Doom II, Resident Evil historical/remake, Supraland/Crash, F.E.A.R., Ninja Gaiden Master Collection, Wolverine and Nickelodeon All-Star Brawl.
- Semantic API/page regression checks: 17 corrected/revalidated edges and all historical page/copy counts pass.
- Existing public/admin HTTP integration and canonical split regression checks: pass. Synthetic admin fixtures are cleaned up; no existing games are altered.
- Browser checks: seven real game detail pages at 390, 768 and 1440 pixels, plus two historical canonical pages. All relationship panels and card links fit their container without horizontal overflow; no page errors. This assertion covers the new relationship panels, not unrelated pre-existing page sections.

Playwright and Prettier were run temporarily from the npm cache; neither was added to package.json or the lockfile. SQL integration is not required for this UI-only change because no SQL/schema/RPC implementation changed. The existing relationship graph remains intact. The games row count is still 2,234; no games update/insert/delete is present in this implementation.

## Data observations

No new relationship data defect was identified in the tested cases. Existing absent series/franchise memberships stay absent rather than being inferred. The 11 previously documented ambiguous semantic cases remain unchanged. Store/platform/hardware text is displayed as stored, including library aliases; ownership is determined solely by mappings, never by matching a title or external ID. Wishlist/status semantics are not reinterpreted.

A preservation diagnostic found a difference from the earlier semantic-cleanup snapshot in one library row: Nioh 3: Hell Rising, ID 2265, fields completion_last_played, score, price, hours_played, status, store, platform and hardware. The earlier all-row MD5 was 7895409b9f210c42f80dfc80d85f8c26; the current value is 94cf2ca9f671467094f694b20ebc55c2. The UI code only reads games, and the HTTP integration fixtures only write synthetic canonical/taxonomy/review records; none targets this library row. The source/timing of the library edit cannot be established from the old snapshot, so it was preserved rather than overwritten. This report does not claim the old checksum as a baseline captured at the start of the UI task. scripts/relationships/ui-games-diff.mjs reproduces the read-only comparison; complete current row values stay in ignored local data, outside the application fetch path.

## Screenshots

- [Mobile, 390px](screenshots/game-relationships-390.png)
- [Tablet, 768px](screenshots/game-relationships-768.png)
- [Desktop, 1440px](screenshots/game-relationships-1440.png)

The images show the relationship panel within the current game details page. Browser QA results are recorded in `GAME_RELATIONSHIPS_BROWSER_QA.json`.
