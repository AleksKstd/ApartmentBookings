import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/i18n";
import { BookingError, problemMessage, quoteStay } from "@/lib/booking-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { quoteRequestSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!rateLimit(`quote:${clientIp(request.headers)}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const locale = isLocale(body?.locale) ? body.locale : "bg";
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_dates", message: problemMessage(locale, "invalid_dates") }, { status: 400 });
  }
  try {
    const quote = await quoteStay(parsed.data.checkIn, parsed.data.checkOut, parsed.data.guests);
    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.code, message: problemMessage(locale, error.code, error.detail) }, { status: 422 });
    }
    console.error("[quote]", error);
    return NextResponse.json({ error: "server", message: problemMessage(locale, "server") }, { status: 500 });
  }
}
