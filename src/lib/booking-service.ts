import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type Stripe from "stripe";
import { fmt, getDictionary } from "@/i18n";
import { occupiedRanges, validateStayDates, type RangeProblem } from "@/lib/availability";
import { BookingConflictError, getRepository, type NewBooking } from "@/lib/data";
import { addDays, todayAtProperty } from "@/lib/dates";
import { sendAdminNotification, sendGuestEmail } from "@/lib/email";
import { PricingError, calculateQuote, type PricingErrorCode } from "@/lib/pricing";
import { siteUrl } from "@/lib/site-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { Booking, PriceQuote } from "@/lib/types";
import type { BookingRequest } from "@/lib/validation";

export type QuoteProblem = RangeProblem | PricingErrorCode;

export class BookingError extends Error {
  constructor(
    public code: QuoteProblem | "payment" | "server",
    public detail?: number,
  ) {
    super(code);
  }
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  let ref = "";
  for (let i = 0; i < 6; i++) ref += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `AB-${ref}`;
}

export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Loads everything needed to price and validate a stay, releasing expired payment holds first. */
export async function loadAvailabilityContext() {
  const repo = getRepository();
  await repo.expireStaleHolds();
  const today = todayAtProperty();
  const [settings, seasons, bookings, blocked] = await Promise.all([
    repo.getSettings(),
    repo.listSeasonalRates(),
    repo.listBookings({ status: ["pending", "awaiting_payment", "confirmed"], from: addDays(today, -1) }),
    repo.listBlockedRanges(),
  ]);
  return { settings, seasons, ranges: occupiedRanges(bookings, blocked), today };
}

/** Validates dates against availability and computes the price; throws BookingError. */
export async function quoteStay(checkIn: string, checkOut: string, guests: number): Promise<PriceQuote> {
  const { settings, seasons, ranges, today } = await loadAvailabilityContext();
  const problem = validateStayDates(checkIn, checkOut, ranges, {
    bookingWindowDays: settings.pricing.bookingWindowDays,
    today,
  });
  if (problem) throw new BookingError(problem, problem === "too_far" ? settings.pricing.bookingWindowDays : undefined);
  try {
    return calculateQuote(checkIn, checkOut, guests, settings.pricing, seasons);
  } catch (error) {
    if (error instanceof PricingError) throw new BookingError(error.code, error.detail);
    throw error;
  }
}

export function confirmationPath(booking: Pick<Booking, "locale" | "reference" | "accessToken">) {
  return `/${booking.locale}/booking/confirmation/${booking.reference}?t=${booking.accessToken}`;
}

/**
 * Creates a booking from a validated guest request. With Stripe configured the booking holds the
 * dates while the guest pays in Stripe Checkout; otherwise it becomes a request for the host.
 * Returns the URL to send the guest to next.
 */
export async function createGuestBooking(input: BookingRequest): Promise<{ redirectUrl: string; booking: Booking }> {
  const repo = getRepository();
  const quote = await quoteStay(input.checkIn, input.checkOut, input.guests);
  const { pricing, property } = await repo.getSettings();
  const usePayments = isStripeConfigured();
  const holdMinutes = Math.max(30, pricing.holdMinutes); // Stripe sessions live at least 30 minutes

  const draft: NewBooking = {
    reference: generateReference(),
    accessToken: generateAccessToken(),
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    guestNote: input.guestNote,
    locale: input.locale,
    nights: quote.nights,
    totalAmount: quote.total,
    currency: quote.currency,
    priceBreakdown: quote,
    status: usePayments ? "awaiting_payment" : "pending",
    paymentStatus: "unpaid",
    stripeSessionId: null,
    stripePaymentIntent: null,
    holdExpiresAt: usePayments ? new Date(Date.now() + holdMinutes * 60_000).toISOString() : null,
    adminNote: null,
    confirmedAt: null,
    cancelledAt: null,
  };

  let booking: Booking;
  try {
    booking = await createWithUniqueReference(draft);
  } catch (error) {
    if (error instanceof BookingConflictError) throw new BookingError("unavailable");
    throw error;
  }

  if (!usePayments) {
    await Promise.all([sendGuestEmail("received", booking), sendAdminNotification(booking, "new_request")]);
    return { booking, redirectUrl: confirmationPath(booking) };
  }

  try {
    const t = getDictionary(booking.locale);
    const base = siteUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: booking.guestEmail,
      client_reference_id: booking.id,
      locale: booking.locale === "bg" ? "bg" : "en",
      expires_at: Math.floor(new Date(booking.holdExpiresAt!).getTime() / 1000),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: booking.currency.toLowerCase(),
            unit_amount: booking.totalAmount,
            product_data: {
              name: `${property.name} — ${booking.checkIn} → ${booking.checkOut}`,
              description: `${booking.nights} ${t.common.nights} · ${booking.guests} ${t.common.guestsPlural} · ${booking.reference}`,
            },
          },
        },
      ],
      metadata: { bookingId: booking.id, reference: booking.reference },
      payment_intent_data: { metadata: { bookingId: booking.id, reference: booking.reference } },
      success_url: `${base}${confirmationPath(booking)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${confirmationPath(booking)}&cancelled=1`,
    });
    booking = await repo.updateBooking(booking.id, { stripeSessionId: session.id });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { booking, redirectUrl: session.url };
  } catch (error) {
    console.error("[booking] Stripe checkout failed", error);
    await repo
      .updateBooking(booking.id, { status: "cancelled", cancelledAt: new Date().toISOString(), adminNote: "Stripe checkout could not be created" })
      .catch(() => undefined);
    throw new BookingError("payment");
  }
}

