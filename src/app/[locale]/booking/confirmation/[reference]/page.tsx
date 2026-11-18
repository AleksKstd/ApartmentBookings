import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { AutoRefresh } from "@/components/booking/auto-refresh";
import { fmt, getDictionary, isLocale } from "@/i18n";
import { reconcileWithStripe } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";
import { tokenMatches } from "@/lib/tokens";
import type { Booking } from "@/lib/types";
import { resumePayment, retryBooking } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type View = "confirmed" | "request" | "processing" | "bank" | "hold" | "unpaid" | "declined";

/** Which message the guest sees for a booking's current state. */
function confirmationView(booking: Booking, { cancelledCheckout, returnedFromStripe }: { cancelledCheckout: boolean; returnedFromStripe: boolean }): View {
  switch (booking.status) {
    case "confirmed":
      return "confirmed";
    case "pending":
      return "request";
    case "awaiting_payment":
      if (cancelledCheckout) return "unpaid";
      if (!booking.holdExpiresAt) return "bank"; // delayed payment method in progress
      return returnedFromStripe ? "processing" : "hold";
    case "cancelled":
      // Host declined a request, or cancelled after payment: not a payment problem.
      if (!booking.stripeSessionId || booking.paymentStatus === "paid" || booking.paymentStatus === "refunded") return "declined";
      return "unpaid";
  }
}

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/[locale]/booking/confirmation/[reference]">) {
  const { locale, reference } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const t = getDictionary(locale);
  const { property } = await getSiteData();

  const found = /^AB-[A-Z0-9]{6}$/.test(reference) ? await getRepository().getBookingByReference(reference) : null;
  // Unknown reference or wrong token: a real 404 (see not-found.tsx) without revealing which it was.
  if (!found || !tokenMatches(query.t, found.accessToken)) notFound();

  const booking = await reconcileWithStripe(found);
  const view = confirmationView(booking, { cancelledCheckout: query.cancelled === "1", returnedFromStripe: typeof query.session_id === "string" });
  const timeFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Europe/Sofia" });

  const views = {
    confirmed: { Icon: CircleCheck, tone: "bg-green-50 text-green-700", title: t.confirmation.paidTitle, text: fmt(t.confirmation.paidText, { email: booking.guestEmail }) },
    request: { Icon: Clock, tone: "bg-sea-50 text-sea-700", title: t.confirmation.requestTitle, text: fmt(t.confirmation.requestText, { email: booking.guestEmail }) },
    processing: { Icon: Clock, tone: "bg-sea-50 text-sea-700", title: t.confirmation.processingTitle, text: t.confirmation.processingText },
    bank: { Icon: Clock, tone: "bg-sea-50 text-sea-700", title: t.confirmation.bankProcessingTitle, text: t.confirmation.bankProcessingText },
    hold: {
      Icon: Clock,
      tone: "bg-amber-50 text-amber-700",
      title: t.confirmation.holdTitle,
      text: fmt(t.confirmation.holdText, { time: booking.holdExpiresAt ? timeFmt.format(new Date(booking.holdExpiresAt)) : "" }),
    },
    unpaid: { Icon: TriangleAlert, tone: "bg-amber-50 text-amber-700", title: t.confirmation.cancelledTitle, text: t.confirmation.cancelledText },
    declined: { Icon: TriangleAlert, tone: "bg-amber-50 text-amber-700", title: t.confirmation.declinedTitle, text: t.confirmation.declinedText },
  } as const;
  const { Icon, tone, title, text } = views[view];

  const dateFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

  return (
    <section className="section">
      {view === "processing" && <AutoRefresh seconds={4} />}
      <div className="container max-w-2xl">
        <div className="card p-6 sm:p-10">
          <span className={`grid h-14 w-14 place-items-center rounded-full ${tone}`}>
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-6 text-3xl sm:text-4xl" data-testid="confirmation-title">{title}</h1>
          <p className="mt-3 text-lg text-ink-muted">{text}</p>

          <dl className="mt-8 divide-y divide-sand-200 border-y border-sand-200 text-sm sm:text-base">
            {[
              [t.confirmation.reference, <span key="r" className="font-mono" data-testid="booking-reference">{booking.reference}</span>],
              [t.confirmation.status, t.confirmation.statuses[booking.status]],
              [t.common.checkIn, `${showDate(booking.checkIn)} · ${t.common.after} ${property.checkInTime}`],
              [t.common.checkOut, `${showDate(booking.checkOut)} · ${t.common.before} ${property.checkOutTime}`],
              [t.common.guests, booking.guests],
              [t.booking.total, `${formatMoney(booking.totalAmount, booking.currency, locale)}${booking.paymentStatus === "paid" ? ` · ${t.confirmation.paid}` : ""}`],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            {view === "hold" && (
              <form action={resumePayment}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="reference" value={booking.reference} />
                <input type="hidden" name="token" value={booking.accessToken} />
                <button type="submit" className="btn-primary">{t.confirmation.completePayment}</button>
              </form>
            )}
            {view === "declined" && (
              <Link href={`/${locale}/booking`} className="btn-primary">{t.confirmation.tryAgain}</Link>
            )}
            {view === "unpaid" && (
              <form action={retryBooking}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="reference" value={booking.reference} />
                <input type="hidden" name="token" value={booking.accessToken} />
                <button type="submit" className="btn-primary">{t.confirmation.retryPayment}</button>
              </form>
            )}
            <Link href={`/${locale}`} className="btn-outline">{t.notFound.back}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
