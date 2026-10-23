# PROJECT_PROGRESS.md — ApartmentBookings

> Persistent progress log. **Read this first when resuming a session.**
> Statuses: `Not started` · `In progress` · `Completed` · `Blocked`.
> "Completed" means implemented **and** verified (tests / build / manual run), not just UI present.

_Last updated: 2026-10-23 — Supabase project being created through Vercel; repo prepared for the Supabase GitHub integration_

---

## 1. Project overview

**Objective.** A bilingual (Bulgarian / English) direct-booking website for a holiday apartment:
public marketing pages (homepage carousel, property overview, gallery), a guest booking flow with
live availability and server-side pricing, online payment, email notifications, external calendar
synchronisation (Airbnb / Booking.com iCal), and a password-protected admin area to manage
reservations, prices, media and homepage content.

**Repositories.**
| Role | Repository | Branch |
|------|------------|--------|
| Target | `AleksKstd/ApartmentBookings` (started empty) | `claude/stoic-volta-s2maxz` |
| Reference | `AleksKstd/classy-beautiful` (salon booking site, Next.js 14 + Supabase) | read-only reference |

**Technology stack.**
- Next.js 16.4 (App Router, Turbopack, `src/proxy.ts`), React 19, TypeScript (strict)
- Tailwind CSS 3.4 with custom design tokens; lucide-react icons; no component library
- Supabase (Postgres + Storage) via `@supabase/supabase-js`; service-role key used **server-side only**
- Stripe Checkout + webhook (`stripe` SDK)
- Email via the Resend HTTP API (no SDK); falls back to a stored email log
- Zod 4 validation; Vitest (unit); Playwright (end-to-end)

**Main architecture decisions.**
1. **Repository pattern with two back-ends** (`src/lib/data/`). `SupabaseRepository` is used when
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. Otherwise `DemoRepository` is used:
   seeded and file-backed in `.demo-data/db.json`. In production, demo mode requires an explicit `DEMO_MODE=true`.
2. **Next.js 16 instead of the reference repo's Next 14.2.** 14.2.x has many unpatched critical
   advisories. With 16.4.2, `npm audit --omit=dev` reports 0 vulnerabilities.
3. **i18n through a `/[locale]` segment** (`bg` is the default, plus `en`). `proxy.ts` redirects using the cookie,
   then Accept-Language. Dictionaries are typed: `en.ts` must match the keys of `bg.ts`. The admin UI is Bulgarian only.
4. **Single root layout.** `<html lang>` comes from an `x-locale` request header set by the proxy. The language
   switcher does a full page load so `lang` and metadata stay correct.
5. **Pricing and availability are pure functions** (`lib/pricing.ts`, `lib/availability.ts`).
   Quotes are always recomputed on the server when a booking is created. Money is stored as integer cents, in EUR.
6. **Double-booking prevention** works at three levels:
   - the client calendar
   - a server-side re-check
   - a Postgres `EXCLUDE USING gist (daterange(check_in, check_out) WITH &&) WHERE status <> 'cancelled'`
7. **Booking lifecycle:**
   - Without Stripe: `pending` → admin confirms → `confirmed`.
   - With Stripe: `awaiting_payment` holds the dates for at least 32 minutes. The Checkout session expires 1 minute
     before the hold. When paid, the webhook (or a reconcile on the confirmation page) sets the booking to `confirmed`
     and its payment to `paid`.
8. **Admin auth:** `ADMIN_USERNAME` plus an `ADMIN_PASSWORD_HASH` (scrypt), and an HMAC-signed 12-hour session cookie.
   The session is verified in `proxy.ts` and again in the panel layout and every server action. Login is rate-limited.
9. **Guest booking page** (`/[locale]/booking/confirmation/[ref]?t=…`) is protected by a 192-bit access token.
10. **Photos:** in demo mode they go through a server action. With Supabase, the browser uploads to Storage through
    a signed URL, and the server then verifies the bytes. This avoids Vercel's 4.5 MB body limit.

**Current implementation phase:** Phase 1 complete. All features are implemented and verified locally.
Remaining work: live verification with real Supabase, Stripe and Resend
credentials.

---

## 2. Development checklist

