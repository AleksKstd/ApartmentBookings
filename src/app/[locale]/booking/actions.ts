"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n";
import { BookingError, createGuestBooking, problemMessage } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { clientIp, sharedRateLimit } from "@/lib/rate-limit";
import { bookingRequestSchema } from "@/lib/validation";

export interface BookingFormState {
  error?: string;
  fieldErrors?: Partial<Record<"guestName" | "guestEmail" | "guestPhone" | "acceptTerms", string>>;
  /** Echoed back so the form keeps what the guest typed after a failed submit. */
  values?: { guestName: string; guestEmail: string; guestPhone: string; guestNote: string };
}

type FieldName = keyof NonNullable<BookingFormState["fieldErrors"]>;

/** Form field → the i18n error code shown under it (see booking.errors in the dictionaries). */
const FIELD_ERROR_CODES: Record<FieldName, "name" | "email" | "phone" | "terms"> = {
  guestName: "name",
  guestEmail: "email",
  guestPhone: "phone",
  acceptTerms: "terms",
};

const isFieldName = (key: string): key is FieldName => key in FIELD_ERROR_CODES;

export async function submitBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const values = {
    guestName: String(formData.get("guestName") ?? "").slice(0, 120),
    guestEmail: String(formData.get("guestEmail") ?? "").slice(0, 254),
    guestPhone: String(formData.get("guestPhone") ?? "").slice(0, 40),
    guestNote: String(formData.get("guestNote") ?? "").slice(0, 2000),
  };
  const rawLocale = formData.get("locale");
  const locale = isLocale(rawLocale) ? rawLocale : "bg";

  if (!(await sharedRateLimit(getRepository(), `booking:${clientIp(await headers())}`, 8, 10 * 60_000))) {
    return { error: problemMessage(locale, "rate_limited"), values };
  }

  const parsed = bookingRequestSchema.safeParse({
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
    guestName: formData.get("guestName") ?? "",
    guestEmail: formData.get("guestEmail") ?? "",
    guestPhone: formData.get("guestPhone") ?? "",
    guestNote: formData.get("guestNote") ?? "",
    acceptTerms: formData.get("acceptTerms") === "on",
    locale,
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: BookingFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      if (isFieldName(field) && !fieldErrors[field]) fieldErrors[field] = problemMessage(locale, FIELD_ERROR_CODES[field]);
    }
    const datesInvalid = parsed.error.issues.some((i) => ["checkIn", "checkOut", "guests"].includes(String(i.path[0])));
    return {
      error: problemMessage(locale, datesInvalid ? "invalid_dates" : "validation"),
      fieldErrors,
      values,
    };
  }

  let redirectUrl: string;
  try {
    ({ redirectUrl } = await createGuestBooking(parsed.data));
  } catch (error) {
    if (error instanceof BookingError) return { error: problemMessage(locale, error.code, error.detail), values };
    console.error("[booking] create failed", error);
    return { error: problemMessage(locale, "server"), values };
  }
  redirect(redirectUrl);
}
