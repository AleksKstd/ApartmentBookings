import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking/booking-widget";
import { getDictionary, isLocale } from "@/i18n";
import { occupiedNights } from "@/lib/availability";
import { HOLD_MINIMUM_MINUTES, loadAvailabilityContext } from "@/lib/booking-service";
import { addDays, isIsoDate } from "@/lib/dates";
import { getSiteData } from "@/lib/site";
import { isStripeConfigured } from "@/lib/stripe";

export async function generateMetadata({ params }: PageProps<"/[locale]/booking">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).meta.booking } : {};
}

export default async function BookingPage({ params, searchParams }: PageProps<"/[locale]/booking">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const t = getDictionary(locale);
  await getSiteData(); // marks the page dynamic and warms the per-request cache
  const { settings, seasons, ranges, today } = await loadAvailabilityContext();
  const lastDay = addDays(today, settings.pricing.bookingWindowDays);
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const initialIn = str(query.checkIn);
  const initialOut = str(query.checkOut);

  return (
    <section className="section">
      <div className="container">
        <h1 className="text-4xl sm:text-5xl">{t.booking.title}</h1>
        <p className="mb-10 mt-3 text-lg text-ink-muted">{t.booking.subtitle}</p>
        <BookingWidget
          locale={locale}
          t={t}
          today={today}
          lastDay={lastDay}
          occupied={occupiedNights(ranges, today, lastDay)}
          maxGuests={settings.pricing.maxGuests}
          minNights={settings.pricing.minNights}
          seasonMinNights={seasons
            .filter((s) => s.minNights != null && s.endDate >= today)
            .map((s) => ({ startDate: s.startDate, endDate: s.endDate, minNights: s.minNights! }))}
          paymentsEnabled={isStripeConfigured()}
          holdMinutes={Math.max(HOLD_MINIMUM_MINUTES, settings.pricing.holdMinutes)}
          initial={{
            checkIn: initialIn && isIsoDate(initialIn) && initialIn >= today ? initialIn : undefined,
            checkOut: initialOut && isIsoDate(initialOut) && initialIn && initialOut > initialIn ? initialOut : undefined,
            guests: Number(str(query.guests)) || undefined,
          }}
        />
      </div>
    </section>
  );
}
