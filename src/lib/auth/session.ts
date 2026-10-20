// Admin session tokens: `<username>.<expiresAtMs>.<hmac>` signed with ADMIN_SESSION_SECRET.
// Uses Web Crypto only so it works in proxy.ts, route handlers and server actions alike.

export const SESSION_COOKIE = "ab_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

/** Development-only fallback so demo mode works out of the box; production refuses to use it. */
const DEV_FALLBACK_SECRET = "dev-only-insecure-session-secret-change-me";

export function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("ADMIN_SESSION_SECRET must be set (at least 32 characters) in production");
  }
  return DEV_FALLBACK_SECRET;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(username: string, now = Date.now(), secret = sessionSecret()): Promise<string> {
  const payload = `${Buffer.from(username).toString("base64url")}.${now + SESSION_TTL_SECONDS * 1000}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
  secret = sessionSecret(),
): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [user, expires, sig] = parts;
  const expected = await hmac(`${user}.${expires}`, secret);
  if (!timingSafeEqualStr(sig, expected)) return null;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return { username: Buffer.from(user, "base64url").toString() };
}
