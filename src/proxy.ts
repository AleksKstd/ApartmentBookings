import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { buildCsp, generateNonce } from "@/lib/csp";

const LOCALES = ["bg", "en"] as const;
export const LOCALE_COOKIE = "NEXT_LOCALE";

function preferredLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  const ranked = accept
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const match = ranked.find((r) => (LOCALES as readonly string[]).includes(r.lang));
  return match?.lang ?? "bg";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return withLocaleHeader(request, "bg");
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return withLocaleHeader(request, "bg");
  }

  const segment = pathname.split("/")[1];
  if ((LOCALES as readonly string[]).includes(segment)) return withLocaleHeader(request, segment);

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

/**
 * Tells the root layout which `lang` to render without making it parse the URL, and attaches a
 * per-request nonce-based Content Security Policy (Next.js reads the nonce from the request header).
 */
function withLocaleHeader(request: NextRequest, locale: string) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Admin paths are always matched (even with dots); public paths skip assets and API routes.
  matcher: ["/admin/:path*", "/admin", "/((?!api|_next/static|_next/image|admin|.*\\..*).*)"],
};
