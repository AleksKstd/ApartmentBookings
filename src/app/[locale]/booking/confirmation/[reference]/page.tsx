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
import { retryBooking } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/[locale]/booking/confirmation/[reference]">) {
  const { locale, reference } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const t = getDictionary(locale);
  const { property } = await getSiteData();

  const found = /^AB-[A-Z0-9]{6}$/.test(reference) ? await getRepository().getBookingByReference(reference) : null;
  if (!found || !tokenMatches(query.t, found.accessToken)) {
    return (
      <section className="section">
        <div className="container max-w-xl text-center">
          <h1 className="text-3xl">{t.confirmation.notFound}</h1>
          <Link href={`/${locale}/booking`} className="btn-primary mt-8">{t.confirmation.tryAgain}</Link>
        </div>
      </section>
    );
  }

  const booking = await reconcileWithStripe(found);
  const cancelledCheckout = query.cancelled === "1" && booking.status !== "confirmed";
  const processing = booking.status === "awaiting_payment" && !cancelledCheckout && typeof query.session_id === "string";

  let Icon = Clock;
  let title = t.confirmation.requestTitle;
  let text = fmt(t.confirmation.requestText, { email: booking.guestEmail });
  let tone = "bg-sea-50 text-sea-700";
  if (booking.status === "confirmed") {
    Icon = CircleCheck;
    title = t.confirmation.paidTitle;
    text = fmt(t.confirmation.paidText, { email: booking.guestEmail });
    tone = "bg-green-50 text-green-700";
  } else if (processing) {
    title = t.confirmation.processingTitle;
    text = t.confirmation.processingText;
  } else if (booking.status === "cancelled" || cancelledCheckout || booking.status === "awaiting_payment") {
    Icon = TriangleAlert;
    title = t.confirmation.cancelledTitle;
    text = t.confirmation.cancelledText;
    tone = "bg-amber-50 text-amber-700";
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

  return (
    <section className="section">
      {processing && <AutoRefresh seconds={4} />}
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
            {(booking.status === "cancelled" || cancelledCheckout) && (
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
