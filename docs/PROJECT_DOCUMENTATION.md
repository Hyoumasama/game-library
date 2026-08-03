# Game Library Project Documentation

## Overview

Game Library is a personal media-tracking application built with Next.js, React, Tailwind CSS, and Supabase. The primary feature set tracks a video game collection, including game metadata, ownership details, play status, playtime, completion dates, achievements, screenshots, cover art, purchase price, platforms, hardware, stores, genres, and yearly statistics.

The project also includes a watch library for movies, TV, anime, OVAs, local holdings, episode ownership, and assisted imports from TMDB and AniList. A smaller assets section tracks hardware, subscriptions, and services related to the library.

The application is server-heavy: most public pages load their initial data in server components through the Supabase service-role client, while client components provide filtering, modals, admin actions, responsive navigation, and interactive review workflows.

## Technology Stack

- Next.js `16.2.9`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Supabase JavaScript client `@supabase/supabase-js`
- ESLint `9` with `eslint-config-next`
- CSV import tooling through `csv-parse`
- External metadata sources:
  - IGDB for game metadata
  - Steam and SteamGridDB for Steam app IDs and image assets
  - RAWG for fallback game metadata
  - TMDB for movie and TV metadata
  - AniList for anime metadata

Important local instruction: this repository uses a newer Next.js version with changed APIs and conventions. Before changing Next.js-specific behavior, read the relevant files under `node_modules/next/dist/docs/`.

## Repository Layout

```text
app/
  Next.js App Router pages and API route handlers.

components/
  Shared React components, page clients, modals, navigation, image handling,
  and game-specific UI pieces.

lib/
  Supabase client, game mapping and formatting utilities, metadata clients,
  admin auth, and server-side data loading modules.

scripts/
  One-off and repeatable import/export/backfill scripts.

scripts/watch/
  Watch-library import tooling for local inventory summaries, match review,
  and import item creation.

supabase/migrations/
  SQL migrations for database functions, indexes, watch-library schema,
  monthly log RPCs, distributed playtime, and performance improvements.

public/
  Static CSV seed data and local image/icon assets for platforms, hardware,
  achievements, and default Next.js assets.

tools/
  Exported source data and helper scripts for Exophase, Steam, and achievement
  import work.
```

## Runtime Configuration

