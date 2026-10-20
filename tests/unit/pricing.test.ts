import { describe, expect, it } from "vitest";
import { PricingError, calculateQuote, formatMoney, minNightsFor, nightlyRate } from "@/lib/pricing";
import type { PricingSettings, SeasonalRate } from "@/lib/types";

const settings: PricingSettings = {
  currency: "EUR",
  baseNightly: 10_000,
  weekendNightly: 12_000,
  cleaningFee: 3_000,
  includedGuests: 2,
  extraGuestNightly: 1_000,
  maxGuests: 4,
  minNights: 2,
  maxNights: 30,
  weeklyDiscountPercent: 10,
  monthlyDiscountPercent: 20,
  bookingWindowDays: 365,
  holdMinutes: 30,
};

const summer: SeasonalRate = { id: "s", name: "Summer", startDate: "2027-07-01", endDate: "2027-07-31", nightly: 15_000, minNights: 5 };

describe("nightlyRate", () => {
  it("uses the weekend price for Friday and Saturday nights", () => {
    expect(nightlyRate("2027-03-05", settings, []).amount).toBe(12_000); // Friday
    expect(nightlyRate("2027-03-06", settings, []).amount).toBe(12_000); // Saturday
    expect(nightlyRate("2027-03-07", settings, []).amount).toBe(10_000); // Sunday
  });

  it("lets seasonal rates override weekday and weekend prices", () => {
    expect(nightlyRate("2027-07-02", settings, [summer])).toEqual({ amount: 15_000, source: "season" });
    expect(nightlyRate("2027-07-31", settings, [summer]).source).toBe("season");
    expect(nightlyRate("2027-08-01", settings, [summer]).source).not.toBe("season");
  });
});

describe("calculateQuote", () => {
  it("prices a weekday stay with cleaning fee", () => {
    const q = calculateQuote("2027-03-01", "2027-03-03", 2, settings, []); // Mon, Tue nights
    expect(q.nights).toBe(2);
    expect(q.subtotal).toBe(20_000);
    expect(q.total).toBe(23_000);
    expect(q.lines.map((l) => l.kind)).toEqual(["nights", "cleaning"]);
  });

  it("charges extra guests per night", () => {
    const q = calculateQuote("2027-03-01", "2027-03-03", 4, settings, []);
    const extra = q.lines.find((l) => l.kind === "extra_guests")!;
    expect(extra.quantity).toBe(4); // 2 extra guests × 2 nights
    expect(extra.amount).toBe(4_000);
    expect(q.total).toBe(27_000);
  });

  it("applies the weekly discount to nights and extra guests but not cleaning", () => {
    const q = calculateQuote("2027-03-01", "2027-03-08", 2, settings, []); // 7 nights incl. Fri+Sat
    const nights = 5 * 10_000 + 2 * 12_000;
    expect(q.subtotal).toBe(nights);
    const discount = q.lines.find((l) => l.kind === "discount")!;
    expect(discount.label).toBe("weekly_discount");
    expect(discount.amount).toBe(-Math.round(nights * 0.1));
    expect(q.total).toBe(nights - Math.round(nights * 0.1) + 3_000);
  });

  it("applies the monthly discount for 28+ nights", () => {
    const q = calculateQuote("2027-02-01", "2027-03-01", 2, settings, []);
    expect(q.lines.find((l) => l.kind === "discount")!.label).toBe("monthly_discount");
  });

  it("enforces seasonal minimum stay based on the check-in night", () => {
    expect(minNightsFor("2027-07-10", settings, [summer])).toBe(5);
    expect(() => calculateQuote("2027-07-10", "2027-07-13", 2, settings, [summer])).toThrowError(PricingError);
    try {
      calculateQuote("2027-07-10", "2027-07-13", 2, settings, [summer]);
    } catch (e) {
      expect((e as PricingError).code).toBe("min_nights");
      expect((e as PricingError).detail).toBe(5);
    }
  });

  it("prices a stay that spans into a season night by night", () => {
    const q = calculateQuote("2027-06-29", "2027-07-02", 2, settings, [summer]); // Tue, Wed, Thu(season)
    expect(q.nightly.map((n) => n.source)).toEqual(["base", "base", "season"]);
    expect(q.subtotal).toBe(10_000 + 10_000 + 15_000);
  });

  it("rejects invalid ranges and guest counts", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as PricingError).code;
      }
    };
    expect(code(() => calculateQuote("2027-03-03", "2027-03-03", 2, settings, []))).toBe("invalid_range");
    expect(code(() => calculateQuote("2027-03-01", "2027-03-02", 2, settings, []))).toBe("min_nights");
    expect(code(() => calculateQuote("2027-03-01", "2027-05-01", 2, settings, []))).toBe("max_nights");
    expect(code(() => calculateQuote("2027-03-01", "2027-03-04", 5, settings, []))).toBe("too_many_guests");
    expect(code(() => calculateQuote("2027-03-01", "2027-03-04", 0, settings, []))).toBe("too_few_guests");
  });

  it("never produces fractional cents", () => {
    const odd = { ...settings, baseNightly: 3_333, weekendNightly: null, weeklyDiscountPercent: 7 };
    const q = calculateQuote("2027-03-01", "2027-03-10", 3, odd, []);
    for (const line of q.lines) expect(Number.isInteger(line.amount)).toBe(true);
    expect(Number.isInteger(q.total)).toBe(true);
  });
});

describe("formatMoney", () => {
  it("formats euro amounts per locale", () => {
    expect(formatMoney(12_000, "EUR", "en")).toBe("€120");
    expect(formatMoney(12_050, "EUR", "en")).toBe("€120.50");
    expect(formatMoney(12_000, "EUR", "bg")).toMatch(/120\s?€/);
  });
});
