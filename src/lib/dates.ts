// Calendar-day helpers operating on "YYYY-MM-DD" strings in UTC, so results never depend on
// the server's or the browser's time zone.

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const PROPERTY_TIME_ZONE = "Europe/Sofia";

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = parseDay(value);
  return !Number.isNaN(d.getTime()) && formatDay(d) === value;
}

export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + amount);
  return formatDay(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** Every night of a stay: check-in inclusive, check-out exclusive. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(d);
  return nights;
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(day: string): number {
  return parseDay(day).getUTCDay();
}

/** Today's date at the property (Europe/Sofia), independent of server time zone. */
export function todayAtProperty(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(monthStart: string, amount: number): string {
  const d = parseDay(monthStart);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + amount);
  return formatDay(d);
}

export function daysInMonth(monthStart: string): number {
  const d = parseDay(monthStart);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
