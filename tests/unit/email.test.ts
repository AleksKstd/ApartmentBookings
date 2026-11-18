import { describe, expect, it } from "vitest";
import { escapeHtml, renderGuestEmail } from "@/lib/email";
import { DEFAULT_SETTINGS } from "@/lib/data/defaults";
import type { Booking } from "@/lib/types";

const booking = {
  id: "b1",
  reference: "AB-TEST12",
  accessToken: "secret-token",
  checkIn: "2027-07-01",
  checkOut: "2027-07-04",
  guests: 2,
  guestName: `<script>alert("x")</script> O'Neil`,
  guestEmail: "guest@example.com",
  guestPhone: "+359",
  guestNote: null,
  locale: "en" as const,
  nights: 3,
  totalAmount: 36000,
  currency: "EUR",
  priceBreakdown: {} as never,
  status: "confirmed" as const,
  paymentStatus: "paid" as const,
  stripeSessionId: null,
  stripePaymentIntent: null,
  holdExpiresAt: null,
  adminNote: null,
  createdAt: "2027-01-01T00:00:00Z",
  updatedAt: "2027-01-01T00:00:00Z",
  confirmedAt: null,
  cancelledAt: null,
} satisfies Booking;

describe("guest emails", () => {
  it("escapes HTML in every interpolated value", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    const { html, text } = renderGuestEmail("confirmed", booking, DEFAULT_SETTINGS.property);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(text).toContain(booking.guestName); // plain-text part is not HTML
  });

  it("is written in the guest's language and links to their booking page", () => {
    const en = renderGuestEmail("confirmed", booking, DEFAULT_SETTINGS.property);
    const bg = renderGuestEmail("confirmed", { ...booking, locale: "bg" }, DEFAULT_SETTINGS.property);
    expect(en.subject).toBe("Your booking is confirmed — AB-TEST12");
    expect(bg.subject).toBe("Резервацията ви е потвърдена — AB-TEST12");
    expect(en.html).toContain("/en/booking/confirmation/AB-TEST12?t=secret-token");
    expect(bg.html).toContain("/bg/booking/confirmation/AB-TEST12?t=secret-token");
  });

  it("renders received and cancelled variants", () => {
    expect(renderGuestEmail("received", booking, DEFAULT_SETTINGS.property).subject).toMatch(/received/);
    expect(renderGuestEmail("cancelled", booking, DEFAULT_SETTINGS.property).subject).toMatch(/cancelled/);
  });
});
