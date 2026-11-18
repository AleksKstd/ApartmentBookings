import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type Stripe from "stripe";
import { fmt, getDictionary } from "@/i18n";
import { occupiedRanges, validateStayDates, type RangeProblem } from "@/lib/availability";
import { BookingConflictError, getRepository, type NewBooking } from "@/lib/data";
import { addDays, todayAtProperty } from "@/lib/dates";
import { sendAdminNotification, sendGuestEmail } from "@/lib/email";
import { PricingError, calculateQuote, type PricingErrorCode } from "@/lib/pricing";
import { confirmationPath, siteUrl } from "@/lib/site-url";
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

export const HOLD_MINIMUM_MINUTES = 32;
/** Smallest amount (in cents) Stripe accepts for EUR/BGN Checkout. */
export const STRIPE_MINIMUM_CHARGE = 50;

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
  return (await priceStay(checkIn, checkOut, guests)).quote;
}

async function priceStay(checkIn: string, checkOut: string, guests: number) {
  const { settings, seasons, ranges, today } = await loadAvailabilityContext();
  const problem = validateStayDates(checkIn, checkOut, ranges, {
    bookingWindowDays: settings.pricing.bookingWindowDays,
    today,
  });
  if (problem) throw new BookingError(problem, problem === "too_far" ? settings.pricing.bookingWindowDays : undefined);
  try {
    return { settings, quote: calculateQuote(checkIn, checkOut, guests, settings.pricing, seasons) };
  } catch (error) {
    if (error instanceof PricingError) throw new BookingError(error.code, error.detail);
    throw error;
  }
}

/**
 * Creates a booking from a validated guest request. With Stripe configured the booking holds the
 * dates while the guest pays in Stripe Checkout; otherwise it becomes a request for the host.
 * Returns the URL to send the guest to next.
 */
export async function createGuestBooking(input: BookingRequest): Promise<{ redirectUrl: string; booking: Booking }> {
  const repo = getRepository();
  const { quote, settings } = await priceStay(input.checkIn, input.checkOut, input.guests);
  const { pricing, property } = settings;
  // Stripe cannot charge less than about €0.50; a free or near-free stay becomes a host-confirmed request.
  const usePayments = isStripeConfigured() && quote.total >= STRIPE_MINIMUM_CHARGE;
  // Stripe requires a Checkout session to live at least 30 minutes; the session expires one minute
  // before the hold so a guest can never pay for dates that were already released.
  const holdMinutes = Math.max(HOLD_MINIMUM_MINUTES, pricing.holdMinutes);

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
      expires_at: Math.floor(new Date(booking.holdExpiresAt!).getTime() / 1000) - 60,
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
    }, { idempotencyKey: `checkout-${booking.id}` });
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

const PAID_AFTER_CANCEL_NOTE =
  "ВНИМАНИЕ: плащането пристигна след като резервацията беше отказана или датите бяха заети — нужно е възстановяване на сумата.";

/**
 * Applies a Checkout session to its booking. Idempotent and race-safe — the webhook and the
 * confirmation page may both call it at once; every write is conditional on the state it read, so
 * only one caller wins and only the winner sends emails.
 */
