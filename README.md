# Kliper.ph

Book your barber in Davao: shop barbers, solo barbers and home-service cuts. A Peur product.

## Run it locally

On a Mac, one command does everything below (installs Postgres with Homebrew if it's missing, creates the database, seeds it and starts the app):

```bash
./scripts/setup.sh
```

Or step by step. You need Node 20+, pnpm, and PostgreSQL 14+ (Postgres.app or `brew install postgresql@16`).

```bash
createdb kliper                      # or create it in Postgres.app
cp .env.example .env                 # then edit DATABASE_URL if needed
pnpm install                         # also runs prisma generate
pnpm db:deploy                       # applies prisma/migrations
pnpm db:seed                         # sample Davao shops and barbers (all made up)
pnpm dev
```

Open http://localhost:3000. The barber dashboard is at `/dashboard`; switch barbers from the
"Development" note at the top. It has no sign-in yet, so its actions refuse to run in production
unless `KLIPER_DEV_DASHBOARD=1` is set. Don't set that on a public deployment.

## Checks

```bash
pnpm test        # slot engine, theme system, geo and phone helpers
pnpm typecheck
pnpm lint
pnpm build
```

## How it fits together

| Path | What it is |
| --- | --- |
| `prisma/schema.prisma` | Data model. Money in centavos, schedules in minutes from Manila midnight. |
| `prisma/migrations/…_init` | Includes a hand-written exclusion constraint so the database itself rejects overlapping live bookings for one barber. |
| `src/lib/slots.ts` | Slot engine: schedule ∩ shop hours − bookings (with travel buffers) − time off, on a 15-minute grid. Pure and tested. |
| `src/lib/theme/` | Barber page themes, ported from slate.ph: 8 presets, validated tokens, automatic contrast, a reduced "card chrome" for the directory. |
| `src/lib/geo.ts` | Near-me distance math. A visitor's position is used for one search and never stored or put in a URL. |
| `src/server/` | Data loading and server actions (search, availability, booking, dashboard). |
| `src/app/[slug]` | Barber page, themed by the barber. Checkout stays in Kliper's look. |
| `src/app/dashboard` | Barber dashboard: today's chair, requests, package prices and durations, page theme. |

## Not built yet

- SMS sign-in and one-time codes (Semaphore). Bookings currently trust the phone number typed in.
- GCash checkout (PayMongo). Bookings with a deposit are saved as payment pending.
- SMS confirmations and reminders.
- Reference photo uploads, portfolio photos, reviews.
- A map view and address pins on a map (pins come from the browser's location for now).
