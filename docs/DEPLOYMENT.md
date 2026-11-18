# Deployment guide

The recommended setup is Vercel for hosting, Supabase for the database and photo storage, Stripe for
payments, and Resend for email. Any Node.js 20.9+ host works, using `npm run build && npm start`.

Every external service is optional except Supabase. Without Stripe, bookings become requests that you
confirm in the admin area. Without Resend, emails are only recorded in **Admin → Имейли**.

**Admin → Интеграции** shows, for each service, which variables are set (never their values) and has
buttons that test the Supabase connection and migrations, the Stripe key and webhook, and email sending.
Use it after every step below.

Generate the random secrets once with `npm run generate-secrets`.

---

## 1. Supabase

### Option A: Vercel Marketplace and GitHub integration (recommended)

1. In Vercel, add the Supabase integration. Choose an EU region (Frankfurt, `fra1`) and keep the public
   environment variable prefix as `NEXT_PUBLIC_`. This creates the project and adds its URL and keys to the
   Vercel project.
2. In Supabase, under **Project Settings → Integrations → GitHub**, connect `AleksKstd/ApartmentBookings`:
   - Working directory: `.` (the folder that contains `supabase/`)
   - Deploy to production: **on**, with the production branch set to the branch Vercel deploys
3. Migrations in `supabase/migrations/` are then applied automatically when commits reach that branch:
   - `20261020000000_initial_schema.sql`: tables, the double-booking constraint, RLS and the `media` bucket
   - `20261020000100_starter_content.sql`: starting texts, prices and placeholder photos. It never
     overwrites existing rows, and everything can be edited later in the admin area.
   - `20261118000000_calendar_integrity.sql`: database-level protection so guest bookings can never
     overlap blocked or imported (Booking.com/Airbnb) dates, atomic feed replacement, hold expiry, and the
     shared rate-limit table used by login and booking forms.
4. Check that the Vercel project has `NEXT_PUBLIC_SUPABASE_URL` and a server key, either
   `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` (the app accepts both).

### Option B: Manual setup

1. Create a project at https://supabase.com in an EU region.
2. In the **SQL Editor**, run the files in `supabase/migrations/` in name order.
3. Copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`, and the `service_role` or secret key into
   `SUPABASE_SERVICE_ROLE_KEY`. This key is **secret and server-only**.

The application never uses the anon or publishable key. All database access runs on the server, and the RLS
policies deliberately grant nothing to `anon` or `authenticated`.

## 2. Admin credentials

```bash
npm run hash-password -- "a long, unique passphrase"
```

Set these environment variables:
- `ADMIN_USERNAME`: a username of your choice.
- `ADMIN_PASSWORD_HASH`: the printed `scrypt:…` value.
- `ADMIN_SESSION_SECRET`: at least 32 random characters (`npm run generate-secrets`). Required in every production
  build, including demo deployments. Changing it signs out all sessions.

Login is limited to 5 attempts per IP per 15 minutes, and sessions last 8 hours. Changing `ADMIN_PASSWORD_HASH` (or `ADMIN_SESSION_SECRET`) signs every existing session out.

## 3. Stripe (optional)

1. In the Stripe Dashboard, copy the secret key into `STRIPE_SECRET_KEY`.
2. Go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Then press **Провери Stripe и webhook** in Admin → Интеграции: it confirms the key works and that the webhook
exists with all five events.

How payment works:
- A guest's dates are held for **Admin → Цени → Задържане** minutes (minimum 32) while they pay.
- The Checkout session expires one minute before the hold ends.
- If the guest returns via "cancel", the dates are released immediately.
- The confirmation page also checks the payment with Stripe directly, so a delayed webhook does not
  leave the guest waiting. Webhook and page updates are conditional, so the guest is confirmed and
  emailed exactly once.
- Delayed payment methods (e.g. SEPA debit) keep the dates held until Stripe reports success or failure.
- Cancelling an unpaid booking in the admin area closes the guest's Stripe payment page first. A payment
  that still arrives for a cancelled booking is never auto-confirmed; it is flagged for a refund.
- Stays below €0.50 (Stripe's minimum) fall back to a request the host confirms.

Refunds: cancelling a paid booking in the admin area issues a full Stripe refund when the box is
ticked. Partial refunds are done in the Stripe Dashboard.

## 4. Email with Resend (optional)

1. Verify your sending domain at https://resend.com.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`, e.g. `"Morski Briz <bookings@your-domain.com>"`.
3. Optionally set `ADMIN_NOTIFICATION_EMAIL`. It defaults to the contact email in **Admin → Съдържание**.
4. Press **Изпрати тестов имейл** in Admin → Интеграции.

