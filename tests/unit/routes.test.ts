import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const dir = mkdtempSync(path.join(tmpdir(), "ab-routes-"));
process.env.DEMO_DATA_DIR = dir;
process.env.ICAL_EXPORT_TOKEN = "export-token-for-tests-1234";
process.env.CRON_SECRET = "cron-secret-for-tests-12345";

const stripe = { configured: false };
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripe.configured,
  getStripe: () => ({
    webhooks: {
      constructEvent: (body: string, signature: string) => {
        if (signature !== "valid") throw new Error("bad signature");
        return JSON.parse(body);
      },
    },
  }),
}));

const { GET: exportFeed } = await import("@/app/api/calendar/export/route");
const { GET: exportIcs } = await import("@/app/api/calendar/availability.ics/route");
const { GET: cron } = await import("@/app/api/cron/sync-calendars/route");
const { POST: webhook } = await import("@/app/api/stripe/webhook/route");
const { getRepository } = await import("@/lib/data");
const { addDays, todayAtProperty } = await import("@/lib/dates");
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const day = (n: number) => addDays(todayAtProperty(), n);
const compact = (d: string) => d.replace(/-/g, "");

describe("iCal export for Booking.com / Airbnb", () => {
  it("requires the secret token", async () => {
    expect((await exportFeed(new NextRequest("http://x/api/calendar/export?token=wrong"))).status).toBe(404);
    expect((await exportIcs(new NextRequest("http://x/api/calendar/availability.ics"))).status).toBe(404);
  });

  it("gives each platform the other platforms' dates but never its own", async () => {
    const repo = getRepository();
    const booking = await repo.saveFeed({ name: "Booking.com", url: "https://admin.booking.com/a.ics" });
    const airbnb = await repo.saveFeed({ name: "Airbnb", url: "https://www.airbnb.com/a.ics" });
    await repo.replaceFeedRanges(booking.id, [{ startDate: day(50), endDate: day(52), reason: "Booking.com", source: "ical", feedId: booking.id, externalUid: "b" }]);
    await repo.replaceFeedRanges(airbnb.id, [{ startDate: day(60), endDate: day(62), reason: "Airbnb", source: "ical", feedId: airbnb.id, externalUid: "a" }]);
    await repo.createBlockedRange({ startDate: day(70), endDate: day(71), reason: "owner", source: "manual", feedId: null, externalUid: null });

    const forBooking = await (await exportIcs(new NextRequest(`http://x/api/calendar/availability.ics?token=${process.env.ICAL_EXPORT_TOKEN}&for=${booking.id}`))).text();
    expect(forBooking).toContain(`DTSTART;VALUE=DATE:${compact(day(60))}`); // Airbnb booking reaches Booking.com
    expect(forBooking).toContain(`DTSTART;VALUE=DATE:${compact(day(70))}`); // manual block
    expect(forBooking).not.toContain(`DTSTART;VALUE=DATE:${compact(day(50))}`); // not echoed back

    const generic = await (await exportFeed(new NextRequest(`http://x/api/calendar/export?token=${process.env.ICAL_EXPORT_TOKEN}`))).text();
    expect(generic).toContain(compact(day(70)));
    expect(generic).not.toContain(compact(day(50)));
    expect(generic).not.toContain(compact(day(60)));
    expect(generic).not.toMatch(/Booking\.com|Airbnb|owner/); // dates only, no reasons or guest data
  });
});

describe("cron endpoint", () => {
  it("rejects calls without the bearer secret", async () => {
    expect((await cron(new NextRequest("http://x/api/cron/sync-calendars"))).status).toBe(401);
    const res = await cron(new NextRequest("http://x/api/cron/sync-calendars", { headers: { authorization: "Bearer nope" } }));
    expect(res.status).toBe(401);
  });
});

describe("Stripe webhook", () => {
  const post = (body: unknown, signature?: string) =>
    webhook(new NextRequest("http://x/api/stripe/webhook", { method: "POST", body: JSON.stringify(body), headers: signature ? { "stripe-signature": signature } : {} }));

  it("is disabled until Stripe and the signing secret are configured", async () => {
    expect((await post({})).status).toBe(503);
  });

  it("rejects missing and invalid signatures", async () => {
    stripe.configured = true;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    expect((await post({})).status).toBe(400);
    expect((await post({}, "forged")).status).toBe(400);
  });

  it("marks refunds and ignores unknown events", async () => {
    const repo = getRepository();
    const created = await repo.createBooking({
      reference: "AB-REFUND", accessToken: "t", checkIn: day(90), checkOut: day(92), guests: 2, guestName: "Refund Test",
      guestEmail: "r@example.com", guestPhone: "+359", guestNote: null, locale: "en", nights: 2, totalAmount: 1000, currency: "EUR",
      priceBreakdown: {} as never, status: "cancelled", paymentStatus: "paid", stripeSessionId: "cs_refund", stripePaymentIntent: "pi_refund",
      holdExpiresAt: null, adminNote: null, confirmedAt: null, cancelledAt: null,
    });
    expect((await post({ type: "charge.refunded", data: { object: { payment_intent: "pi_refund", refunded: true } } }, "valid")).status).toBe(200);
    expect((await repo.getBooking(created.id))?.paymentStatus).toBe("refunded");
    expect((await post({ type: "customer.created", data: { object: {} } }, "valid")).status).toBe(200);
  });
});