async function createWithUniqueReference(draft: NewBooking): Promise<Booking> {
  const repo = getRepository();
  for (let attempt = 0; ; attempt++) {
    try {
      return await repo.createBooking(draft);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505" && attempt < 3) {
        draft = { ...draft, reference: generateReference() }; // unique_violation on reference
        continue;
      }
      throw error;
    }
  }
}

/**
 * Applies a completed Checkout session to its booking. Idempotent — safe to call from the webhook
 * and from the confirmation page (which reconciles if the webhook is delayed).
 */
export async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<Booking | null> {
  const repo = getRepository();
  const booking =
    (await repo.getBookingByStripeSession(session.id)) ??
    (session.metadata?.bookingId ? await repo.getBooking(session.metadata.bookingId) : null);
  if (!booking) return null;

  if (session.status === "expired") {
    if (booking.status === "awaiting_payment") {
      return repo.updateBooking(booking.id, { status: "cancelled", cancelledAt: new Date().toISOString() });
    }
    return booking;
  }

  if (session.payment_status !== "paid" || booking.paymentStatus === "paid") return booking;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const now = new Date().toISOString();
  try {
    const updated = await repo.updateBooking(booking.id, {
      status: "confirmed",
      paymentStatus: "paid",
      stripePaymentIntent: paymentIntent,
      holdExpiresAt: null,
      confirmedAt: now,
      cancelledAt: null,
    });
    await Promise.all([sendGuestEmail("confirmed", updated), sendAdminNotification(updated, "paid")]);
    return updated;
  } catch (error) {
    if (!(error instanceof BookingConflictError)) throw error;
    // Paid after the hold expired and someone else took the dates: keep it cancelled, flag for refund.
    const flagged = await repo.updateBooking(booking.id, {
      paymentStatus: "paid",
      stripePaymentIntent: paymentIntent,
      adminNote: [booking.adminNote, "ВНИМАНИЕ: платено след изтичане на задържането, датите са заети — нужно е възстановяване на сумата."]
        .filter(Boolean)
        .join("\n"),
    });
    await sendAdminNotification(flagged, "paid");
    return flagged;
  }
}

/** Confirmation-page fallback: if the webhook has not arrived yet, ask Stripe directly. */
export async function reconcileWithStripe(booking: Booking): Promise<Booking> {
  if (booking.status !== "awaiting_payment" || !booking.stripeSessionId || !isStripeConfigured()) return booking;
  try {
    const session = await getStripe().checkout.sessions.retrieve(booking.stripeSessionId);
    return (await applyCheckoutSession(session)) ?? booking;
  } catch (error) {
    console.error("[booking] Stripe reconcile failed", error);
    return booking;
  }
}

export function problemMessage(locale: "bg" | "en", code: string, detail?: number): string {
  const errors = getDictionary(locale).booking.errors as Record<string, string>;
  return fmt(errors[code] ?? errors.server, { n: detail ?? "" });
}
