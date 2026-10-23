# ApartmentBookings

Bilingual (Bulgarian / English) direct-booking website for a holiday apartment, with an admin area
for the owner.

- **Public site:** a homepage with a photo carousel, a property overview, a gallery with a lightbox, contact and privacy pages.
- **Booking:** a live availability calendar, instant server-side pricing, and either Stripe Checkout or "request to book".
- **Admin (Bulgarian):** dashboard, reservations (confirm, cancel/refund, manual bookings), calendar blocking,
  pricing and seasons, photo management, homepage/property content editor, iCal sync (Airbnb, Booking.com) and an email log.
- **Demo mode:** runs locally with zero credentials. Data is stored in `.demo-data/`, and payments and emails are simulated.

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000, which redirects to `/bg` or `/en` based on the browser language.
Admin: http://localhost:3000/admin/login with user **`admin`** and password **`demo-admin-2026`**. These demo
credentials only work in demo mode, and only in a production build when `DEMO_MODE=true` is set.

To reset the demo data, delete the `.demo-data/` folder.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Vitest): pricing, availability, iCal, auth, i18n, validation, booking/Stripe lifecycle |
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build in demo mode. Run `npm run build` first |
| `npm run hash-password -- "passphrase"` | Generates `ADMIN_PASSWORD_HASH` |

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, Supabase (Postgres + Storage), Stripe
Checkout, Resend (HTTP API), Zod, Vitest, Playwright.

## Project layout

```
src/
  app/[locale]/…           public pages (bg, en)
  app/admin/(auth)/login   admin login
  app/admin/(panel)/…      admin pages; app/admin/actions.ts = all admin server actions
  app/api/…                quote, Stripe webhook, iCal export, cron sync, demo media
  components/{site,booking,admin}
  i18n/{bg,en}.ts          dictionaries (en must match bg's keys — enforced by TS and tests)
  lib/pricing.ts           pricing engine (pure)
  lib/availability.ts      availability rules (pure)
  lib/booking-service.ts   booking creation, Stripe Checkout, payment reconciliation
  lib/data/                repository interface + Supabase and demo implementations
  lib/ical.ts              iCal parser/generator; lib/calendar-sync.ts imports feeds
  proxy.ts                 locale redirects + admin session check
supabase/config.toml       Supabase CLI / GitHub integration config
supabase/migrations        SQL schema (RLS, double-booking exclusion constraint) + starter content
supabase/tests             SQL checks for the constraints
tests/unit, tests/e2e
```

For production setup, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. For development status, see
**[PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)**.
