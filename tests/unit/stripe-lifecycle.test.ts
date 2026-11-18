import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Edge cases of the payment lifecycle: races between webhook and confirmation page, owner
// cancellations while the guest is paying, delayed payment methods and Stripe's minimum charge.

const dir = mkdtempSync(path.join(tmpdir(), "ab-stripe-"));
process.env.DEMO_DATA_DIR = dir;

type Session = { id: string; status: "open" | "complete" | "expired"; payment_status: "paid" | "unpaid"; url?: string; payment_intent?: string; metadata: Record<string, string> };
const stripe = {
  configured: true,
  counter: 0,
  sessions: new Map<string, Session>(),
  created: [] as Record<string, unknown>[],
  expired: [] as string[],
  /** Simulates the guest paying between our retrieve() and expire() calls. */
  payDuringExpire: false,
};

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripe.configured,
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>, options?: { idempotencyKey?: string }) => {
          stripe.created.push({ ...params, idempotencyKey: options?.idempotencyKey });
          const id = `cs_${++stripe.counter}`;
          const session: Session = { id, status: "open", payment_status: "unpaid", url: `https://checkout.stripe.com/${id}`, metadata: params.metadata as Record<string, string> };
          stripe.sessions.set(id, session);
          return session;
        },
        retrieve: async (id: string) => ({ ...stripe.sessions.get(id)! }),
        expire: async (id: string) => {
          const s = stripe.sessions.get(id)!;
          if (stripe.payDuringExpire) {
            Object.assign(s, { status: "complete", payment_status: "paid", payment_intent: `pi_${id}` });
            throw new Error("Only Checkout Sessions with a status of open can be expired");
          }
          s.status = "expired";
          stripe.expired.push(id);
          return s;
        },
      },
    },
  }),
}));

const { createGuestBooking, applyCheckoutSession, closeCheckoutForCancellation, failAsyncPayment, openCheckoutUrl } = await import("@/lib/booking-service");
const { getRepository } = await import("@/lib/data");
const { addDays, todayAtProperty } = await import("@/lib/dates");

const today = todayAtProperty();
let offset = 30;
const request = () => {
  offset += 5;
  return {
    checkIn: addDays(today, offset),
    checkOut: addDays(today, offset + 3),
    guests: 2,
    guestName: "Race Tester",
    guestEmail: "race@example.com",
    guestPhone: "+359 88 111 2222",
    guestNote: null,
    acceptTerms: true as const,
    locale: "en" as const,
  };
};
const paid = (id: string, extra: Partial<Session> = {}) =>
  ({ ...stripe.sessions.get(id)!, status: "complete", payment_status: "paid", payment_intent: `pi_${id}`, ...extra }) as never;
const emailsFor = async (reference: string) => (await getRepository().listEmails()).filter((e) => e.subject.includes(reference));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => {
  stripe.configured = true;
  stripe.payDuringExpire = false;
});

describe("payment confirmation races", () => {
  it("webhook and confirmation page arriving together confirm once and send each email once", async () => {
    const { booking } = await createGuestBooking(request());
    const session = paid(booking.stripeSessionId!);
    const results = await Promise.all([applyCheckoutSession(session), applyCheckoutSession(session), applyCheckoutSession(session)]);
    expect(results.every((b) => b?.status === "confirmed")).toBe(true);
    const confirmations = (await emailsFor(booking.reference)).filter((e) => /confirmed|Платена/.test(e.subject));
    expect(confirmations).toHaveLength(2); // one to the guest, one to the owner
  });
});

describe("owner cancels while the guest is on the payment page", () => {
  it("expires the open Checkout session so the guest cannot pay", async () => {
    const { booking } = await createGuestBooking(request());
    expect(await closeCheckoutForCancellation(booking)).toBe("closed");
    expect(stripe.expired).toContain(booking.stripeSessionId);
  });

  it("reports and applies a payment that completed at the last moment", async () => {
    const { booking } = await createGuestBooking(request());
    stripe.payDuringExpire = true;
    expect(await closeCheckoutForCancellation(booking)).toBe("paid");
    expect((await getRepository().getBooking(booking.id))?.status).toBe("confirmed");
  });

  it("never resurrects a cancelled booking when money arrives later — flags it for a refund", async () => {
    const repo = getRepository();
    const { booking } = await createGuestBooking(request());
    await repo.updateBooking(booking.id, { status: "cancelled", cancelledAt: new Date().toISOString() });
    const result = await applyCheckoutSession(paid(booking.stripeSessionId!));
    expect(result).toMatchObject({ status: "cancelled", paymentStatus: "paid" });
    expect(result?.adminNote).toMatch(/възстановяване/);
  });
});

describe("delayed payment methods (SEPA, bank transfer)", () => {
  it("keeps holding the dates while the bank processes the payment", async () => {
    const repo = getRepository();
    const { booking } = await createGuestBooking(request());
    const processing = await applyCheckoutSession({ ...stripe.sessions.get(booking.stripeSessionId!)!, status: "complete", payment_status: "unpaid" } as never);
    expect(processing).toMatchObject({ status: "awaiting_payment", holdExpiresAt: null });
    await repo.expireStaleHolds(new Date(Date.now() + 7 * 86_400_000));
    expect((await repo.getBooking(booking.id))?.status).toBe("awaiting_payment");
    const done = await applyCheckoutSession(paid(booking.stripeSessionId!));
    expect(done?.status).toBe("confirmed");
  });

  it("releases the dates when the delayed payment fails", async () => {
    const { booking } = await createGuestBooking(request());
    await applyCheckoutSession({ ...stripe.sessions.get(booking.stripeSessionId!)!, status: "complete", payment_status: "unpaid" } as never);
    await failAsyncPayment(booking.stripeSessionId!);
    expect(await getRepository().getBooking(booking.id)).toMatchObject({ status: "cancelled", paymentStatus: "failed" });
  });
});

describe("checkout helpers", () => {
  it("returns the open Checkout URL so the guest can finish paying", async () => {
    const { booking } = await createGuestBooking(request());
    expect(await openCheckoutUrl(booking)).toBe(`https://checkout.stripe.com/${booking.stripeSessionId}`);
  });

  it("passes an idempotency key to Stripe", async () => {
    const { booking } = await createGuestBooking(request());
    expect(stripe.created.at(-1)?.idempotencyKey).toBe(`checkout-${booking.id}`);
  });

  it("turns a stay below Stripe's minimum charge into a host-confirmed request", async () => {
    const repo = getRepository();
    const settings = await repo.getSettings();
    await repo.saveSettings("pricing", { ...settings.pricing, baseNightly: 10, weekendNightly: null, cleaningFee: 0, extraGuestNightly: 0 });
    for (const s of await repo.listSeasonalRates()) await repo.deleteSeasonalRate(s.id);
    const { booking, redirectUrl } = await createGuestBooking(request());
    expect(booking.totalAmount).toBeLessThan(50);
    expect(booking.status).toBe("pending");
    expect(redirectUrl).toMatch(/^\/en\/booking\/confirmation\//);
    await repo.saveSettings("pricing", settings.pricing);
  });
});
