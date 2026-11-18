import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/lib/csp";
import { localizedAlternates } from "@/lib/seo";
import { hashKey, sharedRateLimit } from "@/lib/rate-limit";
import { parseIcal } from "@/lib/ical";

describe("content security policy", () => {
  it("allows scripts only with the per-request nonce in production", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self' https://checkout.stripe.com");
  });

  it("generates unique nonces", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe("hreflang and canonical URLs", () => {
  it("point each page at itself in both languages", () => {
    expect(localizedAlternates("en", "/gallery")).toEqual({
      canonical: "/en/gallery",
      languages: { "bg-BG": "/bg/gallery", "en-GB": "/en/gallery", "x-default": "/bg/gallery" },
    });
    expect(localizedAlternates("bg", "/")?.canonical).toBe("/bg");
  });
});

describe("shared rate limiting", () => {
  it("uses the shared store when available and never stores raw keys", async () => {
    const seen: string[] = [];
    const store = { hitRateLimit: async (key: string, limit: number) => (seen.push(key), seen.length <= limit) };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await sharedRateLimit(store, "login:203.0.113.9", 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
    expect(seen[0]).toBe(hashKey("login:203.0.113.9"));
    expect(seen[0]).not.toContain("203.0.113.9");
  });

  it("falls back to memory when the store fails", async () => {
    const store = { hitRateLimit: async () => { throw new Error("db down"); } };
    expect(await sharedRateLimit(store, "booking:fallback", 1, 60_000)).toBe(true);
    expect(await sharedRateLimit(store, "booking:fallback", 1, 60_000)).toBe(false);
  });
});

describe("iCal parsing edge cases", () => {
  it("treats an impossible end date as a one-night block instead of failing the whole sync", () => {
    const events = parseIcal(["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:x", "DTSTART;VALUE=DATE:20270227", "DTEND;VALUE=DATE:20270231", "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
    expect(events).toEqual([{ uid: "x", start: "2027-02-27", end: "2027-02-28", summary: "" }]);
  });
});
