import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "ab-test-"));
process.env.DEMO_DATA_DIR = dir;

const stripeState = { configured: false, created: [] as Record<string, unknown>[], counter: 0 };
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeState.configured,
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>) => {
          stripeState.created.push(params);
          return { id: `cs_test_${++stripeState.counter}`, url: "https://checkout.stripe.com/pay/test" };
        },
      },
    },
  }),
}));

const { createGuestBooking, applyCheckoutSession, BookingError, quoteStay } = await import("@/lib/booking-service");
const { getRepository } = await import("@/lib/data");
const { addDays, todayAtProperty } = await import("@/lib/dates");

const today = todayAtProperty();
const request = (offset: number, nights = 3) => ({
  checkIn: addDays(today, offset),
  checkOut: addDays(today, offset + nights),
  guests: 2,
  guestName: "Test Guest",
  guestEmail: "guest@example.com",
  guestPhone: "+359 88 000 0000",
  guestNote: null,
  acceptTerms: true as const,
  locale: "en" as const,
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => {
  stripeState.configured = false;
  stripeState.created = [];
});

describe("request mode (no Stripe)", () => {
  it("creates a pending booking with a server-side price and logs both emails", async () => {
    const { booking, redirectUrl } = await createGuestBooking(request(100));
    expect(booking.status).toBe("pending");
    expect(booking.holdExpiresAt).toBeNull();
    expect(booking.totalAmount).toBe((await getRepository().getBooking(booking.id))!.priceBreakdown.total);
    expect(redirectUrl).toBe(`/en/booking/confirmation/${booking.reference}?t=${booking.accessToken}`);
    const emails = await getRepository().listEmails();
    expect(emails.map((e) => e.to)).toEqual(expect.arrayContaining(["guest@example.com", "host@example.com"]));
  });

  it("rejects overlapping requests (double booking)", async () => {
    await expect(createGuestBooking(request(101))).rejects.toMatchObject({ code: "unavailable" });
    await expect(quoteStay(addDays(today, 101), addDays(today, 104), 2)).rejects.toBeInstanceOf(BookingError);
  });

  it("allows a same-day turnover", async () => {
    const { booking } = await createGuestBooking(request(103));
    expect(booking.status).toBe("pending");
  });
});

describe("Stripe mode", () => {
  it("holds the dates and creates a Checkout session that expires before the hold", async () => {
    stripeState.configured = true;
    const before = Date.now();
    const { booking, redirectUrl } = await createGuestBooking(request(120));
    expect(redirectUrl).toBe("https://checkout.stripe.com/pay/test");
    expect(booking.status).toBe("awaiting_payment");
    expect(booking.stripeSessionId).toBe("cs_test_1");
    const params = stripeState.created[0] as { expires_at: number; line_items: { price_data: { unit_amount: number } }[] };
    expect(params.line_items[0].price_data.unit_amount).toBe(booking.totalAmount);
    expect(params.expires_at * 1000 - before).toBeGreaterThanOrEqual(30 * 60_000 + 30_000);
    expect(params.expires_at * 1000).toBeLessThan(new Date(booking.holdExpiresAt!).getTime());
  });

  it("confirms the booking when the session is paid, idempotently", async () => {
    const booking = (await getRepository().getBookingByStripeSession("cs_test_1"))!;
    const session = { id: "cs_test_1", status: "complete", payment_status: "paid", payment_intent: "pi_1", metadata: { bookingId: booking.id } };
    const emailsBefore = (await getRepository().listEmails()).length;
    const confirmed = await applyCheckoutSession(session as never);
    expect(confirmed).toMatchObject({ status: "confirmed", paymentStatus: "paid", stripePaymentIntent: "pi_1", holdExpiresAt: null });
    await applyCheckoutSession(session as never);
    expect((await getRepository().listEmails()).length).toBe(emailsBefore + 2); // guest + owner, once
  });

  it("releases the dates when the session expires", async () => {
    stripeState.configured = true;
    const { booking } = await createGuestBooking(request(140));
    const cancelled = await applyCheckoutSession({ id: booking.stripeSessionId, status: "expired", payment_status: "unpaid", metadata: {} } as never);
    expect(cancelled?.status).toBe("cancelled");
    stripeState.configured = false;
    const again = await createGuestBooking(request(140));
    expect(again.booking.status).toBe("pending");
  });

  it("flags a payment that arrives after the dates were taken", async () => {
    stripeState.configured = true;
    const repo = getRepository();
    const { booking } = await createGuestBooking(request(160));
    // The hold lapses and another guest books the same dates.
    await repo.updateBooking(booking.id, { holdExpiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(await repo.expireStaleHolds()).toBe(1);
    stripeState.configured = false;
    await createGuestBooking(request(160));
    const late = await applyCheckoutSession({ id: booking.stripeSessionId, status: "complete", payment_status: "paid", payment_intent: "pi_late", metadata: {} } as never);
    expect(late).toMatchObject({ status: "cancelled", paymentStatus: "paid" });
    expect(late?.adminNote).toMatch(/възстановяване/);
  });

  it("never expires a hold that has been marked paid", async () => {
    stripeState.configured = true;
    const repo = getRepository();
    const { booking } = await createGuestBooking(request(180));
    await repo.updateBooking(booking.id, { paymentStatus: "paid", holdExpiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(await repo.expireStaleHolds()).toBe(0);
  });
});
