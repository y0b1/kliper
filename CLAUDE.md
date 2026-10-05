@AGENTS.md

# Kliper.ph

Barber booking marketplace for Davao (a Peur product). Customers find a shop or barber, pick a package and add-ons, pick a time, and book. Mobile-first website; no native app yet.

## Commands

- `./scripts/setup.sh`: one-time local setup on macOS (Postgres, database, install, migrate, seed, dev server)
- `pnpm dev`, `pnpm build`
- `pnpm test` (Vitest), `pnpm typecheck`, `pnpm lint`
- `pnpm build:demo` builds the static barber demo (`/demo` served at "/", no database) into `.next-demo/`; `pnpm deploy:demo` builds and deploys it to the `kliper-demo` Cloudflare Worker (kliper-demo.peur.ph). Demo-only route files end in `.demo.tsx`.
- `pnpm db:deploy` applies migrations, `pnpm db:seed` reloads sample data (wipes existing rows), `pnpm db:generate` regenerates the Prisma client

Run `pnpm test` and `pnpm typecheck` after changing anything in `src/lib/`.

## Stack notes

- Next.js 16 App Router. Page `params` and `searchParams` are async; type pages with the global `PageProps<"/route">` helper. Read the bundled docs in `node_modules/next/dist/docs/` before using an API you're unsure of.
- Prisma 7. Client is generated into `src/generated/prisma` (gitignored) and connects through `@prisma/adapter-pg`; config lives in `prisma.config.ts`. Import the client from `@/lib/db`.
- The init migration ends with hand-written SQL: a `btree_gist` exclusion constraint (`Booking_no_overlap`) so Postgres itself rejects overlapping PENDING/CONFIRMED bookings for one barber, plus a check that `endsAt > startsAt`. Prisma can't express these. Never drop them when creating or squashing migrations.
- Tailwind v4 with tokens in `src/app/globals.css` (`@theme`). Fonts are self-hosted via `@fontsource`; no external font requests.

## Conventions

- Money is stored in centavos (`priceCentavos`). Format with `peso()` from `src/lib/money.ts`.
- Time zone is Asia/Manila (UTC+8, no daylight saving). Schedules are minutes from local midnight. Use the helpers in `src/lib/time.ts`, never the server's local time.
- `src/lib/slots.ts` is the slot engine: pure functions, fully tested. Booking length = package minutes + add-on minutes. Home-service bookings get the barber's travel buffer on both sides.
- `src/lib/theme/` is the barber page theme system, ported from slate.ph: 8 presets, tokens validated with Zod on write, stale tokens fall back to defaults on read, contrast corrected automatically. Barbers choose values; they never write CSS.
- A visitor's location for "Near me" is used for one search and never stored, logged, or put in a URL. A home-service map pin is stored only on that booking.
- Checkout and the booking confirmation always use Kliper's own look, even inside a themed barber page.
- Server actions live in `src/server/actions.ts`; data loading in `src/server/barbers.ts` and `src/server/directory.ts`.

## Design

Plaster-grey walls, walnut signboards for shop names only, barber-pole red (`#b8322b`) for actions and blue (`#23407a`) for "open" status. Big Shoulders Display for shop names, prices and times; Instrument Sans for everything else. Times are the hero element. Avoid all-caps labels and generic rounded-card grids.

## Routes

- `/` directory: free chairs today, barbershops (photo, name, rating, area; barbers are named only on the shop page), independent barbers
- `/shop/[slug]` shop page, `/[slug]` barber page and booking flow, `/booking/[code]` confirmation
- `/dashboard?barber=<slug>` barber dashboard (development preview)
- `/demo` practice shop builder for barbers: cuts, add-ons, barbers, chairs and theme with a live preview. Client-only; the draft lives in the visitor's localStorage and never reaches the server.

Barber pages live at the root, so reserve `shop`, `dashboard`, `booking`, `demo` and other top-level route names when barber sign-up exists.

## Not built yet

- SMS sign-in and one-time codes (Semaphore). Bookings currently trust the typed phone number.
- The dashboard has no auth: its actions refuse to run in production unless `KLIPER_DEV_DASHBOARD=1`. Never set that on a public deployment.
- PayMongo GCash checkout. Deposit bookings are saved with payment pending.
- SMS confirmations and reminders, reference photo and portfolio uploads, shop photo and logo uploads, a map view, "first available barber" on shop pages.
- Leaving a review. `Review` rows exist (one per completed booking, seeded); a shop's rating is the mean of its barbers' ratings (`src/lib/ratings.ts`).
- Paid ads or featured placement are intentionally off.
