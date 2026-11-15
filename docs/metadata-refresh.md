# Refresh Metadata

Admins can open **More → Refresh Metadata** in the Games navigation on desktop or mobile.

Choose one or more sources, a library scope, a release window, and an update mode. Preview reads the complete library in stable pages and freezes the matching game IDs for the run. Upcoming and unknown release dates can be included separately from the past release window. “Owned” means a nonempty status other than Wishlist.

- Game Metadata refreshes release date, summary, genres, developer, publisher, IGDB slug, cover, hero and screenshots using the saved IGDB ID. Unlinked games are reported as skipped; the job does not guess an IGDB match. Adult genre markers and existing Steam screenshots for Adult games are preserved.
- HLTB uses the saved HLTB ID when available, otherwise the existing title/year matcher. Locked times are excluded and the lock is checked again when saving.
- Metacritic uses the existing title/year lookup with Steam fallback, storing its score in the library’s existing `score` field. Source links appear in results; there is no new URL column.

“Fill empty fields only” applies to individual fields. “Refresh all selected fields” can replace existing values. Neither mode clears stored data when a source returns an empty value. Missing-only writes also check that the fields have not changed during the lookup.

The browser processes one game per request, retaining progress and per-source results in the dialog. Keep the tab open. Stop finishes the current game, then stops sending requests. HLTB rate limits stop the run immediately. Successful writes invalidate the game caches and refresh the visible page. The API checks the admin session in addition to the existing proxy protection. No schema migration is needed.

Verification:

```powershell
npm.cmd run test:metadata
npm.cmd run typecheck
# With a local server on port 3000 and Microsoft Edge installed:
node tests/metadata/ui-check.mjs
```

The UI check intercepts all refresh requests with fixtures, so it does not update library data.
