import { describe, expect, it } from "vitest";
import { bookingBlocksCalendar, occupiedNights, occupiedRanges, validateStayDates } from "@/lib/availability";
import { addDays, diffDays, eachNight, isIsoDate, rangesOverlap, todayAtProperty } from "@/lib/dates";

describe("dates", () => {
  it("validates ISO days strictly", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("2027-2-3")).toBe(false);
  });

  it("does arithmetic across month and DST boundaries", () => {
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDays("2027-10-30", "2027-11-02")).toBe(3);
    expect(eachNight("2027-01-30", "2027-02-02")).toEqual(["2027-01-30", "2027-01-31", "2027-02-01"]);
  });

  it("treats ranges as half-open so back-to-back stays do not overlap", () => {
    expect(rangesOverlap("2027-05-01", "2027-05-05", "2027-05-05", "2027-05-08")).toBe(false);
    expect(rangesOverlap("2027-05-01", "2027-05-06", "2027-05-05", "2027-05-08")).toBe(true);
  });

  it("computes today in Sofia regardless of server time zone", () => {
    expect(todayAtProperty(new Date("2027-06-30T22:30:00Z"))).toBe("2027-07-01"); // UTC+3 in summer
  });
});

describe("bookingBlocksCalendar", () => {
  const now = new Date("2027-01-01T12:00:00Z");
  it("blocks for confirmed and live holds, not for cancelled or expired holds", () => {
    expect(bookingBlocksCalendar({ status: "confirmed", holdExpiresAt: null }, now)).toBe(true);
    expect(bookingBlocksCalendar({ status: "pending", holdExpiresAt: null }, now)).toBe(true);
    expect(bookingBlocksCalendar({ status: "awaiting_payment", holdExpiresAt: "2027-01-01T12:10:00Z" }, now)).toBe(true);
    expect(bookingBlocksCalendar({ status: "awaiting_payment", holdExpiresAt: "2027-01-01T11:59:00Z" }, now)).toBe(false);
    expect(bookingBlocksCalendar({ status: "cancelled", holdExpiresAt: null }, now)).toBe(false);
  });
});

describe("availability", () => {
  const ranges = occupiedRanges(
    [
      { checkIn: "2027-05-10", checkOut: "2027-05-14", status: "confirmed", holdExpiresAt: null },
      { checkIn: "2027-05-20", checkOut: "2027-05-22", status: "cancelled", holdExpiresAt: null },
    ],
    [{ startDate: "2027-05-25", endDate: "2027-05-27" }],
  );
  const opts = { bookingWindowDays: 365, today: "2027-05-01" };

  it("lists occupied nights in a window", () => {
    expect(occupiedNights(ranges, "2027-05-12", "2027-05-26")).toEqual(["2027-05-12", "2027-05-13", "2027-05-25"]);
  });

  it("accepts free ranges including same-day turnover", () => {
    expect(validateStayDates("2027-05-14", "2027-05-18", ranges, opts)).toBeNull();
    expect(validateStayDates("2027-05-07", "2027-05-10", ranges, opts)).toBeNull();
    expect(validateStayDates("2027-05-20", "2027-05-22", ranges, opts)).toBeNull(); // cancelled booking ignored
  });

  it("rejects overlaps, past dates and dates beyond the window", () => {
    expect(validateStayDates("2027-05-12", "2027-05-15", ranges, opts)).toBe("unavailable");
    expect(validateStayDates("2027-05-24", "2027-05-26", ranges, opts)).toBe("unavailable");
    expect(validateStayDates("2027-04-28", "2027-05-02", ranges, opts)).toBe("in_past");
    expect(validateStayDates("2028-06-01", "2028-06-03", ranges, opts)).toBe("too_far");
    expect(validateStayDates("2027-05-03", "2027-05-03", ranges, opts)).toBe("invalid_dates");
    expect(validateStayDates("bad", "2027-05-03", ranges, opts)).toBe("invalid_dates");
  });
});