Create `.env.local` in the project root. The README lists the baseline values:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
STEAMGRIDDB_API_KEY=
RAWG_API_KEY=
TMDB_READ_ACCESS_TOKEN=
```

`TMDB_READ_ACCESS_TOKEN` is required by the watch import and TMDB lookup flow. It is used in `lib/server/watch/tmdb.ts`.

`ADMIN_SESSION_SECRET` is used to sign admin cookies. If it is missing, `ADMIN_PASSWORD` is used as the fallback signing secret.

The application uses `SUPABASE_SERVICE_ROLE_KEY` on the server. Treat this project as trusted-server code. Do not expose that key to browser-side code or public environment variables.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build production output:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Package Scripts

`npm run dev`

Starts the Next.js development server.

`npm run build`

Creates a production build.

`npm run start`

Starts the built production app.

`npm run lint`

Runs ESLint across the project.

`npm run watch:match-preview`

Runs `scripts/watch/buildMatchReview.ts` with the project loader. It creates a review set for matching local watch-library inventory to TMDB and AniList candidates.

`npm run watch:build-holdings`

Runs `scripts/watch/buildLocalHoldings.ts`. It builds local holdings data from local watch inventory inputs.

`npm run watch:import-items`

Runs `scripts/watch/importWatchItems.ts`. By default it is a dry run that writes preview files. Add `--apply` when the script should upsert valid rows into Supabase.

## Application Routes

### `/`

Home page for the game library.

Data is loaded by `getHomeGames()` in `lib/server/homeGames.ts`. The route is dynamic and disables revalidation:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

The home page shows:

- Wishlist games, split into upcoming and already available by comparing `release` to today's date.
- Currently playing games.
- Recently added games.
- Recently completed games.

The UI is rendered by `components/HomePageClient.tsx`.

### `/all-games`

Paginated and filterable game browser.

Server data is loaded by `getGamesLiteData()` in `lib/server/gamesLite.ts`. The page accepts search params for:

- `search`
- `status`
- `store`
- `release`
- `completion`
- `genre`
- `sort`
- `page`
- `playHistory`

The page size defaults to `GAMES_LITE_PAGE_SIZE`, currently `24`.

Supported sort keys include:

- `default`
- `hours-high`
- `hours-low`
- `completion-newest`
- `completion-oldest`
- `score-high`
- `score-low`
- `release-newest`
- `release-oldest`
- `recently-added`

The `never-played` play-history filter narrows results to `Unplayed` games and excludes games whose `igdb_id` has already been completed elsewhere in the library.

The page is rendered by `components/AllGamesClient.tsx`.

### `/game/[id]`

Detailed game view.

Data is loaded through `getGameById()` in `lib/games.ts`, then mapped with `mapDbGameToUiGame()` from `lib/gameMappers.ts`.

The page displays:

- Primary cover art.
- Wide or hero imagery on mobile.
- Title and summary.
- Status, score rank, and completion rank.
- External IDs for IGDB and Steam.
- Genres, developers, and publishers.
- Release, purchase, start, and completion dates.
- Days from release to purchase.
- Days from start to completion.
- Price, store, platform, and screenshots.
- Admin game actions through `GameHeroActions`.

The page has separate desktop and mobile layouts.

### `/stats`

Yearly stats and visual summaries.

The stats page combines several data sources:

- `monthly_play_logs` for modern tracked years.
- `games.completion_last_played` for archive years before monthly logging.
- `game_hour_distributions` for distributed estimated hours.
- `get_stats_years()` RPC for available years.
- `get_distributed_game_hours()` RPC for generated monthly estimates.

The code defines `MONTHLY_LOG_START_YEAR = 2024`. Years from 2024 onward are based primarily on monthly logs. Earlier years use archive/completion data and distributed estimates where available.

The page calculates:

- Total playtime.
- Monthly totals.
- Top games.
- Device and platform usage.
- Genre mix.
- Completion counts.
- Purchase impact.
- New discoveries.
- Release-year mix.
- Highest-rated completions.

### `/monthly-log`

Monthly playtime log view.

Data comes from the `monthly_play_logs` table joined with `games` for cover art. The page groups rows by month and summarizes:

- Total hours for the selected year.
- Unique games played.
- Most played game.
- Highest-playtime month.

Admin users can add and delete monthly logs. Writes go through `/api/monthly-logs`, which calls the Supabase RPCs:

- `insert_monthly_play_log`
- `delete_monthly_play_log`

### `/watch`

Watch-library overview for anime, TV, movies, and OVAs.

Data is loaded by `getWatchLibrary()` from `lib/server/watch/library.ts`. The client UI receives:

- Library items.
- Distinct watch statuses.
- Aggregate stats for total works, anime, TV, movies, and owned episodes.

Filters include:

- Type.
- Search.
- Status.
- Sort.

The page is dynamic and disables revalidation.

### `/watch/[id]`

Watch media detail page.

The route validates that `id` is a positive integer, then calls `getWatchMediaDetails()`. Missing or invalid records return `notFound()`.

The detail payload includes:

- Library entry.
- Media metadata.
- Seasons.
- Episodes.
- Episode ownership flags.
- Ownership percentages.

### `/assets`

Hardware, subscriptions, and services inventory.

Data is read from `library_assets`. The page splits records into:

- Hardware, when `type` is `hardware`.
- Subscriptions/services, when `type` is `service` or `subscription`.

The page also exposes `AddAssetModal`.

### `/admin-login`

Password-based admin login form.

Successful login calls `/api/admin/login`, which creates a signed `admin_auth` cookie.

### `/admin`

Redirects to `/admin-login`.

### `/admin/watch-import`

Admin-only watch import review UI.

The page checks the signed admin cookie server-side before rendering. It is backed by `/api/admin/watch/import-items/*` route handlers and the matching helpers under `lib/server/watch`.

## Navigation and Shared UI

`components/AppNav.tsx` is the main navigation shell. It renders:

- Back button on non-home pages.
- Global game search.
- Links to Home, All Games, Watch, Stats, Monthly Log, and Assets.
- Admin login/logout button.
- Add Game modal when the user is admin.
- Responsive mobile menu.

The Watch nav item is intentionally hidden on non-home pages.

`components/SafeImage.tsx` is used where remote images may fail or where image handling needs a safer wrapper around Next's image component.

## Admin Authentication

Admin authentication is intentionally simple and local to this app.

`lib/adminAuth.ts` defines:

- Cookie name: `admin_auth`
- Session max age: 7 days
- Session format: `issuedAt.signature`
- Signature algorithm: HMAC SHA-256 through Web Crypto
- Timing-safe signature comparison

`/api/admin/login` validates the submitted password against `ADMIN_PASSWORD`. On success, it sets the signed cookie.

`/api/admin/logout` deletes the cookie.

`/api/admin/me` returns whether the current request is admin-authenticated.

`proxy.ts` protects:

- `/api/admin/:path*`, except login and me.
- POST and DELETE requests to `/api/monthly-logs`.
- `/admin-login` redirect behavior for already logged-in users.

Some admin watch import routes also perform explicit cookie checks inside the route handler.

## Data Model

The project relies on Supabase tables and functions. Not all base table creation is present in this repository, but the application clearly expects the following main tables.

### `games`

Core game-library table.

Important columns used throughout the app:

- `id`
- `title`
- `slug`
- `release`
- `date_started`
- `date_of_purchase`
- `completion_last_played`
- `skipped_at`
- `score`
- `price`
- `hours_played`
- `status`
- `store`
- `platform`
- `hardware`
- `genres`
- `cover_url`
- `hero_url`
- `wide_cover_url`
- `steam_vertical_cover`
- `summary`
- `screenshots`
- `developer`
- `publisher`
- `igdb_id`
- `steam_appid`

Known statuses include:

- `Completed`
- `Playing`
- `Currently Playing`
- `Unplayed`
- `Skipped`
- `Dropped`
- `Wishlist`

`202607233_add_skip_status.sql` adds `skipped_at` and a trigger to maintain it when status changes.

### `game_achievements`

Stores achievement information per game.

Important columns:

- `game_id`
- `bronze`
- `silver`
- `gold`
- `platinum`
- `earned_awards`
- `total_awards`
- `earned_points`
- `completion_percentage`
- `last_played_utc`
- `source_title`
- `platform`
- `playtime`

The UI derives an achievement badge:

- `100completion` when completion percentage is at least 100.
- `platinum` when platinum is present.
- `null` otherwise.

### `monthly_play_logs`

Stores manually tracked playtime by game, month, and year.

Important columns:

- `log_id`
- `game_id`
- `title`
- `hours`
- `month`
- `year`
- `created_at`

Writes should go through RPC functions instead of direct client-side mutations:

- `insert_monthly_play_log`
- `delete_monthly_play_log`

These RPCs keep related game fields consistent.

### `library_assets`

Tracks hardware and services.

Important columns:

- `id`
- `type`
- `category`
- `name`
- `brand`
- `purchase_date`
- `price`
- `market`
- `image_url`
- `status`
- `notes`

### `game_hour_distributions`

Supports estimated historical playtime distribution.

Created by `20260730_create_game_hour_distributions.sql`. Used by the stats page for years where monthly logs are unavailable or incomplete.

Important fields include:

- Game identity.
- Start and end month.
- Distribution strategy and guards.
- Estimated hour output through `get_distributed_game_hours()`.

### Watch Library Tables

`20260725_create_watch_schema.sql` creates the base watch schema:

- `watch_media`
- `watch_seasons`
- `watch_episodes`
- `watch_library_entries`
- `watch_files`

`watch_media` stores canonical metadata such as title, media type, format, TMDB ID, AniList ID, MAL ID, posters, backdrops, scores, genres, studios, and total episode counts.

`watch_seasons` stores season-level metadata.

`watch_episodes` stores episode metadata.

`watch_library_entries` stores personal watch status, score, progress, dates, rewatch count, and notes.

`watch_files` stores local file metadata and relationships to media, seasons, and episodes.

Additional migrations add:

- `watch_source_links`, which connects media or seasons to external sources.
- `watch_import_items`, which stages local inventory records for review.
- `watch_owned_episodes`, which stores which episodes are owned for a library entry.

## Supabase Migrations

Migration files live in `supabase/migrations`.

Key migrations:

- `202607081_stats_performance.sql`
  - Adds indexes for stats queries.
  - Adds `get_stats_years()`.
  - Adds `get_games_lite_stats()`.

- `202607191_navigation_performance.sql`
  - Adds indexes for title search, genre filtering, release sorting, and completion-hour lookups.

- `202607231_monthly_log_atomic_insert.sql`
  - Adds `insert_monthly_play_log()`.

- `202607232_monthly_log_atomic_delete.sql`
  - Adds `delete_monthly_play_log()`.

- `202607233_add_skip_status.sql`
  - Adds skipped-status support and a trigger for `skipped_at`.

- `20260725_create_watch_schema.sql`
  - Creates the watch-library base schema and related indexes.

- `20260726_add_watch_source_links.sql`
  - Adds source-link records and validation for season/media relationships.

- `20260726_create_watch_import_items.sql`
  - Adds the staging table for watch imports.

- `20260726_confirm_watch_import_match.sql`
  - Adds an early version of the watch import confirmation RPC.

- `20260727_watch_owned_episodes.sql`
  - Adds episode ownership tracking and an expanded confirmation RPC.

- `20260730_add_distributed_hours_stats.sql`
  - Adds distributed-hour stats behavior.

- `20260730_add_games_igdb_status_index.sql`
  - Adds an index for `igdb_id` and status queries.

- `20260730_create_game_hour_distributions.sql`
  - Creates distributed-hour configuration records.

- `20260801_stats_years_and_distribution_guards.sql`
  - Updates distributed-hour logic and available stats-year calculation.

Apply migrations in chronological order through Supabase SQL Editor or the project's chosen Supabase migration process.

## API Routes

### Public and Shared Routes

`GET /api/home-games`

Returns the same home data used by `/`.

`GET /api/games-lite`

Returns paginated and filtered game-browser data. Query params mirror `/all-games`.

`GET /api/games`

Returns a simple list of games from the `games` table.

`GET /api/search-games`

Searches games by title for navigation/search UI.

`GET /api/game-options`

Returns distinct stores, platforms, and hardware values from `games`.

`GET /api/monthly-log-games?q=...`

Searches games suitable for monthly log creation. Excludes skipped games.

`POST /api/monthly-logs`

Admin-only. Inserts a monthly log through `insert_monthly_play_log`.

`DELETE /api/monthly-logs?id=...`

Admin-only. Deletes a monthly log through `delete_monthly_play_log`.

`GET /api/igdb-cover`

Looks up cover information from IGDB-related helpers.

### Admin Game Routes

`POST /api/admin/games`

Creates a game and upserts its achievement row. Payloads are normalized by `buildGamePayload()` and `buildAchievementPayload()`.

`GET /api/admin/games/[id]`

Returns a game plus achievement details for editing.

`PATCH /api/admin/games/[id]`

Updates game data and upserts achievement data.

`DELETE /api/admin/games/[id]`

Deletes dependent achievement and monthly-log rows first, then deletes the game.

`GET /api/admin/game-options`

Returns admin option lists through `get_admin_game_options`.

`GET /api/admin/owned-games`

Returns owned-game groupings for admin workflows.

### Admin Metadata and Backfill Routes

`GET /api/admin/igdb-search`

Searches IGDB for candidate game metadata.

`GET /api/admin/steam-search`

Searches Steam-related records.

`GET /api/admin/steamgriddb-search`

Searches SteamGridDB and IGDB image sources.

`GET /api/admin/igdb-sync`

Syncs local games with IGDB metadata.

`POST /api/admin/backfill-covers`

Backfills game covers.

`POST /api/admin/backfill-wide-covers`

Backfills wide cover images through SteamGridDB.

`POST /api/admin/backfill-steam-appids`

Backfills Steam app IDs using IGDB external-game data.

### Admin Assets Route

`GET /api/admin/assets`

Returns asset options/data for asset administration.

`POST /api/admin/assets`

Creates a library asset.

### Watch Import Routes

`GET /api/admin/watch/match-preview`

Runs a server-side preview of watch-title matching.

`GET /api/admin/watch/import-items`

Lists staged watch import items.

`GET /api/admin/watch/import-items/[id]`

Returns one staged import item.

`GET /api/admin/watch/import-items/[id]/candidate`

Loads a candidate preview for a staged item.

`GET /api/admin/watch/import-items/[id]/search`

Manually searches TMDB or AniList candidates for a staged item.

`GET /api/admin/watch/import-items/[id]/season`

Loads TMDB season details for review.

`POST /api/admin/watch/import-items/[id]/confirm`

Confirms a staged match and calls `confirm_watch_import_match`.

## Data Mapping Conventions

The database uses snake_case column names. Some UI components still expect historical spreadsheet-style names. `lib/gameMappers.ts` bridges this mismatch.

Examples:

- `title` maps to `Title`.
- `store` maps to `Store`.
- `platform` maps to `Platform`.
- `hardware` maps to both `Hardware` and `"Hardware (1)"`.
- `score` maps to `Score`.
- `hours_played` maps to `"Hours Played"`.
- `release` maps to `Release`.
- `date_of_purchase` maps to `"Date of Purchase"`.
- `completion_last_played` maps to `"Completion Last Played"` and `"Completion / Last Played"`.
- `steam_vertical_cover` or `cover_url` maps to `Cover`.
- `wide_cover_url` maps to `"Wide Cover"`.

When adding new code, prefer snake_case for database records and map only at UI boundaries.

## External Metadata Integrations

### IGDB

IGDB access is handled by `lib/igdb.ts` and admin routes such as:

- `/api/admin/igdb-search`
- `/api/admin/igdb-sync`
- `/api/admin/backfill-steam-appids`
- `/api/admin/steamgriddb-search`

Required env vars:

- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`

IGDB authentication uses Twitch OAuth.

### SteamGridDB

Used for richer game artwork, especially wide covers.

Required env var:

- `STEAMGRIDDB_API_KEY`

### RAWG

`lib/rawg.ts` exposes `getRawgGame(title)`.

Required env var:

- `RAWG_API_KEY`

### TMDB

Used for movies and TV in the watch library.

Required env var:

- `TMDB_READ_ACCESS_TOKEN`

TMDB requests use a one-day Next.js fetch revalidation window in the helper layer.

### AniList

Used for anime search and details. AniList requests are GraphQL calls and do not require a project-specific API key in the current implementation.

## Import and Backfill Workflows

### Import Games from CSV

Script:

```bash
node scripts/import-games.js
```

Input:

```text
public/games.csv
```

Behavior:

- Loads `.env.local`.
- Deletes all rows from `games`.
- Inserts mapped records in chunks of 500.

This is destructive for the `games` table.

### Import Assets from CSV

Script:

```bash
node scripts/import-assets.js
```

Input:

```text
assets.csv
```

Behavior:

- Loads `.env.local`.
- Deletes all rows from `library_assets`.
- Inserts mapped asset records.

This is destructive for the `library_assets` table.

### Import Achievements

Dry run:

```bash
node scripts/import-achievements.mjs
```

Apply:

```bash
node scripts/import-achievements.mjs --apply
```

Input:

```text
tools/achievements_refined.csv
```

Behavior:

- Validates numeric game IDs.
- Fails if duplicate game IDs exist.
- Converts Exophase-style playtime text to hours.
- Converts timestamps to database-friendly format.
- In apply mode, deletes and replaces all `game_achievements` rows.

### Import Date Started

Scripts:

- `scripts/preview-date-started-import.mjs`
- `scripts/import-date-started.mjs`

Input:

```text
date_started.csv
```

These scripts preview and apply `date_started` updates to existing game rows.

### Watch Import Items

Script:

```bash
npm run watch:import-items
```

Dry-run inputs and outputs:

- Reads `data/watch-import/watch_library_summary.csv`.
- Writes `data/watch-import/watch_import_items_preview.json`.
- Writes `data/watch-import/watch_import_items_preview.csv`.

Apply:

```bash
npm run watch:import-items -- --apply
```

Apply mode upserts valid records into `watch_import_items` by `source_key`.

### Watch Match Review

Script:

```bash
npm run watch:match-preview
```

This generates review data for matching local watch inventory titles against TMDB and AniList.

### Watch Holdings Build

Script:

```bash
npm run watch:build-holdings
```

This builds local holdings from watch inventory inputs.

## Image Configuration

Remote images are allowed in `next.config.ts` for:

- `images.igdb.com`
- `cdn.cloudflare.steamstatic.com`
- `shared.akamai.steamstatic.com`
- `shared.cloudflare.steamstatic.com`
- `steamcdn-a.akamaihd.net`
- `cdn2.steamgriddb.com`
- `i.playground.ru`

If new external image providers are introduced, add their hostnames to `images.remotePatterns`.

## Styling and UI Conventions

The app uses Tailwind CSS classes directly in components and pages. The dominant UI style is dark, dense, and image-forward:

- Black or near-black page backgrounds.
- Zinc borders and panels.
- Cyan highlights for emphasis.
- Poster and cover art as primary visual anchors.
- Responsive layouts with separate mobile treatments for complex pages.

Common component patterns:

- Server page loads initial data.
- Client component handles filters, modals, state, and optimistic UI.
- Admin controls are hidden unless `/api/admin/me` confirms admin status.

## Caching and Dynamic Rendering

Several routes explicitly opt into dynamic rendering:

- `/`
- `/watch`
- `/watch/[id]`
- `/api/home-games`

These routes use:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

External API helper functions may still use Next.js fetch revalidation internally, such as TMDB and AniList lookups.

## Security Notes

- The Supabase service-role key is used server-side. Never expose it to client components.
- Admin auth is password and signed-cookie based. It is suitable for a personal app, not a multi-user permission system.
- Admin API routes are protected by `proxy.ts`.
- Monthly log writes have both proxy protection and route-level `requireAdmin()` checks.
- Some scripts are destructive and replace entire tables. Run dry-run or preview modes before apply modes whenever available.
- CSV import scripts trust local files. Validate source CSVs before running destructive imports.

## Testing and Verification

There is no dedicated test runner configured beyond linting and production builds.

Recommended checks after changes:

```bash
npm run lint
npm run build
```

For data-affecting work:

- Verify required Supabase migrations have been applied.
- Exercise the affected page locally.
- For admin flows, log in at `/admin-login`.
- For import scripts, run dry-run modes before `--apply`.

For watch import work:

- Generate preview files.
- Review validation notes.
- Resolve duplicates and invalid rows.
- Confirm matches in `/admin/watch-import`.

## Development Guidelines

When adding or changing code:

- Keep database reads in server components or server helper modules when possible.
- Keep client components focused on browser interaction and UI state.
- Normalize incoming admin payloads in helper functions before writing to Supabase.
- Use existing mapping helpers for game records instead of duplicating UI field aliases.
- Prefer RPCs for operations that need to update multiple related rows atomically.
- Add database indexes when a new query path filters or sorts large tables.
- Update this documentation when adding routes, tables, migrations, scripts, or required environment variables.

## Known Maintenance Notes

- `README.md` is intentionally concise. This file is the detailed project reference.
- There is a legacy-looking route at `app/admin/games/route.ts` in addition to the primary `/api/admin/games` route. Prefer the `/api/admin/games` API surface unless intentionally maintaining the older path.
- Some UI files contain historical spreadsheet-style field names. Use `lib/gameMappers.ts` as the boundary between database names and UI names.
- Some files contain mojibake-like characters in rendered symbols or copied text. Be careful when editing these files to avoid accidental unrelated encoding churn.
- The Supabase migrations in this repo do not appear to include the original creation of every game-library table. Confirm the live database baseline before rebuilding a fresh database from only these migrations.