Guest replies go to the contact email from **Admin → Съдържание** (`reply_to`).

The guest receives an email when a request is received, when the booking is confirmed or paid, and
when it is cancelled. Each email is in the guest's language. The owner receives an email for each new
request or payment.

## 5. Booking.com, Airbnb and other platforms (iCal)

Booking.com's full Connectivity API is only available to certified channel managers, so this site uses
the two-way **iCal calendar sync** that Booking.com and Airbnb offer every property.

1. Set `ICAL_EXPORT_TOKEN` and `CRON_SECRET` (from `npm run generate-secrets`) and redeploy.
2. **Booking.com:** Extranet → **Rates & Availability → Sync calendars** → *Add calendar connection*.
   - Copy Booking.com's **export** link (ends in `.ics`). In **Admin → Синхронизация**, add it under
     "1. Внос" with the name `Booking.com`.
   - The site then shows a **personal import link for Booking.com** next to that feed
     (`/api/calendar/availability.ics?token=…&for=…`). Paste it into Booking.com's **import** field.
3. **Airbnb:** Calendar → Availability → *Connect to another website*, the same way.

Each platform's personal link contains this site's bookings and manual blocks **plus the dates imported
from every other platform**, so an Airbnb reservation also closes the dates on Booking.com. A platform
never receives its own dates back, which prevents sync loops. The links contain dates only, no guest data.

Imported dates are enforced by the database: a guest booking on this site can never overlap them.

**Schedule.** `/api/cron/sync-calendars` imports all feeds and releases expired payment holds.
- `vercel.json` runs it once a day, which every Vercel plan allows (Hobby rejects more frequent crons).
- `.github/workflows/calendar-sync.yml` runs it every 30 minutes for free: add repository secrets
  `SITE_URL` and `CRON_SECRET` in GitHub → Settings → Secrets and variables → Actions.
- On Vercel Pro you can instead set the `vercel.json` schedule to `*/30 * * * *`.

iCal sync is never instant on any platform: Booking.com and Airbnb poll imported calendars every 1–3
hours. Keep that in mind for last-minute bookings.

## 6. Vercel

1. Import the repository in Vercel. The framework (Next.js) is detected automatically.
2. Add all environment variables from `.env.example`, including `NEXT_PUBLIC_SITE_URL=https://your-domain`.
   Mark the server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_*`, `STRIPE_*`, `RESEND_API_KEY`,
   `ICAL_EXPORT_TOKEN`, `CRON_SECRET`) as **Sensitive**.
3. Add your domain under **Settings → Domains**, then redeploy so `NEXT_PUBLIC_SITE_URL` is baked in.
4. Deploy. Then confirm that:
   - Admin → Интеграции shows every section as ready
   - `/bg` and `/en` load
   - `/admin/login` works
   - a test booking completes, using Stripe test mode first
   - the Stripe webhook shows `200` responses
   - an email arrives

Photo uploads go directly from the browser to Supabase Storage through signed URLs, so Vercel's
4.5 MB request limit does not apply. The server then checks every uploaded file's bytes, and anything
that is not a JPG, PNG, WebP or AVIF image is deleted.

## 7. Security notes

- Every HTML page gets a per-request **nonce-based CSP** from `src/proxy.ts` (no `'unsafe-inline'` scripts);
  `next.config.ts` adds `nosniff`, HSTS, a referrer policy and a deny-all CSP for API responses.
- Login (5 per 15 min) and booking requests (8 per 10 min) are rate-limited in Postgres, so the limit holds
  across all serverless instances; keys are SHA-256 hashes, not IP addresses. The price-quote endpoint uses a
  per-instance in-memory limit. The client IP comes from Vercel's own headers; behind another proxy, make sure
  it overwrites `x-forwarded-for`.
- Calendar feed URLs may only point at public HTTPS hosts: private, loopback and link-local addresses
  (including via DNS or redirects) are refused, and feeds are capped at 2 MB.
- Admin sessions last 8 hours and are bound to the password hash, so changing the password signs out
  every device.
- Guest data appears only in the admin area and on the booking page. That page is reachable only through
  a link containing a 192-bit secret token.
- Personal data is kept indefinitely. Delete old bookings according to your retention policy; see the
  privacy page text.

## 8. Demo / preview deployments

To deploy without Supabase, for example as a preview, set `DEMO_MODE=true` (plus `ADMIN_SESSION_SECRET`, which
every production build requires). Data is then stored on the
server's local disk, which is ephemeral on serverless platforms. Without `DEMO_MODE=true`, a production
build without Supabase refuses to serve data instead of silently losing it.
