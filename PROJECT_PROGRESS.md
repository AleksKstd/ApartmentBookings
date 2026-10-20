# PROJECT_PROGRESS.md — ApartmentBookings

> Persistent progress log. **Read this first when resuming a session.**
> Statuses: `Not started` · `In progress` · `Completed` · `Blocked`.
> "Completed" means implemented **and** verified (tests / build / manual run), not just UI present.

_Last updated: 2026-10-20 — session 1 (initial build)_

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
| Target | `AleksKstd/ApartmentBookings` (this repo, started empty) | `claude/stoic-volta-s2maxz` |
| Reference | `AleksKstd/classy-beautiful` (salon booking site, Next.js 14 + Supabase) | read-only reference |

**Technology stack.**
- Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript (strict)
- Tailwind CSS 3.4 (custom design tokens, no component library)
- Supabase (Postgres + Storage) via `@supabase/supabase-js`, service-role key used **server-side only**
- Stripe Checkout + webhook (`stripe` SDK)
- Email via Resend HTTP API (no SDK; falls back to a logged/stored outbox)
- Zod for validation, date-fns for dates
- Vitest (unit) + Playwright (end-to-end smoke tests against demo mode)

**Main architecture decisions.**
1. **Repository pattern with two back-ends** (`src/lib/data/`): `SupabaseRepository` when
   `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, otherwise `DemoRepository`
   (seeded, persisted to `.demo-data/db.json`). The whole app runs locally with zero credentials.
2. **Next.js 16 instead of the reference repo's Next 14.2** — 14.2.x has many unpatched advisories
   (`npm audit` reported critical issues); 16.x is the patched line.
3. **i18n via `/[locale]` segment** (`bg` default, `en`), typed dictionaries — the English dictionary
   must have exactly the same keys as Bulgarian (enforced by TypeScript and a unit test).
4. **Pricing and availability are pure functions** (`src/lib/pricing.ts`, `src/lib/availability.ts`),
   always recomputed on the server when a booking is created; client quotes are display-only.
5. **Double-booking prevention** at two levels: server-side availability re-check, plus a Postgres
   `EXCLUDE USING gist` constraint on `daterange(check_in, check_out)` for active bookings.
6. **Admin auth** without hard-coded credentials (unlike reference): `ADMIN_USERNAME` +
   `ADMIN_PASSWORD_HASH` (scrypt) env vars, HMAC-signed expiring session cookie verified in
   `proxy.ts` and again in every server action; login rate-limited.
7. **Payments optional**: without Stripe keys bookings are "requests" the admin confirms; with
   Stripe, guests pay in Checkout and the webhook confirms the booking.
8. Prices stored as integer cents, currency EUR (Bulgaria uses the euro since 2026-01-01).

**Current implementation phase:** Phase 1 — scaffolding & core domain logic.

---

## 2. Development checklist

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Repository analysis | Completed | Reference repo studied (structure, Supabase usage, admin, iCal feed, emails). Weak points noted: hard-coded admin creds, unsigned session cookie, permissive RLS, Next 14 CVEs. |
| 2 | Application architecture | In progress | |
| 3 | Design system | Not started | |
| 4 | Public website pages | Not started | |
| 5 | Homepage carousel | Not started | |
| 6 | Property overview | Not started | |
| 7 | Image gallery | Not started | |
| 8 | Bulgarian translations | Not started | |
| 9 | English translations | Not started | |
| 10 | Language switching | Not started | |
| 11 | Mobile responsiveness | Not started | |
| 12 | Guest booking system | Not started | |
| 13 | Availability calendar | Not started | |
| 14 | Pricing engine | Not started | |
| 15 | Admin authentication | Not started | |
| 16 | Admin dashboard | Not started | |
| 17 | Reservation management | Not started | |
| 18 | Media management | Not started | |
| 19 | Homepage content editor | Not started | |
| 20 | Database migrations | Not started | |
| 21 | Supabase integration code | Not started | |
| 22 | Stripe integration code | Not started | |
| 23 | Email notification code | Not started | |
| 24 | External calendar synchronization | Not started | |
| 25 | Local demonstration mode | Not started | |
| 26 | Security review | Not started | |
| 27 | Code self-review | Not started | |
| 28 | Automated tests | Not started | |
| 29 | Production build | Not started | |
| 30 | Deployment documentation | Not started | |

---

## 3. Completed work

_(filled in as milestones complete)_

---

## 4. Remaining work

_(filled in as milestones complete)_

---

## 5. Session continuity

On resume: read this file → `git log --oneline | head -20` → `git status` → pick the first
non-completed row in the checklist → continue. Do not restart or rewrite working modules.
