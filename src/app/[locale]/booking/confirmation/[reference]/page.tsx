import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CircleCheck, Clock, Mail, MapPin, Phone, TriangleAlert } from "lucide-react";
import { AutoRefresh } from "@/components/booking/auto-refresh";
import { fmt, getDictionary, isLocale, pick } from "@/i18n";
import { reconcileWithStripe } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { buildIcal } from "@/lib/ical";
import { publicContact, shown } from "@/lib/placeholder";
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
  const { property, demo } = await getSiteData();

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
    tone = "bg-success-50 text-success-700";
  } else if (processing) {
    title = t.confirmation.processingTitle;
    text = t.confirmation.processingText;
  } else if (booking.status === "cancelled" || cancelledCheckout || booking.status === "awaiting_payment") {
    Icon = TriangleAlert;
    title = t.confirmation.cancelledTitle;
    text = t.confirmation.cancelledText;
    tone = "bg-warning-50 text-warning-700";
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));

  const contact = publicContact(property, demo);
  const active = booking.status === "pending" || booking.status === "confirmed";
  const replyTime = shown(pick(property.replyTime, locale), demo);
  const arrival = fmt(t.confirmation.nextArrival, { time: property.checkInTime });
  const steps: { text: string; note?: string | null }[] =
    booking.status === "pending"
      ? [{ text: t.confirmation.nextReview, note: replyTime }, { text: fmt(t.confirmation.nextEmail, { email: booking.guestEmail }) }, { text: arrival }]
      : booking.status === "confirmed"
        ? [{ text: fmt(t.confirmation.nextConfirmedEmail, { email: booking.guestEmail }) }, { text: arrival }]
        : [];

  const ics = active
    ? buildIcal(property.name, [
        {
          uid: `${booking.reference}@${property.contactEmail.split("@")[1] ?? "booking"}`,
          start: booking.checkIn,
          end: booking.checkOut,
          summary: fmt(t.confirmation.icsSummary, { name: property.name }),
          description: `${t.confirmation.reference}: ${booking.reference}\n${t.common.checkIn}: ${t.common.after} ${property.checkInTime}\n${t.common.checkOut}: ${t.common.before} ${property.checkOutTime}`,
          location: contact.address ?? undefined,
        },
      ])
    : null;
  const mailto = contact.email && `mailto:${contact.email}?subject=${encodeURIComponent(fmt(t.confirmation.emailSubject, { ref: booking.reference }))}`;

  return (
    <section className="section">
      {processing && <AutoRefresh seconds={4} />}
      <div className="container max-w-2xl space-y-6">
        <div className="card p-6 sm:p-10">
          <span className={`grid h-14 w-14 place-items-center rounded-full ${tone}`}>
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-6 text-3xl sm:text-4xl" data-testid="confirmation-title">{title}</h1>
          <p className="mt-3 text-lg text-ink-muted">{text}</p>

          {steps.length > 0 && (
            <section className="mt-8" aria-labelledby="next-title">
              <h2 id="next-title" className="text-xl">{t.confirmation.nextTitle}</h2>
              <ol className="mt-4 space-y-4">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sea-50 text-sm font-semibold tabular-nums text-sea-800" aria-hidden>
                      {i + 1}
                    </span>
                    <p className="pt-0.5">
                      {step.text}
                      {step.note && <span className="block text-sm text-ink-muted">{step.note}</span>}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <dl className="mt-8 divide-y divide-sand-200 border-y border-sand-200 text-sm sm:text-base">
            {[
              [t.confirmation.reference, <span key="r" className="font-semibold tabular-nums tracking-wide" data-testid="booking-reference">{booking.reference}</span>],
              [t.confirmation.status, t.confirmation.statuses[booking.status]],
              [t.common.checkIn, `${showDate(booking.checkIn)} · ${t.common.after} ${property.checkInTime}`],
              [t.common.checkOut, `${showDate(booking.checkOut)} · ${t.common.before} ${property.checkOutTime}`],
              [t.common.guests, booking.guests],
              [t.booking.total, `${formatMoney(booking.totalAmount, booking.currency, locale)}${booking.paymentStatus === "paid" ? ` · ${t.confirmation.paid}` : ""}`],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between gap-4 py-3">
                <dt className="shrink-0 whitespace-nowrap text-ink-muted">{k}</dt>
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
            {ics && (
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
                download={`${booking.reference}.ics`}
                className="btn-secondary"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                {t.confirmation.addToCalendar}
              </a>
            )}
            <Link href={`/${locale}`} className="btn-outline">{t.notFound.back}</Link>
          </div>
        </div>

        <section className="rounded-2xl border border-sand-200 p-6 sm:p-8" aria-labelledby="contact-title">
          <h2 id="contact-title" className="text-xl">{t.confirmation.contactTitle}</h2>
          <p className="mt-1 text-ink-muted">{fmt(t.confirmation.contactText, { ref: booking.reference })}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {mailto && (
              <a href={mailto} className="btn-outline">
                <Mail className="h-4 w-4" aria-hidden />
                {t.confirmation.emailHost}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-outline">
                <Phone className="h-4 w-4" aria-hidden />
                {fmt(t.confirmation.callHost, { phone: contact.phone })}
              </a>
            )}
          </div>
          {contact.address && (
            <p className="mt-5 flex items-start gap-2 text-sm text-ink">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" aria-hidden />
              {property.mapUrl ? (
                <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-sea-800">
                  {contact.address}
                  <span className="sr-only"> ({t.common.opensInNewTab})</span>
                </a>
              ) : (
                contact.address
              )}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
