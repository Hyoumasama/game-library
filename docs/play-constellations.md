# Play Constellations

The existing `/play-pipeline` URL now renders Play Constellations. Games, artwork
(`SafeImage` / `getBestCover`), library search, game detail links and admin sessions
are reused.

## Routes and persistence

- `play_routes` stores names, icons, accents, descriptions, display order,
  creation timestamps and revisions.
- `play_route_games` references existing `games`; membership and positions are
  unique within each route. A game may belong to multiple routes.
- Routes support up to 100 games. Vertical route cards sit side by side in a
  responsive grid, expanding to show every game without internal scrolling. SVG curves
  connect vertical slots in groups of six, including connections between groups.
  Mobile renders a vertical path.
- Routes are collections, with no required play sequence or automatically chosen
  next game. Visual states are current, completed and normal. Existing stored
  `upcoming` values map to normal; the database schema is unchanged. Library
  Playing/Completed states are also reflected visually, without writing them back.
- Editing supports pointer and keyboard drag-and-drop through existing
  `@dnd-kit` dependencies, plus arrows. Multi-select additions preserve selection order.
- Details show route status, completion, move/remove actions, platform, playtime,
  genre tags and an unnumbered collection list. Positions are retained internally
  for visual arrangement only; drag-and-drop does not imply play priority.

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

## Visual refinement

Nodes and SVG connections derive their tint from the saved `--route-color`.
Current nodes use silver/white, completed nodes use gold, and normal nodes use
the route accent. Each SVG connection is white if either endpoint is current,
otherwise gold if either endpoint is completed, otherwise the route accent.
This also applies across six-node groups. A
single SVG glow filter is reused within each group. Only current nodes and their
adjacent line glows breathe gently over 3.2 seconds; reduced-motion disables all
decorative animation and transitions.

Cover heights were restored to the original dimensions at the user's request.
There is no outer frame around the cover and title; glow and selection outlines
apply to the cover only. Hover scales to 1.03 without changing layout geometry.

All 51 tests pass, including real component rendering for all three visual states,
five saved accent colors, selection, local hover emphasis, unique filter IDs,
and state handling across groups. A five-game fixture verifies gold, white,
white, route-accent segments without hovering and moving-light overlays only
on current segments. Fixtures do not write database data. Browser visual checks, motion and
performance measurements remain unavailable without a connected browser.
