# Play Constellations

The existing `/play-pipeline` URL now renders Play Constellations. Games, artwork
(`SafeImage` / `getBestCover`), library search, game detail links and admin sessions
are reused.

## Routes and persistence

- `play_routes` stores names, icons, accents, descriptions, display order,
  creation timestamps and revisions.
- `play_route_games` references existing `games`; membership and positions are
  unique within each route. A game may belong to multiple routes.
- Routes support up to 100 games. SVG curves connect percentage-based slots in
  groups of six, with horizontal overflow and connections between groups.
  Mobile renders a vertical path.
- Explicit route statuses are `upcoming`, `current` and `completed`. Only one
  current game is allowed per route. NEXT is computed visually, skipping completed
  entries. No current status is inferred or written automatically.
- Editing supports pointer and keyboard drag-and-drop through existing
  `@dnd-kit` dependencies, plus arrows. Multi-select additions preserve selection order.
- Details show route status, completion, move/remove actions, platform, playtime,
  genre tags and the ordered route list.

## Migration and security

`20261006152124_play_constellations.sql` was applied to the connected Game Library
Supabase project. The three existing pipeline games were copied in their original
order to **My Pipeline**, with upcoming route status. The original `game_pipeline`
table remains intact as a rollback snapshot; its write RPC rejects old tabs with
PT409 to prevent divergent data.

`mutate_play_route` applies changes atomically and rejects stale revisions with
PT409. Foreign keys, per-route uniqueness and status constraints enforce valid
library membership. Failed saves roll back. Tables use RLS with service-role
access only; the existing admin session is verified by the write API. No new
public database write grants or SECURITY DEFINER functions were added.

If a save succeeds but reloading persisted state fails, further writes are blocked
until refresh to prevent editing against an obsolete revision.

## Verification — 2026-10-06

- Production build and TypeScript passed.
- ESLint passed with 33 existing warnings outside the new code.
- All 44 core tests passed, including route state and ordering cases.
- `scripts/verify-constellations.mjs` verified HTTP authorization, route creation,
  shared game membership, fresh-request persistence, reordering, statuses,
  stale revision rejection, duplicate/non-library game rejection, rollback,
  membership removal, route deletion and page rendering.
- Temporary verification routes were removed; original routes were unchanged.
- Supabase advisors reported no new security warnings for the added function.
  RLS-without-policies informational notices are expected for server-only tables.
- Visual browser QA and pointer interaction checks remain unverified: no connected
  browser was available. The brief contained no reference image.

Run HTTP verification against a production server on port 3100:

```powershell
npm.cmd run start -- --port 3100
node --env-file=.env.local --experimental-strip-types scripts/verify-constellations.mjs
```