| # | Area | Status | Notes / verification |
|---|------|--------|----------------------|
| 1 | Repository analysis | Completed | Reference studied. Its weak points are avoided here: hard-coded admin credentials, unsigned session cookie, permissive RLS, Next 14 CVEs. |
| 2 | Application architecture | Completed | See §1. Typecheck, lint and build are clean. |
| 3 | Design system | Completed | Tailwind tokens (sea, sand, clay, ink), component classes in `globals.css`, serif/sans pairing with Cyrillic support, reduced-motion support. Reviewed on desktop and mobile screenshots. |
| 4 | Public website pages | Completed | Home, apartment, gallery, booking, confirmation, contact, privacy, 404, sitemap, robots. Covered by e2e tests. |
| 5 | Homepage carousel | Completed | Autoplay, pause/play, prev/next, dots, swipe, pause on hover/focus, honours reduced motion, ARIA carousel pattern. Covered by e2e test. |
| 6 | Property overview | Completed | Facts, description, times, house rules, amenities, OpenStreetMap embed. Admin-editable. |
| 7 | Image gallery | Completed | Grid plus a `<dialog>` lightbox with keyboard navigation and focus return. Covered by e2e test. |
| 8 | Bulgarian translations | Completed | `src/i18n/bg.ts` plus Bulgarian guest emails. Unit test checks for no empty strings. |
| 9 | English translations | Completed | `src/i18n/en.ts`. Unit tests check that keys and placeholders match Bulgarian. |
| 10 | Language switching | Completed | Header switcher keeps the current path and remembers the choice in a cookie. Accept-Language redirect. e2e tested. |
| 11 | Mobile responsiveness | Completed | Mobile menu; one-month calendar on mobile. e2e (Pixel 7) checks for no horizontal overflow on 5 pages. Screenshots reviewed. |
| 12 | Guest booking system | Completed | Server action with honeypot, rate limiting, Zod validation and preserved form values. Request and Stripe modes. Unit and e2e tested. |
| 13 | Availability calendar | Completed | Blocks occupied nights, minimum stay (including per season), booking window, same-day turnover. e2e tested. |
| 14 | Pricing engine | Completed | Base and weekend rates, seasons, extra guests, cleaning fee, weekly and monthly discounts, minimum and maximum stay. 9 unit tests. |
| 15 | Admin authentication | Completed | scrypt hash, HMAC session, proxy plus layout plus action guards, rate limit. e2e covers wrong password, forged cookie and dotted paths. |
| 16 | Admin dashboard | Completed | Pending requests, arrivals, 30-day occupancy, monthly revenue, recent bookings. |
| 17 | Reservation management | Completed | List with filter and search; detail view; confirm, cancel (with optional Stripe refund and guest email), mark paid, notes, resend email, manual booking. e2e covers confirm. |
| 18 | Media management | Completed (demo); Supabase path untested live | Upload with magic-byte checks, alt text in BG and EN, carousel and gallery toggles, reorder, delete. e2e covers demo uploads. The signed-URL direct upload needs a live Supabase project to verify. |
| 19 | Homepage content editor | Completed | Bilingual hero, intro, highlights (add/remove), location and CTA, plus a property info editor. e2e: an edit appears on the site. |
| 20 | Database migrations | Completed | `supabase/migrations/20261020000000_initial_schema.sql` (idempotent) and `20261020000100_starter_content.sql`, laid out for the Supabase CLI and GitHub integration (`supabase/config.toml`). **Verified on PostgreSQL 16:** the exclusion constraint, RLS denying `anon`, and `reorder_media`. The seed was run twice. See `supabase/tests/`. |
| 21 | Supabase integration code | Completed in code; **not run against a live Supabase** | `SupabaseRepository` implements the same interface as the demo store, which is fully tested. The SQL is verified; PostgREST and Storage calls are untested without credentials. |
| 22 | Stripe integration code | Completed in code; unit-tested with Stripe mocked; **not run against Stripe test mode** | Checkout session, webhook with signature check, reconcile, abandon/retry, refunds. Unit tests cover paid, expired, late payment and idempotency. |
| 23 | Email notification code | Completed (logging path verified); **Resend sending needs an API key** | HTML and text templates with escaping, in the guest's language. The owner is notified. Email log in admin. e2e checks the logged emails. |
| 24 | External calendar synchronization | Completed (parser/export verified); **live feed fetch untested** | iCal parser (folding, DATE and DATE-TIME, cancelled events) and generator. Import per feed, token-protected export, cron endpoint, `vercel.json`. Unit and e2e tests. |
| 25 | Local demonstration mode | Completed | Zero-config `npm run dev`. Demo banner, seeded content and SVG photos, demo admin credentials. |
| 26 | Security review | Completed | See §3 "Security review findings". |
| 27 | Code self-review | Completed | See §3 "Code review findings". |
| 28 | Automated tests | Completed | 49 unit tests (Vitest), 20 e2e tests (Playwright, desktop and mobile). All passing. |
| 29 | Production build | Completed | `next build` passes with no warnings. All routes are dynamic except robots and sitemap. |
| 30 | Deployment documentation | Completed | `README.md`, `docs/DEPLOYMENT.md`, `.env.example`, `scripts/hash-password.mjs`. |

