# chiching 💸

A gamified expense & wealth manager: quick-add expenses with XP/streaks/badges,
spreadsheet-style drilldown tables (transactions grid + category × month pivot),
and simple tracking for monthly salary, CTC history, and irregular SIP/investment
entries.

## Stack

- Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS
- Prisma 7 ORM against Postgres (works with a local Postgres today; swap
  `DATABASE_URL` for a [Supabase](https://supabase.com) connection string to
  move to the cloud — no schema changes needed)
- TanStack Table for the transactions grid, Recharts for the category chart

## Getting started

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at a Postgres
   instance (a local one is fine — see below — or a free Supabase project).
2. Install deps and set up the database:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

### Local Postgres, if you don't have one

```bash
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE chiching;"
```

### Moving to Supabase

Create a free project and put its **pooled** connection string (Project
Settings → Database → Connection Pooling, port 6543, add `?pgbouncer=true`)
in `DATABASE_URL` for the running app — required for serverless (Vercel)
since the direct-connection hostname is IPv6-only. Then run
`npx prisma migrate deploy` against it once to create the schema.

**Applying migrations against Supabase**: `prisma migrate deploy` needs a
connection that supports DDL/session state properly. The transaction-mode
pooler (port 6543) can hang on it — if that happens, apply new migration
SQL files directly via the Supabase SQL editor/API instead (or point
`prisma migrate deploy` at the session pooler on port 5432 or the direct
connection, from an environment with unrestricted Postgres TCP access).
The Vercel build here intentionally does **not** run migrations
automatically for this reason — schema changes are applied out-of-band,
then just `next build` runs at deploy time.

## App structure

- `/` — dashboard: quick-add form, XP/level/streak, budget vs. spend, badges,
  spend-by-category chart, recent activity
- `/transactions` — full transactions grid: search, filter by category/mood/month,
  sort, delete
- `/monthly` — category × month pivot grid; click a cell to drill into those
  exact transactions
- `/income` — monthly salary log, CTC history, and investment/SIP log with
  YTD invested total

## Gamification rules

Defined in `src/lib/gamification.ts`:

- +10 XP per logged transaction, plus a small streak bonus (capped at +20)
- Streak increments when you log on consecutive days, resets after a gap
- Badges: first log, 3/7/30-day streaks, 50 logs, and "Impulse Radar" for
  the first time you honestly tag a purchase as impulse — the goal is
  awareness, not shame

## Auto-import from bank alert emails

There's no way for any app to read SMS content on iOS (Apple blocks it
entirely, even for automation apps), so capture is built around the
transaction-alert *emails* most banks also send instead.

- `src/lib/bank-alert-parser.ts` — regex-based extraction of amount,
  merchant, card last-4, and date from common Indian bank alert formats
  (HDFC, ICICI, SBI Card, Axis, Kotak, generic UPI), plus a merchant →
  category guess. Skips anything that isn't a debit/spend (OTPs, credits,
  refunds).
- `src/lib/import-alerts.ts` — `importParsedAlerts()`: dedupes on the
  email's message id, auto-inserts a `Transaction` with `isAutoImported: true`
  (these skip XP/streak — that system rewards the habit of opening the app,
  which an email bypasses — but they still count toward totals/badges), and
  is easy to fix in the UI if the category guess is wrong (transactions grid
  has an inline category dropdown, marked with an "auto" badge).
- `scripts/import-alerts.ts` — CLI: `npx tsx scripts/import-alerts.ts <file.json>`
  runs a batch of already-fetched emails (`[{sourceId, subject, body, receivedAt}]`)
  through the pipeline. Fetching the emails themselves happens outside the
  app (e.g. via an assistant with Gmail access) since there's no in-app
  Gmail OAuth yet.
