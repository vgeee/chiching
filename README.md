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

Create a free project, grab the connection string (Project Settings →
Database → Connection string → URI), and put it in `DATABASE_URL`. Then run
`npx prisma migrate deploy` against it once to create the schema.

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
