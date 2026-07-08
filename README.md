# Game Library

A personal game library built with Next.js, Supabase, and Tailwind CSS. It tracks purchases, completion dates, playtime, scores, platforms, covers, achievements, monthly logs, and yearly stats.

## Setup

Create `.env.local` with:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
STEAMGRIDDB_API_KEY=
RAWG_API_KEY=
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run build
npm run lint
npm run backfill:genres
```

## Supabase

SQL migrations live in `supabase/migrations`.

When a migration changes, run its SQL in the Supabase SQL Editor, then rebuild the app.

Current performance migration:

```text
supabase/migrations/202607081_stats_performance.sql
```

## Notes

- Admin routes are protected by the `admin_auth` signed cookie.
- Public pages read through server-side Supabase calls.
- `all-games` uses `get_games_lite_stats` for filtered dashboard stats.
- `stats` uses monthly logs for 2024+ and completion dates as archive mode for years before 2024.
