import { diffDays, eachNight, isIsoDate, rangesOverlap, todayAtProperty } from "./dates";
import type { BlockedRange, Booking } from "./types";

/** A booking occupies the calendar while confirmed, or while pending/awaiting payment and its hold is live. */
export function bookingBlocksCalendar(booking: Pick<Booking, "status" | "holdExpiresAt">, now: Date = new Date()): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "cancelled") return false;
  if (!booking.holdExpiresAt) return true;
  return new Date(booking.holdExpiresAt).getTime() > now.getTime();
}

export interface OccupiedRange {
  start: string; // first occupied night
  end: string; // exclusive
}

export function occupiedRanges(
  bookings: Pick<Booking, "checkIn" | "checkOut" | "status" | "holdExpiresAt">[],
  blocked: Pick<BlockedRange, "startDate" | "endDate">[],
  now: Date = new Date(),
): OccupiedRange[] {
  return [
    ...bookings.filter((b) => bookingBlocksCalendar(b, now)).map((b) => ({ start: b.checkIn, end: b.checkOut })),
    ...blocked.map((b) => ({ start: b.startDate, end: b.endDate })),
  ];
}

/** Set of occupied nights between `from` and `to` (exclusive), for rendering the calendar. */
export function occupiedNights(ranges: OccupiedRange[], from: string, to: string): string[] {
  const nights = new Set<string>();
  for (const r of ranges) {
    if (!rangesOverlap(r.start, r.end, from, to)) continue;
    const start = r.start > from ? r.start : from;
    const end = r.end < to ? r.end : to;
    for (const n of eachNight(start, end)) nights.add(n);
  }
  return [...nights].sort();
}

export type RangeProblem =
  | "invalid_dates"
  | "in_past"
  | "too_far"
  | "unavailable";

export function validateStayDates(
  checkIn: string,
  checkOut: string,
  ranges: OccupiedRange[],
  options: { bookingWindowDays: number; today?: string },
): RangeProblem | null {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) return "invalid_dates";
  const today = options.today ?? todayAtProperty();
  if (checkIn < today) return "in_past";
  if (diffDays(today, checkOut) > options.bookingWindowDays) return "too_far";
  if (ranges.some((r) => rangesOverlap(checkIn, checkOut, r.start, r.end))) return "unavailable";
  return null;
}

/** The first occupied night on or after `checkIn` — guests may check out on that day at the latest. */
export function latestCheckOut(checkIn: string, ranges: OccupiedRange[]): string | null {
  let best: string | null = null;
  for (const r of ranges) {
    const candidate = r.start >= checkIn ? r.start : r.end > checkIn ? checkIn : null;
    if (candidate && (best === null || candidate < best)) best = candidate;
  }
  return best;
}
