import { NextResponse, type NextRequest } from "next/server";
import { bookingBlocksCalendar } from "@/lib/availability";
import { getRepository } from "@/lib/data";
import { addDays, todayAtProperty } from "@/lib/dates";
import { buildIcal } from "@/lib/ical";
import { siteUrl } from "@/lib/site-url";
import { tokenMatches } from "@/lib/tokens";

/**
 * iCal export for Airbnb / Booking.com: `/api/calendar/export?token=…`.
 * Contains only dates (no guest data). Imported feeds are NOT re-exported to avoid sync loops.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.ICAL_EXPORT_TOKEN;
  if (!expected || expected.length < 16) {
    return new NextResponse("Calendar export is not configured", { status: 404 });
  }
  if (!tokenMatches(request.nextUrl.searchParams.get("token"), expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const repo = getRepository();
  const from = addDays(todayAtProperty(), -30);
  const [settings, bookings, blocked] = await Promise.all([
    repo.getSettings(),
    repo.listBookings({ status: ["pending", "awaiting_payment", "confirmed"], from }),
    repo.listBlockedRanges(),
  ]);
  const host = new URL(siteUrl()).hostname;
  const events = [
    ...bookings
      .filter((b) => bookingBlocksCalendar(b))
      .map((b) => ({ uid: `${b.id}@${host}`, start: b.checkIn, end: b.checkOut, summary: "Reserved" })),
    ...blocked
      .filter((b) => b.source === "manual" && b.endDate > from)
      .map((b) => ({ uid: `${b.id}@${host}`, start: b.startDate, end: b.endDate, summary: "Not available" })),
  ];

  return new NextResponse(buildIcal(settings.property.name, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="availability.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