---

## 3. Completed work

### Features implemented
Everything in the checklist above. Public URLs:
- `/bg`, `/en`
- `/{locale}/apartment`, `/gallery`, `/booking`, `/booking/confirmation/{ref}?t=`, `/contact`, `/privacy`

Admin URLs:
- `/admin` (dashboard)
- `/admin/bookings`, `/admin/bookings/new`, `/admin/bookings/{id}`
- `/admin/calendar`, `/admin/pricing`, `/admin/media`, `/admin/content`, `/admin/sync`, `/admin/emails`

API routes:
- `POST /api/quote`
- `POST /api/stripe/webhook`
- `GET /api/calendar/export?token=`
- `GET /api/cron/sync-calendars` (bearer token)
- `GET /api/media/{file}` (demo uploads only)

### Important files
- **Domain:** `src/lib/{types,dates,pricing,availability,ical,validation,image-sniff}.ts`
- **Services:** `src/lib/booking-service.ts`, `email.ts`, `calendar-sync.ts`, `stripe.ts`, `site.ts`
- **Auth:** `src/lib/auth/{session,password,admin}.ts`, `src/proxy.ts`, `src/lib/rate-limit.ts`
- **Data:** `src/lib/data/{repository,demo-repository,supabase-repository,defaults,index}.ts`
- **UI:**
  - `src/components/site/*` (header, footer, hero carousel, gallery, facts, amenities)
  - `src/components/booking/*` (calendar, widget, auto-refresh)
  - `src/components/admin/*` (form kit, sidebar, media uploader, UI helpers)
- **Admin actions:** `src/app/admin/actions.ts`
- **Database:** `supabase/config.toml`, `supabase/migrations/*.sql`, `supabase/tests/*`

### Tests completed (final run, session 1)
- `npm run lint`: clean
- `npm run typecheck`: clean
- `npm test`: **49 passed** across 8 files
  - pricing (9), availability/dates (8), iCal (6), auth/session/password/rate limit (6), i18n (6),
    validation (3), image sniffing (2), booking-service + Stripe lifecycle (9)
- `npm run build`: success, no warnings
- `npm run test:e2e`: **20 passed**, covering:
  - locale redirects, carousel, language switch, lightbox, 404, security headers
  - full guest request, double-booking rejection, token check, admin confirmation and email log
  - admin auth guards and forged cookie, content editing, pricing, blocking dates, uploads, export and cron auth
  - mobile menu and overflow
- SQL on PostgreSQL 16:
  - migration applied twice (idempotent), seed applied twice
  - overlapping booking rejected (23P01), same-day turnover allowed, reactivating a cancelled overlap rejected
  - `anon` denied, `reorder_media` works
- `npm audit --omit=dev`: 0 vulnerabilities

### Security review findings (all addressed)
- Proxy matcher skipped dotted `/admin/*` paths. **Fixed:** admin paths are always matched, and the panel layout also checks the session.
- PostgREST `or()` search could be shaped by input. **Fixed:** the term is reduced to letters, digits and `@.+-`.
- Guest names with control characters or `<>` (headers/emails). **Fixed:** rejected by the schema. Email HTML is escaped.
- Production without Supabase would have silently used an ephemeral file store and demo admin credentials. **Fixed:** this now throws unless `DEMO_MODE=true`, and demo credentials are refused in production without it.
- Upload validation relied on the browser-declared MIME type. **Fixed:** magic-byte sniffing; SVG/HTML rejected; files renamed to server-chosen names.
- The `$` in the password-hash format would be expanded by `.env` loading. **Fixed:** the format is now `scrypt:salt:hash`.
- Other protections:
  - The session secret is required in production.
  - Comparisons are timing-safe: tokens, cron secret, export token.
  - Stripe webhook signatures are verified.
  - Prices are computed only on the server.
  - CSP/HSTS/nosniff/frame-ancestors headers; `X-Powered-By` removed.

