// Rate limiting. `rateLimit` is a fixed-window in-memory limiter (per server instance) used for cheap,
// high-volume endpoints. `sharedRateLimit` is used for login and booking: with Supabase configured it
// counts in Postgres, so the limit holds across every serverless instance; otherwise it falls back
// to memory (local/demo).

import { createHash } from "node:crypto";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

export interface RateLimitStore {
  hitRateLimit?(keyHash: string, limit: number, windowSeconds: number): Promise<boolean>;
  resetRateLimit?(keyHash: string): Promise<void>;
}

/** Keys are hashed so no raw IP addresses are stored in the database. */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("base64url");
}

export async function sharedRateLimit(store: RateLimitStore, key: string, limit: number, windowMs: number): Promise<boolean> {
  const memoryOk = rateLimit(key, limit, windowMs);
  if (!store.hitRateLimit) return memoryOk;
  try {
    return await store.hitRateLimit(hashKey(key), limit, Math.ceil(windowMs / 1000));
  } catch (error) {
    console.error("[rate-limit] shared store unavailable, using in-memory limit", error);
    return memoryOk;
  }
}

export async function resetSharedRateLimit(store: RateLimitStore, key: string): Promise<void> {
  buckets.delete(key);
  await store.resetRateLimit?.(hashKey(key)).catch(() => undefined);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Client IP for rate limiting. Vercel overwrites these headers with the real client address, so they
 * cannot be spoofed there; behind another proxy make sure it does the same.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