export async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<Booking | null> {
  const repo = getRepository();
  const booking =
    (await repo.getBookingByStripeSession(session.id)) ??
    (session.metadata?.bookingId ? await repo.getBooking(session.metadata.bookingId) : null);
  if (!booking) return null;
  const reload = async () => (await repo.getBooking(booking.id)) ?? booking;

  if (session.status === "expired") {
    if (booking.status !== "awaiting_payment") return booking;
    return (
      (await repo.updateBookingIf(booking.id, { status: "awaiting_payment" }, { status: "cancelled", cancelledAt: new Date().toISOString() })) ??
      reload()
    );
  }

  if (session.status !== "complete") return booking;

  if (session.payment_status === "unpaid") {
    // Delayed payment method (e.g. SEPA debit / bank transfer): Stripe confirms days later via
    // checkout.session.async_payment_succeeded|failed. Keep holding the dates until then instead of
    // letting the hold lapse and the dates be resold while the guest's money is in flight.
    if (booking.status !== "awaiting_payment" || !booking.holdExpiresAt) return booking;
    return (
      (await repo.updateBookingIf(
        booking.id,
        { status: "awaiting_payment", paymentStatus: "unpaid" },
        { holdExpiresAt: null, adminNote: [booking.adminNote, "Плащането се обработва от банката (отложен метод)."].filter(Boolean).join("\n") },
      )) ?? reload()
    );
  }

  if (session.payment_status !== "paid" || booking.paymentStatus === "paid") return booking;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const expected = { paymentStatus: booking.paymentStatus, status: booking.status };

  // Cancelled by the owner (or released) before the money arrived: never silently resurrect it.
  if (booking.status === "cancelled") {
    const flagged = await repo.updateBookingIf(booking.id, expected, {
      paymentStatus: "paid",
      stripePaymentIntent: paymentIntent,
      adminNote: [booking.adminNote, PAID_AFTER_CANCEL_NOTE].filter(Boolean).join("\n"),
    });
    if (flagged) await sendAdminNotification(flagged, "paid");
    return flagged ?? reload();
  }

  if (booking.status === "confirmed") {
    // The owner confirmed it manually before the money arrived; the guest already has the email.
    const updated = await repo.updateBookingIf(booking.id, expected, { paymentStatus: "paid", stripePaymentIntent: paymentIntent, holdExpiresAt: null });
    if (updated) await sendAdminNotification(updated, "paid");
    return updated ?? reload();
  }

  try {
    const updated = await repo.updateBookingIf(booking.id, expected, {
      status: "confirmed",
      paymentStatus: "paid",
      stripePaymentIntent: paymentIntent,
      holdExpiresAt: null,
      confirmedAt: new Date().toISOString(),
      cancelledAt: null,
    });
    if (!updated) return reload(); // another request already applied this payment
    await Promise.all([sendGuestEmail("confirmed", updated), sendAdminNotification(updated, "paid")]);
    return updated;
  } catch (error) {
    if (!(error instanceof BookingConflictError)) throw error;
    // The dates were taken in the meantime: keep it cancelled and flag for a refund.
    const flagged = await repo.updateBookingIf(booking.id, expected, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      paymentStatus: "paid",
      stripePaymentIntent: paymentIntent,
      adminNote: [booking.adminNote, PAID_AFTER_CANCEL_NOTE].filter(Boolean).join("\n"),
    });
    if (flagged) await sendAdminNotification(flagged, "paid");
    return flagged ?? reload();
  }
}

/** Marks a delayed (async) payment as failed and releases the dates. */
export async function failAsyncPayment(sessionId: string): Promise<void> {
  const repo = getRepository();
  const booking = await repo.getBookingByStripeSession(sessionId);
  if (!booking || booking.status !== "awaiting_payment") return;
  await repo.updateBookingIf(booking.id, { status: "awaiting_payment", paymentStatus: "unpaid" }, {
    status: "cancelled",
    paymentStatus: "failed",
    cancelledAt: new Date().toISOString(),
  });
}

/**
 * Stops a pending Stripe Checkout before the owner cancels an unpaid booking, so the guest cannot
 * pay for a stay that no longer exists. Returns "paid" if the guest paid in the meantime (the
 * payment is applied and the caller should not cancel).
 */
export async function closeCheckoutForCancellation(booking: Booking): Promise<"closed" | "paid" | "none"> {
  if (booking.status !== "awaiting_payment" || !booking.stripeSessionId || !isStripeConfigured()) return "none";
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(session.id);
      return "closed";
    } catch {
      // Raced with the guest completing payment, or Stripe was unreachable: re-read the session.
    }
  }
  const latest = session.status === "open" ? await stripe.checkout.sessions.retrieve(session.id) : session;
  if (latest.status === "complete" && latest.payment_status === "paid") {
    await applyCheckoutSession(latest);
    return "paid";
  }
  if (latest.status === "open") {
    // Never report success while the guest can still pay for a stay we are about to cancel.
    throw new Error("Stripe Checkout session could not be expired");
  }
  return "closed";
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

/**
 * Guest abandoned Stripe Checkout: expire the session and release the dates immediately instead of
 * waiting for the hold to lapse. If the session was in fact paid, the payment is applied instead.
 */
export async function releaseAbandonedCheckout(booking: Booking): Promise<Booking> {
  if (booking.status !== "awaiting_payment") return booking;
  const repo = getRepository();
  if (booking.stripeSessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(booking.stripeSessionId);
      if (session.status === "complete") return (await applyCheckoutSession(session)) ?? booking;
      if (session.status === "open") await getStripe().checkout.sessions.expire(session.id);
    } catch (error) {
      console.error("[booking] could not expire checkout session", error);
      return booking; // keep the hold; it lapses on its own
    }
  }
  return (
    (await repo.updateBookingIf(booking.id, { status: "awaiting_payment" }, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      adminNote: [booking.adminNote, "Guest abandoned checkout"].filter(Boolean).join("\n"),
    })) ?? (await repo.getBooking(booking.id)) ?? booking
  );
}

/** URL of the guest's still-open Stripe Checkout page, if any (to finish an interrupted payment). */
export async function openCheckoutUrl(booking: Booking): Promise<string | null> {
  if (booking.status !== "awaiting_payment" || !booking.stripeSessionId || !isStripeConfigured()) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(booking.stripeSessionId);
    return session.status === "open" ? session.url : null;
  } catch (error) {
    console.error("[booking] could not load checkout session", error);
    return null;
  }
}
