import type { Booking } from "@/lib/types";

/** Public base URL used in emails, Stripe redirects and the sitemap. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  // On Vercel: the production domain for production deployments, the deployment URL for previews.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

/** Guest-facing booking page, authorised by the booking's access token. */
export function confirmationPath(booking: Pick<Booking, "locale" | "reference" | "accessToken">): string {
  return `/${booking.locale}/booking/confirmation/${booking.reference}?t=${booking.accessToken}`;
}
