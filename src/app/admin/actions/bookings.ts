"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { closeCheckoutForCancellation, generateAccessToken, generateReference } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { diffDays, isIsoDate, rangesOverlap } from "@/lib/dates";
import { sendGuestEmail } from "@/lib/email";
import { PricingError, calculateQuote } from "@/lib/pricing";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { PricingSettings } from "@/lib/types";
import { type ActionResult, ok, fail, refreshEverything, str, parseMoney, guarded } from "./shared";

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function confirmBooking(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const booking = await repo.getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    if (booking.status === "confirmed") return ok("Резервацията вече е потвърдена.");
    const updated = await repo.updateBooking(id, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      cancelledAt: null,
      holdExpiresAt: null,
    });
    const sent = await sendGuestEmail("confirmed", updated);
    refreshEverything();
    return ok(sent ? "Потвърдена. Гостът е уведомен по имейл." : "Потвърдена. (Имейлът е записан в дневника — изпращането не е конфигурирано.)");
  });
}

export async function cancelBooking(id: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const booking = await repo.getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    if (booking.status === "cancelled") return ok("Резервацията вече е отказана.");
    // Close the guest's open Stripe payment page first, so they cannot pay for a cancelled stay.
    if ((await closeCheckoutForCancellation(booking)) === "paid") {
      refreshEverything();
      return fail("Гостът току-що плати и резервацията е потвърдена. Ако все пак искате да я откажете, опитайте отново (с възстановяване на сумата).");
    }
    const refund = formData.get("refund") === "on";
    const notify = formData.get("notify") === "on";
    let refunded = false;
    if (refund && booking.paymentStatus === "paid" && booking.stripePaymentIntent) {
      if (!isStripeConfigured()) return fail("Stripe не е конфигуриран — възстановете сумата ръчно.");
      await getStripe().refunds.create({ payment_intent: booking.stripePaymentIntent }, { idempotencyKey: `refund-${booking.id}` });
      refunded = true;
    }
    const reason = str(formData, "reason", 500);
    const updated = await repo.updateBooking(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      paymentStatus: refunded ? "refunded" : booking.paymentStatus,
      adminNote: reason ? [booking.adminNote, `Отказ: ${reason}`].filter(Boolean).join("\n") : booking.adminNote,
    });
    if (notify) await sendGuestEmail("cancelled", updated);
    refreshEverything();
    return ok(`Резервацията е отказана${refunded ? " и сумата е възстановена" : ""}.`);
  });
}

export async function markBookingPaid(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateBooking(id, { paymentStatus: "paid", holdExpiresAt: null });
    refreshEverything();
    return ok("Отбелязана като платена.");
  });
}

export async function saveAdminNote(id: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateBooking(id, { adminNote: str(formData, "adminNote", 4000) || null });
    refreshEverything();
    return ok("Бележката е запазена.");
  });
}

export async function resendGuestEmail(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const booking = await getRepository().getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    const kind = booking.status === "confirmed" ? "confirmed" : booking.status === "cancelled" ? "cancelled" : "received";
    const sent = await sendGuestEmail(kind, booking);
    return ok(sent ? "Имейлът е изпратен." : "Имейлът е записан в дневника (изпращането не е конфигурирано).");
  });
}

const manualBookingSchema = z.object({
  checkIn: z.string().refine(isIsoDate, "Невалидна дата на настаняване"),
  checkOut: z.string().refine(isIsoDate, "Невалидна дата на напускане"),
  guests: z.coerce.number().int().min(1).max(50),
  guestName: z.string().trim().min(2, "Въведете име").max(120),
  guestEmail: z.string().trim().toLowerCase().pipe(z.email("Невалиден имейл")),
  guestPhone: z.string().trim().max(40),
  guestNote: z.string().trim().max(2000),
  locale: z.enum(["bg", "en"]),
});

export async function createManualBooking(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = manualBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Невалидни данни");
    const input = parsed.data;
    if (input.checkOut <= input.checkIn) return fail("Датата на напускане трябва да е след настаняването.");
    const repo = getRepository();
    const [settings, seasons, blocked] = await Promise.all([repo.getSettings(), repo.listSeasonalRates(), repo.listBlockedRanges()]);
    if (blocked.some((b) => rangesOverlap(b.startDate, b.endDate, input.checkIn, input.checkOut))) {
      return fail("Датите са блокирани в календара (ръчно или от външен календар).");
    }
    // Admin bookings bypass guest-facing limits (min stay, guest cap) but are still priced the same way.
    const pricing: PricingSettings = { ...settings.pricing, minNights: 1, maxNights: 3650, maxGuests: Math.max(settings.pricing.maxGuests, input.guests) };
    let quote;
    try {
      quote = calculateQuote(input.checkIn, input.checkOut, input.guests, pricing, seasons.map((s) => ({ ...s, minNights: null })));
    } catch (error) {
      if (error instanceof PricingError) return fail("Невалиден период.");
      throw error;
    }
    const override = str(formData, "totalOverride", 20);
    const total = override ? parseMoney(override) : quote.total;
    const now = new Date().toISOString();
    const booking = await repo.createBooking({
      reference: generateReference(),
      accessToken: generateAccessToken(),
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone || "—",
      guestNote: input.guestNote || null,
      locale: input.locale,
      nights: diffDays(input.checkIn, input.checkOut),
      totalAmount: total,
      currency: settings.pricing.currency,
      priceBreakdown: { ...quote, total },
      status: "confirmed",
      paymentStatus: formData.get("paid") === "on" ? "paid" : "unpaid",
      stripeSessionId: null,
      stripePaymentIntent: null,
      holdExpiresAt: null,
      adminNote: "Създадена ръчно от администратор",
      confirmedAt: now,
      cancelledAt: null,
    });
    if (formData.get("notify") === "on") await sendGuestEmail("confirmed", booking);
    refreshEverything();
    redirect(`/admin/bookings/${booking.id}`);
  });
}
