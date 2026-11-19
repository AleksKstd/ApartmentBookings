import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const LOCALES = ["bg", "en"] as const;
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Bulgarian is the default; a visitor who picked a language keeps it (cookie set by the language switch). */
function preferredLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;
  return "bg";
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

/** Tells the root layout which `lang` to render without making it parse the URL. */
function withLocaleHeader(request: NextRequest, locale: string) {
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Admin paths are always matched (even with dots); public paths skip assets and API routes.
  matcher: ["/admin/:path*", "/admin", "/((?!api|_next/static|_next/image|admin|.*\\..*).*)"],
};
