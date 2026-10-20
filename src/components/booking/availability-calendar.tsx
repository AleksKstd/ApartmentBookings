"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, daysInMonth, parseDay, startOfMonth, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface CalendarLabels {
  calendarLabel: string;
  prevMonth: string;
  nextMonth: string;
  available: string;
  unavailable: string;
  selected: string;
}

interface Props {
  locale: "bg" | "en";
  today: string;
  lastDay: string; // last selectable check-out day
  occupied: Set<string>;
  checkIn: string | null;
  checkOut: string | null;
  minNightsFor: (checkIn: string) => number;
  onChange: (range: { checkIn: string | null; checkOut: string | null }) => void;
  labels: CalendarLabels;
  months?: number;
}

/** First occupied night at or after `from` — the latest possible check-out for a stay starting at `from`. */
function nextOccupied(from: string, occupied: Set<string>, lastDay: string): string {
  for (let d = from; d <= lastDay; d = addDays(d, 1)) if (occupied.has(d)) return d;
  return lastDay;
}

export function AvailabilityCalendar({
  locale,
  today,
  lastDay,
  occupied,
  checkIn,
  checkOut,
  minNightsFor,
  onChange,
  labels,
  months = 2,
}: Props) {
  const [month, setMonth] = useState(() => startOfMonth(checkIn ?? today));
  const intlLocale = locale === "bg" ? "bg-BG" : "en-GB";
  const firstMonth = startOfMonth(today);
  const lastMonth = startOfMonth(lastDay);

  const monthFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" }), [intlLocale]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), [intlLocale]);
  const weekdayNames = useMemo(() => {
    const f = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => f.format(parseDay(addDays("2024-01-01", i)))); // 2024-01-01 is a Monday
  }, [intlLocale]);

  const picking = checkIn && !checkOut;
  const checkoutLimit = picking ? nextOccupied(checkIn, occupied, lastDay) : null;
  const minCheckout = picking ? addDays(checkIn, minNightsFor(checkIn)) : null;

  function dayState(day: string) {
    const past = day < today || day > lastDay;
    const isOccupied = occupied.has(day);
    if (picking) {
      const validCheckout = day > checkIn! && day <= checkoutLimit! && day >= minCheckout!;
      const canRestart = !past && !isOccupied && day !== checkIn;
      return { selectable: validCheckout || canRestart, isOccupied, past, validCheckout };
    }
    return { selectable: !past && !isOccupied && day < lastDay, isOccupied, past, validCheckout: false };
  }

  function select(day: string) {
    const state = dayState(day);
    if (!state.selectable) return;
    if (picking && state.validCheckout) onChange({ checkIn, checkOut: day });
    else onChange({ checkIn: day, checkOut: null });
  }

  const inRange = (day: string) => checkIn && checkOut && day > checkIn && day < checkOut;

  return (
    <div aria-label={labels.calendarLabel} role="group">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost px-2.5"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={month <= firstMonth}
          aria-label={labels.prevMonth}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="btn-ghost px-2.5"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={addMonths(month, months - 1) >= lastMonth}
          aria-label={labels.nextMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("grid gap-8", months > 1 && "md:grid-cols-2")}>
        {Array.from({ length: months }, (_, i) => addMonths(month, i)).map((m, mi) => {
          const offset = (weekday(m) + 6) % 7; // Monday-first grid
          const total = daysInMonth(m);
          return (
            <div key={m} className={cn(mi > 0 && "hidden md:block")}>
              <h3 className="mb-3 text-center font-sans text-base font-semibold capitalize text-sea-900" aria-live="polite">
                {monthFmt.format(parseDay(m))}
              </h3>
              <div className="grid grid-cols-7 text-center text-xs font-medium uppercase text-ink-soft" aria-hidden>
                {weekdayNames.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: offset }, (_, k) => (
                  <div key={`pad-${k}`} />
                ))}
                {Array.from({ length: total }, (_, d) => {
                  const day = addDays(m, d);
                  const s = dayState(day);
                  const isStart = day === checkIn;
                  const isEnd = day === checkOut;
                  const between = inRange(day);
                  const status = isStart || isEnd ? labels.selected : s.isOccupied ? labels.unavailable : s.past ? "" : labels.available;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex justify-center",
                        between && "bg-sea-100",
                        isStart && checkOut && "rounded-l-full bg-sea-100",
                        isEnd && "rounded-r-full bg-sea-100",
                      )}
                    >
                      <button
                        type="button"
                        data-day={day}
                        onClick={() => select(day)}
                        disabled={!s.selectable}
                        aria-pressed={isStart || isEnd}
                        aria-label={`${dayFmt.format(parseDay(day))}${status ? `, ${status}` : ""}`}
                        className={cn(
                          "relative grid h-10 w-10 place-items-center rounded-full text-sm transition-colors sm:h-11 sm:w-11",
                          s.selectable && "hover:bg-sea-200 font-medium text-sea-900",
                          !s.selectable && "cursor-not-allowed text-ink-soft/60",
                          s.isOccupied && !s.past && "bg-sand-200 line-through decoration-ink-soft/70",
                          picking && s.validCheckout && "text-sea-900",
                          (isStart || isEnd) && "bg-sea-700 font-semibold text-white hover:bg-sea-800",
                          day === today && !(isStart || isEnd) && "ring-1 ring-inset ring-clay-500",
                        )}
                      >
                        {d + 1}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-4 text-xs text-ink-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-sea-200 bg-white" />{labels.available}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sand-300" />{labels.unavailable}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sea-700" />{labels.selected}</span>
      </div>
    </div>
  );
}
