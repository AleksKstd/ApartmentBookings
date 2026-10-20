import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const secret = "x".repeat(40);

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken("owner", 1_000, secret);
    expect(await verifySessionToken(token, 2_000, secret)).toEqual({ username: "owner" });
  });

  it("rejects expired, tampered and foreign-secret tokens", async () => {
    const token = await createSessionToken("owner", 1_000, secret);
    expect(await verifySessionToken(token, 1_000 + 13 * 3600 * 1000, secret)).toBeNull();
    const [u, exp, sig] = token.split(".");
    expect(await verifySessionToken(`${u}.${Number(exp) + 1000}.${sig}`, 2_000, secret)).toBeNull();
    expect(await verifySessionToken(token, 2_000, "y".repeat(40))).toBeNull();
    expect(await verifySessionToken("garbage", 2_000, secret)).toBeNull();
    expect(await verifySessionToken(undefined, 2_000, secret)).toBeNull();
  });
});

describe("password hashing", () => {
  it("verifies scrypt hashes", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit per window", () => {
    const key = `t-${Math.random()}`;
    expect([1, 2, 3, 4].map(() => rateLimit(key, 3, 1000, 0))).toEqual([true, true, true, false]);
    expect(rateLimit(key, 3, 1000, 1001)).toBe(true);
  });
});
