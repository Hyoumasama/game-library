# Play Pipeline

Superseded by [Play Constellations](play-constellations.md). The notes below
describe the legacy implementation retained as a migration snapshot.

Route: `/play-pipeline`. Uses the existing `games` library, `getBestCover`,
`SafeImage`, game detail route, navigation, and admin session.

- Public read access through server routes; writes require the existing admin cookie.
- Up to 15 games, each assigned a percentage-based slot by priority.
- SVG brain and curved connections; HTML game nodes. Mobile uses a priority path.
- Editing uses @dnd-kit pointer and keyboard sensors, with arrow controls as an alternative.
- Add searches only `games`, with pagination and duplicate prevention.
- Saves are atomic through `save_game_pipeline`, with expected-order conflict detection.
- RLS enabled; table and RPC access restricted to the server service role.
- The replacement DELETE is bounded to valid slots for the project's safeupdate extension.
- PT409 conflicts avoid PostgREST serialization retries. Failed saves restore the previous UI order.

Validation on 2026-10-06:

- Production build and TypeScript passed.
- ESLint passed with 33 existing warnings outside the new components.
- All 41 existing core tests passed.
- Supabase transactional checks verified add, reorder, removal, empty state and duplicates.
- Local production HTTP checks verified library lookup, admin authorization,
  empty/populated rendering, add, reorder and persistence on fresh requests.
- Original empty pipeline restored after testing; no example games seeded.
- Browser visual and pointer interaction QA could not run: no connected browser surface.
- The attachment contained the written brief only; no reference image was available.
