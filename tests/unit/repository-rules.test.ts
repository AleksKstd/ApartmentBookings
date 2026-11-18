import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// The demo store must enforce the same calendar rules as the Postgres constraints and triggers
// (supabase/migrations/*), so local development behaves like production.

const dir = mkdtempSync(path.join(tmpdir(), "ab-repo-"));
process.env.DEMO_DATA_DIR = dir;
const { BookingConflictError, getRepository } = await import("@/lib/data");
const { addDays, todayAtProperty } = await import("@/lib/dates");
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const today = todayAtProperty();
const day = (n: number) => addDays(today, n);
const draft = (checkIn: string, checkOut: string, status: "pending" | "confirmed" | "cancelled" = "pending") => ({
  reference: `AB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  accessToken: "token",
  checkIn,
  checkOut,
  guests: 2,
  guestName: "Rule Tester",
  guestEmail: "rules@example.com",
  guestPhone: "+359880000000",
  guestNote: null,
  locale: "bg" as const,
  nights: 2,
  totalAmount: 10000,
  currency: "EUR",
  priceBreakdown: {} as never,
  status,
  paymentStatus: "unpaid" as const,
  stripeSessionId: null,
  stripePaymentIntent: null,
  holdExpiresAt: null,
  adminNote: null,
  confirmedAt: null,
  cancelledAt: null,
});

describe("blocked ranges (Booking.com / Airbnb imports and manual blocks)", () => {
  it("rejects a booking that overlaps an imported range", async () => {
    const repo = getRepository();
    await repo.replaceFeedRanges("feed-1", [{ startDate: day(200), endDate: day(204), reason: "Booking.com", source: "ical", feedId: "feed-1", externalUid: "u1" }]);
    await expect(repo.createBooking(draft(day(203), day(206)))).rejects.toBeInstanceOf(BookingConflictError);
    await expect(repo.createBooking(draft(day(204), day(206)))).resolves.toMatchObject({ status: "pending" });
  });

  it("rejects a manual block over an active booking but accepts an imported one", async () => {
    const repo = getRepository();
    const booking = await repo.createBooking(draft(day(210), day(213), "confirmed"));
    const manual = { startDate: day(211), endDate: day(212), reason: null, source: "manual" as const, feedId: null, externalUid: null };
    await expect(repo.createBlockedRange(manual)).rejects.toBeInstanceOf(BookingConflictError);
    await repo.replaceFeedRanges("feed-2", [{ ...manual, source: "ical", feedId: "feed-2", externalUid: "x" }]);
    // Editing a note on the now-overlapped booking still works; reactivating would not.
    await expect(repo.updateBooking(booking.id, { adminNote: "ok" })).resolves.toMatchObject({ adminNote: "ok" });
  });

  it("refuses to reactivate a cancelled booking onto blocked dates", async () => {
    const repo = getRepository();
    const booking = await repo.createBooking(draft(day(220), day(222), "cancelled"));
    await repo.createBlockedRange({ startDate: day(220), endDate: day(221), reason: null, source: "manual", feedId: null, externalUid: null });
    await expect(repo.updateBooking(booking.id, { status: "confirmed" })).rejects.toBeInstanceOf(BookingConflictError);
  });
});

describe("updateBookingIf (optimistic concurrency)", () => {
  it("only applies while the row still matches", async () => {
    const repo = getRepository();
    const booking = await repo.createBooking(draft(day(230), day(232)));
    expect(await repo.updateBookingIf(booking.id, { status: "pending" }, { status: "confirmed" })).toMatchObject({ status: "confirmed" });
    expect(await repo.updateBookingIf(booking.id, { status: "pending" }, { status: "cancelled" })).toBeNull();
    expect(await repo.updateBookingIf("missing", {}, { status: "cancelled" })).toBeNull();
  });

  it("finds bookings by payment intent", async () => {
    const repo = getRepository();
    const booking = await repo.createBooking({ ...draft(day(240), day(242)), stripePaymentIntent: "pi_lookup" });
    expect((await repo.getBookingByPaymentIntent("pi_lookup"))?.id).toBe(booking.id);
  });
});
