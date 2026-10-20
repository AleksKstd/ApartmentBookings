import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

// Format: scrypt:<salt base64url>:<hash base64url> (no "$", which .env files would expand)  (generate with `npm run hash-password`)
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const DEMO_ADMIN_USERNAME = "admin";
export const DEMO_ADMIN_PASSWORD = "demo-admin-2026";

/**
 * Checks admin credentials against ADMIN_USERNAME / ADMIN_PASSWORD_HASH. When neither is set
 * and the app runs in demo mode, the documented demo credentials are accepted instead (in a
 * production build only when DEMO_MODE=true is set explicitly).
 */
export async function verifyAdminCredentials(username: string, password: string, demoMode: boolean): Promise<boolean> {
  const envUser = process.env.ADMIN_USERNAME;
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envUser && envHash) {
    const passwordOk = await verifyPassword(password, envHash); // always run: constant work per attempt
    return passwordOk && safeEqual(username, envUser);
  }
  const demoAllowed = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
  if (demoMode && demoAllowed) {
    return safeEqual(username, DEMO_ADMIN_USERNAME) && safeEqual(password, DEMO_ADMIN_PASSWORD);
  }
  return false;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
