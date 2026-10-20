import { diffDays, eachNight, weekday } from "./dates";
import type { PriceLine, PriceQuote, PricingSettings, SeasonalRate } from "./types";

export type PricingErrorCode =
  | "invalid_range"
  | "min_nights"
  | "max_nights"
  | "too_many_guests"
  | "too_few_guests";

export class PricingError extends Error {
  constructor(
    public code: PricingErrorCode,
    public detail?: number,
  ) {
    super(code);
  }
}

/** Seasonal rate covering a night; the most recently defined (last) match wins on overlap. */
export function seasonFor(night: string, seasons: SeasonalRate[]): SeasonalRate | undefined {
  let match: SeasonalRate | undefined;
  for (const s of seasons) {
    if (night >= s.startDate && night <= s.endDate) match = s;
  }
  return match;
}

/** Minimum stay for a check-in date: a season's own minimum overrides the global one. */
export function minNightsFor(checkIn: string, settings: PricingSettings, seasons: SeasonalRate[]): number {
  const season = seasonFor(checkIn, seasons);
  return season?.minNights ?? settings.minNights;
}

export function nightlyRate(night: string, settings: PricingSettings, seasons: SeasonalRate[]) {
  const season = seasonFor(night, seasons);
  if (season) return { amount: season.nightly, source: "season" as const };
  const wd = weekday(night);
  if (settings.weekendNightly != null && (wd === 5 || wd === 6)) {
    return { amount: settings.weekendNightly, source: "weekend" as const };
  }
  return { amount: settings.baseNightly, source: "base" as const };
}

/**
 * Computes the full price of a stay. This is the single source of truth for money: it is called
 * on the server whenever a booking is created; client-side quotes are for display only.
 */
export function calculateQuote(
  checkIn: string,
  checkOut: string,
  guests: number,
  settings: PricingSettings,
  seasons: SeasonalRate[],
): PriceQuote {
  const nights = diffDays(checkIn, checkOut);
  if (!(nights > 0)) throw new PricingError("invalid_range");
  if (!Number.isInteger(guests) || guests < 1) throw new PricingError("too_few_guests");
  if (guests > settings.maxGuests) throw new PricingError("too_many_guests", settings.maxGuests);
  const minNights = minNightsFor(checkIn, settings, seasons);
  if (nights < minNights) throw new PricingError("min_nights", minNights);
  if (nights > settings.maxNights) throw new PricingError("max_nights", settings.maxNights);

  const nightly = eachNight(checkIn, checkOut).map((date) => ({ date, ...nightlyRate(date, settings, seasons) }));
  const nightsTotal = nightly.reduce((sum, n) => sum + n.amount, 0);

  const lines: PriceLine[] = [
    {
      kind: "nights",
      label: "nights",
      quantity: nights,
      unitAmount: Math.round(nightsTotal / nights),
      amount: nightsTotal,
    },
  ];

  const extraGuests = Math.max(0, guests - settings.includedGuests);
  if (extraGuests > 0 && settings.extraGuestNightly > 0) {
    lines.push({
      kind: "extra_guests",
      label: "extra_guests",
      quantity: extraGuests * nights,
      unitAmount: settings.extraGuestNightly,
      amount: extraGuests * nights * settings.extraGuestNightly,
    });
  }

  const stayAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  const discountPercent =
    nights >= 28 && settings.monthlyDiscountPercent > 0
      ? settings.monthlyDiscountPercent
      : nights >= 7
        ? settings.weeklyDiscountPercent
        : 0;
  if (discountPercent > 0) {
    const discount = Math.round((stayAmount * discountPercent) / 100);
    lines.push({
      kind: "discount",
      label: nights >= 28 && settings.monthlyDiscountPercent > 0 ? "monthly_discount" : "weekly_discount",
      quantity: discountPercent,
      unitAmount: -discount,
      amount: -discount,
    });
  }

  if (settings.cleaningFee > 0) {
    lines.push({
      kind: "cleaning",
      label: "cleaning",
      quantity: 1,
      unitAmount: settings.cleaningFee,
      amount: settings.cleaningFee,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    checkIn,
    checkOut,
    nights,
    guests,
    currency: settings.currency,
    nightly,
    lines,
    subtotal: stayAmount,
    total,
  };
}

export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "bg" ? "bg-BG" : "en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
