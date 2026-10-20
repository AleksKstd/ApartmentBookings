import { z } from "zod";
import { isIsoDate } from "./dates";

const isoDay = z.string().refine(isIsoDate, "invalid_date");

export const bookingRequestSchema = z.object({
  checkIn: isoDay,
  checkOut: isoDay,
  guests: z.coerce.number().int().min(1).max(50),
  guestName: z.string().trim().min(2, "name").max(120, "name"),
  guestEmail: z.string().trim().toLowerCase().max(254, "email").pipe(z.email("email")),
  guestPhone: z
    .string()
    .trim()
    .max(40, "phone")
    .regex(/^\+?[0-9\s().-]{6,}$/, "phone"),
  guestNote: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
  acceptTerms: z.literal(true, { error: "terms" }),
  locale: z.enum(["bg", "en"]),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const quoteRequestSchema = z.object({
  checkIn: isoDay,
  checkOut: isoDay,
  guests: z.coerce.number().int().min(1).max(50),
});
