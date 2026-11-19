"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

const MD_UP = "(min-width: 768px)";
function subscribeMdUp(onChange: () => void) {
  const mq = window.matchMedia(MD_UP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const dayOfMonth = (day: string) => Number(day.slice(8, 10));
/** Same day number in another month, clamped to that month's length (31 Jan + 1 month → 28/29 Feb). */
function shiftMonth(day: string, amount: number): string {
  const target = addMonths(startOfMonth(day), amount);
  return addDays(target, Math.min(dayOfMonth(day), daysInMonth(target)) - 1);
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
  // Two months side by side from md up; phones show one. Keyboard paging follows what is on screen.
  const mdUp = useSyncExternalStore(subscribeMdUp, () => window.matchMedia(MD_UP).matches, () => false);
  const visibleMonths = mdUp ? months : 1;
  const lastVisibleMonth = addMonths(month, visibleMonths - 1);

  const monthFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" }), [intlLocale]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), [intlLocale]);
  const weekdayNames = useMemo(() => {
    const short = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(intlLocale, { weekday: "long", timeZone: "UTC" });
    // 2024-01-01 is a Monday
    return Array.from({ length: 7 }, (_, i) => ({ short: short.format(parseDay(addDays("2024-01-01", i))), long: long.format(parseDay(addDays("2024-01-01", i))) }));
  }, [intlLocale]);

  // Roving focus: the whole calendar is one Tab stop; arrow keys move between days.
  const [activeDay, setActiveDay] = useState(() => checkIn ?? today);
  const focusPending = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const isVisible = (day: string) => startOfMonth(day) >= month && startOfMonth(day) <= lastVisibleMonth;
  const tabDay = isVisible(activeDay) ? activeDay : month;

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    gridRef.current?.querySelector<HTMLElement>(`button[data-day="${activeDay}"]`)?.focus();
  }, [activeDay, month]);

  function moveTo(day: string) {
    const min = firstMonth;
    const max = addDays(lastMonth, daysInMonth(lastMonth) - 1);
    const next = day < min ? min : day > max ? max : day;
    const nextMonth = startOfMonth(next);
    if (nextMonth < month) setMonth(nextMonth);
    else if (nextMonth > lastVisibleMonth) setMonth(addMonths(nextMonth, -(visibleMonths - 1)));
    focusPending.current = true;
    setActiveDay(next);
  }

  function onDayKey(e: React.KeyboardEvent, day: string) {
    const fromMonday = (weekday(day) + 6) % 7;
    const target =
      e.key === "ArrowRight" ? addDays(day, 1)
      : e.key === "ArrowLeft" ? addDays(day, -1)
      : e.key === "ArrowDown" ? addDays(day, 7)
      : e.key === "ArrowUp" ? addDays(day, -7)
      : e.key === "Home" ? addDays(day, -fromMonday)
      : e.key === "End" ? addDays(day, 6 - fromMonday)
      : e.key === "PageUp" ? shiftMonth(day, -1)
      : e.key === "PageDown" ? shiftMonth(day, 1)
      : null;
    if (!target) return;
    e.preventDefault();
    moveTo(target);
  }

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
    setActiveDay(day);
    const state = dayState(day);
    if (!state.selectable) return;
    if (picking && state.validCheckout) onChange({ checkIn, checkOut: day });
    else onChange({ checkIn: day, checkOut: null });
  }

  const inRange = (day: string) => checkIn && checkOut && day > checkIn && day < checkOut;

  const visibleLabel = Array.from({ length: visibleMonths }, (_, i) => monthFmt.format(parseDay(addMonths(month, i)))).join(" – ");

  return (
    <div aria-label={labels.calendarLabel} role="group" ref={gridRef}>
      {/* One announcement per page turn, instead of one per month heading. */}
      <p className="sr-only" aria-live="polite">{visibleLabel}</p>
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
          const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: total }, (_, d) => addDays(m, d))];
          while (cells.length % 7) cells.push(null);
          const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
          const headingId = `cal-${m}`;
          return (
            <div key={m} className={cn(mi > 0 && "hidden md:block")}>
              <h3 id={headingId} className="mb-3 text-center font-sans text-base font-semibold capitalize text-sea-900">
                {monthFmt.format(parseDay(m))}
              </h3>
              <div role="grid" aria-labelledby={headingId} className="space-y-1">
                <div role="row" className="grid grid-cols-7 text-center text-xs font-medium uppercase text-ink-muted">
                  {weekdayNames.map((w) => (
                    <div key={w.long} role="columnheader" aria-label={w.long} className="py-1">{w.short}</div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} role="row" className="grid grid-cols-7">
                    {week.map((day, di) => {
                      if (!day) return <div key={`pad-${wi}-${di}`} role="gridcell" />;
                      const s = dayState(day);
                      const isStart = day === checkIn;
                      const isEnd = day === checkOut;
                      const between = inRange(day);
                      const status = isStart || isEnd ? labels.selected : s.isOccupied ? labels.unavailable : s.past ? "" : labels.available;
                      return (
                        <div
                          key={day}
                          role="gridcell"
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
                            tabIndex={day === tabDay ? 0 : -1}
                            onClick={() => select(day)}
                            onKeyDown={(e) => onDayKey(e, day)}
                            // aria-disabled (not disabled) keeps unavailable days reachable by arrow keys.
                            aria-disabled={!s.selectable || undefined}
                            aria-pressed={isStart || isEnd}
                            aria-label={`${dayFmt.format(parseDay(day))}${status ? `, ${status}` : ""}`}
                            className={cn(
                              "relative grid h-10 w-10 place-items-center rounded-full text-sm transition-colors sm:h-11 sm:w-11",
                              s.selectable && "font-medium text-sea-900 hover:bg-sea-200",
                              !s.selectable && "cursor-not-allowed text-ink-soft/60",
                              s.isOccupied && !s.past && "bg-sand-200 line-through decoration-ink-soft/70",
                              picking && s.validCheckout && "text-sea-900",
                              (isStart || isEnd) && "bg-sea-700 font-semibold text-white hover:bg-sea-800",
                              day === today && !(isStart || isEnd) && "ring-1 ring-inset ring-clay-500",
                            )}
                          >
                            {dayOfMonth(day)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
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
