import { describe, expect, it } from "vitest";
import { bookingRequestSchema } from "@/lib/validation";

const valid = {
  checkIn: "2027-05-01",
  checkOut: "2027-05-04",
  guests: "2",
  guestName: "Иван Петров",
  guestEmail: "Ivan@Example.com ",
  guestPhone: "+359 88 123 4567",
  guestNote: "",
  acceptTerms: true,
  locale: "bg",
  website: "",
};

describe("bookingRequestSchema", () => {
  it("normalises a valid request", () => {
    const parsed = bookingRequestSchema.parse(valid);
    expect(parsed.guests).toBe(2);
    expect(parsed.guestEmail).toBe("ivan@example.com");
    expect(parsed.guestNote).toBeNull();
  });

  it("rejects bad input with field codes", () => {
    const result = bookingRequestSchema.safeParse({ ...valid, guestEmail: "nope", guestPhone: "abc", acceptTerms: false });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["email", "phone", "terms"]));
  });

  it("rejects filled honeypot and impossible dates", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, checkIn: "2027-02-31" }).success).toBe(false);
  });
});
