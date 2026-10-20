import { addDays, isIsoDate, todayAtProperty } from "./dates";

export interface IcalEvent {
  uid: string;
  start: string; // first night (YYYY-MM-DD)
  end: string; // exclusive
  summary: string;
}

/** RFC 5545 line unfolding: a CRLF followed by a space or tab continues the previous line. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** Converts DATE or DATE-TIME values to a property-local calendar day. */
function toDay(value: string, params: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h || /VALUE=DATE(?!-)/i.test(params)) return `${y}-${mo}-${d}`;
  if (z) return todayAtProperty(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)));
  return `${y}-${mo}-${d}`; // floating or TZID time: the written date is the local date
}

export function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Record<string, { value: string; params: string }> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const startProp = current.DTSTART;
        const start = startProp && toDay(startProp.value, startProp.params);
        const endProp = current.DTEND;
        let end = endProp ? toDay(endProp.value, endProp.params) : null;
        const cancelled = current.STATUS?.value.trim().toUpperCase() === "CANCELLED";
        if (start && isIsoDate(start) && !cancelled) {
          if (!end || end <= start) end = addDays(start, 1);
          events.push({
            uid: current.UID?.value.trim() || `${start}-${end}`,
            start,
            end,
            summary: unescapeText(current.SUMMARY?.value ?? "").trim(),
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const [name, ...params] = head.split(";");
    current[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";") };
  }
  return events;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds content lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = "";
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (size + len > (out.length ? 74 : 75)) {
      out.push(chunk);
      chunk = "";
      size = 0;
    }
    chunk += ch;
    size += len;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

const compactDay = (day: string) => day.replace(/-/g, "");

export function buildIcal(
  calendarName: string,
  events: { uid: string; start: string; end: string; summary: string; description?: string }[],
  now: Date = new Date(),
): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ApartmentBookings//Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Sofia",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${escapeText(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDay(e.start)}`,
      `DTEND;VALUE=DATE:${compactDay(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