### Code review findings (fixed)
- **Stripe session expiry:** Stripe rejects `expires_at` under 30 minutes, and with a 30-minute hold, creating the session would fail. Holds are now at least 32 minutes and sessions expire 1 minute before the hold.
- **Manual payments:** "Mark as paid" on an `awaiting_payment` booking could be auto-cancelled when the hold expired. Paid holds are now never expired, and marking paid clears the hold.
- **Abandoned checkout:** the "Retry" link would have hit the guest's own still-held dates. It now expires the Stripe session and releases the dates, or applies the payment if it actually completed.
- **Demo store first-run race:** concurrent seeding could clash. Seeding now uses an exclusive create, with unique temp files for writes.
- **Language switch:** client navigation left `<html lang>` stale. The switcher now does a full page load.
- **Lint:** the React 19 "setState in effect" rule was flagged in three components; they were refactored, for example to use `useSyncExternalStore` for reduced motion.

### Known working functionality (verified locally in demo mode)
- Browse the site in both languages.
- Book a stay as a request, with emails logged.
- Admin confirms the booking, and the confirmation email is logged.
- Block dates; change prices and see the quote change; edit homepage text; upload and reorder photos.
- iCal export (with a token) and the cron endpoint auth.

---

## 4. Remaining work

### Blocked
- None. The earlier GitHub 403 was resolved on 2026-10-22, and the branch `claude/stoic-volta-s2maxz` is pushed.
  The repository had no other branches, so before connecting Vercel, set the production branch
  (create `main` from this branch, or select this branch in Vercel).

### In progress (session 2)
- The Supabase project is being created through the Vercel Marketplace (Frankfurt), with the Supabase
  GitHub integration deploying migrations from branch `claude/stoic-volta-s2maxz`.
- Repo changes for this:
  - `supabase/config.toml` added
  - migrations renamed with timestamps; starter content moved from `seed.sql` into a migration (production deploys do not run seeds)
  - the unneeded `pgcrypto`/`btree_gist` extension statements removed (re-verified on PG16)
  - `SUPABASE_SECRET_KEY` accepted as an alternative to `SUPABASE_SERVICE_ROLE_KEY`
  - `vercel.json` region set to `fra1`
- Next: confirm in Supabase that both migrations applied (Table Editor shows `site_settings` with 3 rows), and
  confirm the Vercel env var names.

### Requires external credentials (code complete, live verification pending)
- **Supabase:**
  - run the migration and seed in a real project
  - smoke-test admin CRUD
  - test direct photo upload via signed URL (the PUT format follows supabase-js `uploadToSignedUrl`)
- **Stripe:** test mode end to end, including the webhook through `stripe listen`, refunds and the `charge.refunded` event.
- **Resend:** domain verification; check the real delivery and rendering of both email languages.
- **iCal import:** check against real Airbnb and Booking.com feed URLs.

### Known limitations / possible improvements
- Rate limits are per instance and in memory. Use WAF or edge limits when running several instances.
- `applyCheckoutSession` is idempotent for state. If the webhook and the confirmation-page reconcile run at the
  exact same moment, the confirmation email could be sent twice; this is rare and harmless. A conditional
  update in SQL would remove it.
- Blocked ranges and bookings are not protected against each other by a DB constraint. This is checked in the
  app; the race with a cron import is acceptable.
- The CSP uses `'unsafe-inline'` for scripts; a nonce-based CSP is a future hardening.
- No automatic data-retention purge of old bookings.
- Images are served as uploaded. Supabase image transformations or `next/image` could add responsive sizes.
- The admin UI is Bulgarian only, by design.
- Single property. The schema stores one property in `site_settings`; multi-property support would need a `properties` table.

### Failed tests / known bugs
- None at the end of session 1.

---

## 5. Session continuity

On resume:
1. Read this file.
2. Check the history and state: `git log --oneline | head -20` and `git status`.
3. Run `npm install`, then `npm test`, then `npm run build`, then `npm run test:e2e`.
4. Pick the first item in §4 that is not blocked.

Do not restart or rewrite working modules.

Commit history (session 1):
1. Scaffold project: domain logic, data layer, i18n, unit tests
2. Public site: layouts, carousel, apartment, gallery, booking flow, APIs
3. Admin area
4. Playwright e2e tests; `html lang` fix
5. Security hardening, direct Supabase uploads, deployment config
6. Stripe session expiry and paid-hold fixes; booking service tests
7. Polish, documentation, database checks, final progress update
