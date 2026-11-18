// Content Security Policy, built per request with a fresh nonce (see proxy.ts). Scripts must carry
// the nonce — Next.js adds it to its own scripts automatically — so injected inline scripts cannot run.

function supabaseOrigin(): string {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
}

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV === "development"): string {
  const supabase = supabaseOrigin();
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Style attributes (React `style={…}`) cannot carry a nonce; styles cannot execute code.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabase}${isDev ? " ws:" : ""}`.replace(/\s+/g, " ").trim(),
    "frame-src https://www.openstreetmap.org",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Policy for everything that is not an HTML page (API JSON, iCal, files). */
export const NON_PAGE_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
