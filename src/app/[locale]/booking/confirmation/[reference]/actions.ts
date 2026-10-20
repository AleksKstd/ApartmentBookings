"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n";
import { releaseAbandonedCheckout } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { tokenMatches } from "@/lib/tokens";

/** "Try again" after an abandoned payment: releases the held dates, then reopens the booking form. */
export async function retryBooking(formData: FormData) {
  const locale = isLocale(formData.get("locale")) ? (formData.get("locale") as "bg" | "en") : "bg";
  const reference = String(formData.get("reference") ?? "");
  const booking = /^AB-[A-Z0-9]{6}$/.test(reference) ? await getRepository().getBookingByReference(reference) : null;
  if (!booking || !tokenMatches(formData.get("token"), booking.accessToken)) redirect(`/${locale}/booking`);
  const result = await releaseAbandonedCheckout(booking);
  if (result.status === "confirmed") {
    redirect(`/${locale}/booking/confirmation/${result.reference}?t=${result.accessToken}`);
  }
  redirect(`/${locale}/booking?checkIn=${booking.checkIn}&checkOut=${booking.checkOut}&guests=${booking.guests}`);
}
