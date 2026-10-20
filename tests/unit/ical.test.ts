import { describe, expect, it } from "vitest";
import { buildIcal, parseIcal } from "@/lib/ical";

const airbnb = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20270614",
  "DTSTART;VALUE=DATE:20270610",
  "UID:1418fb94e984-abc@airbnb.com",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20270701",
  "UID:single-day",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20270801T120000Z",
  "DTEND:20270803T090000Z",
  "UID:datetime@booking.com",
  "SUMMARY:CLOSED - Not avail",
  " able",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20270901",
  "DTEND;VALUE=DATE:20270905",
  "STATUS:CANCELLED",
  "UID:cancelled",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcal", () => {
  const events = parseIcal(airbnb);

  it("parses all-day events with exclusive end dates", () => {
    expect(events[0]).toEqual({ uid: "1418fb94e984-abc@airbnb.com", start: "2027-06-10", end: "2027-06-14", summary: "Reserved" });
  });

  it("defaults a missing DTEND to one night", () => {
    expect(events[1]).toMatchObject({ start: "2027-07-01", end: "2027-07-02" });
  });

  it("converts UTC date-times to property-local days and unfolds long lines", () => {
    expect(events[2]).toMatchObject({ start: "2027-08-01", end: "2027-08-03", summary: "CLOSED - Not available" });
  });

  it("skips cancelled events", () => {
    expect(events.find((e) => e.uid === "cancelled")).toBeUndefined();
    expect(events).toHaveLength(3);
  });
});

describe("buildIcal", () => {
  it("produces a feed that round-trips through the parser", () => {
    const text = buildIcal("Test, calendar", [
      { uid: "b1@site", start: "2027-06-10", end: "2027-06-14", summary: "Booked; direct" },
    ], new Date("2027-01-01T00:00:00Z"));
    expect(text).toContain("DTSTART;VALUE=DATE:20270610");
    expect(text).toContain("X-WR-CALNAME:Test\\, calendar");
    expect(text.endsWith("\r\n")).toBe(true);
    expect(parseIcal(text)).toEqual([{ uid: "b1@site", start: "2027-06-10", end: "2027-06-14", summary: "Booked; direct" }]);
  });

  it("folds lines longer than 75 octets", () => {
    const text = buildIcal("x", [{ uid: "u", start: "2027-01-01", end: "2027-01-02", summary: "Я".repeat(80) }]);
    for (const line of text.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(parseIcal(text)[0].summary).toBe("Я".repeat(80));
  });
});
