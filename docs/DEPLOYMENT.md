# Deployment guide

The recommended setup is Vercel for hosting, Supabase for the database and photo storage, Stripe for
payments, and Resend for email. Any Node.js 20.9+ host works, using `npm run build && npm start`.

Every external service is optional except Supabase. Without Stripe, bookings become requests that you
confirm in the admin area. Without Resend, emails are only recorded in **Admin → Имейли**.

---

## 1. Supabase

1. Create a project at https://supabase.com and choose an EU region, e.g. Frankfurt.
2. Open **SQL Editor** and run, in order:
   1. `supabase/migrations/0001_initial_schema.sql`, which creates the tables, the double-booking
      constraint, RLS (deny-by-default) and the `media` storage bucket.
   2. `supabase/seed.sql`, which loads the starting texts, prices and placeholder photos. All of it can be
      edited later in the admin area.
3. Under **Project Settings → API**, copy:
   - the Project URL into `NEXT_PUBLIC_SUPABASE_URL`
   - the `service_role` key into `SUPABASE_SERVICE_ROLE_KEY` (**secret, server-only**)

The application never uses the anon key. All database access runs on the server, and the RLS policies
deliberately grant nothing to `anon` or `authenticated`.

## 2. Admin credentials

```bash
npm run hash-password -- "a long, unique passphrase"
```

Set these environment variables:
- `ADMIN_USERNAME`: a username of your choice.
- `ADMIN_PASSWORD_HASH`: the printed `scrypt:…` value.
- `ADMIN_SESSION_SECRET`: at least 32 random characters, e.g. from `openssl rand -base64 48`. Changing it signs out
  all sessions.

Login is limited to 5 attempts per IP per 15 minutes, and sessions last 12 hours.

## 3. Stripe (optional)

1. In the Stripe Dashboard, copy the secret key into `STRIPE_SECRET_KEY`.
2. Go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

How payment works:
- A guest's dates are held for **Admin → Цени → Задържане** minutes (minimum 32) while they pay.
- The Checkout session expires one minute before the hold ends.
- If the guest returns via "cancel", the dates are released immediately.
- The confirmation page also checks the payment with Stripe directly, so a delayed webhook does not
  leave the guest waiting.

Refunds: cancelling a paid booking in the admin area issues a full Stripe refund when the box is
ticked. Partial refunds are done in the Stripe Dashboard.

## 4. Email with Resend (optional)

1. Verify your sending domain at https://resend.com.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`, e.g. `"Morski Briz <bookings@your-domain.com>"`.
3. Optionally set `ADMIN_NOTIFICATION_EMAIL`. It defaults to the contact email in **Admin → Съдържание**.

The guest receives an email when a request is received, when the booking is confirmed or paid, and
when it is cancelled. Each email is in the guest's language. The owner receives an email for each new
request or payment.

## 5. Calendar synchronisation

- **Import** (other platforms → this site): add each platform's iCal URL in **Admin → Синхронизация**.
- **Export** (this site → other platforms): set `ICAL_EXPORT_TOKEN` (16+ random characters). The admin page then
  shows the URL to paste into Airbnb or Booking.com. The feed contains dates only, with no guest data.
- **Schedule:** `vercel.json` calls `/api/cron/sync-calendars` every 30 minutes, using `CRON_SECRET` as a bearer
  token, and also releases expired payment holds.
  - **Vercel Hobby** plans allow only daily cron jobs. On Hobby, change the schedule in `vercel.json` to
    `0 3 * * *` and use an external scheduler such as cron-job.org or GitHub Actions to call this
    every 15–30 minutes:
    ```
    curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/cron/sync-calendars
    ```

iCal sync is never instant on any platform. Expect a delay of up to the sync interval, plus however
often Airbnb or Booking.com poll your export feed (often 1–3 hours). Keep that in mind for last-minute
bookings.

## 6. Vercel

1. Import the repository in Vercel. The framework (Next.js) is detected automatically.
2. Add all environment variables from `.env.example`, including `NEXT_PUBLIC_SITE_URL=https://your-domain`.
3. Deploy. Then confirm that:
   - `/bg` and `/en` load
   - `/admin/login` works
   - a test booking completes, using Stripe test mode first
   - the Stripe webhook shows `200` responses
   - an email arrives

Photo uploads go directly from the browser to Supabase Storage through signed URLs, so Vercel's
4.5 MB request limit does not apply. The server then checks every uploaded file's bytes, and anything
that is not a JPG, PNG, WebP or AVIF image is deleted.

## 7. Security notes

- Security headers come from `next.config.ts`: CSP, `frame-ancestors 'none'`, `nosniff`, HSTS and a referrer policy.
  The CSP keeps `'unsafe-inline'` for scripts because Next.js injects inline bootstrapping scripts.
  Moving to nonce-based CSP is possible but makes every page dynamic. Every page already is dynamic here, so this is a reasonable future hardening.
- Rate limits for login, quotes and bookings are kept in memory per server instance. Behind several
  instances, add edge rate limiting with Vercel WAF or Cloudflare. On hosts that do not set
  `x-forwarded-for` themselves, the header can be spoofed.
- Guest data appears only in the admin area and on the booking page. That page is reachable only through
  a link containing a 192-bit secret token.
- Personal data is kept indefinitely. Delete old bookings according to your retention policy; see the
  privacy page text.

## 8. Demo / preview deployments

To deploy without Supabase, for example as a preview, set `DEMO_MODE=true`. Data is then stored on the
server's local disk, which is ephemeral on serverless platforms. Without `DEMO_MODE=true`, a production
build without Supabase refuses to serve data instead of silently losing it.
