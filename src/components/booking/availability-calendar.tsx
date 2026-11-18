"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  calendarHelp: string;
  pastDay: string;
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
  const weekdayLong = useMemo(() => {
    const f = new Intl.DateTimeFormat(intlLocale, { weekday: "long", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => f.format(parseDay(addDays("2024-01-01", i))));
  }, [intlLocale]);

  const helpId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // Roving tabindex (WAI-ARIA APG date grid): exactly one day is in the tab order; arrows move it.
  const [focusDay, setFocusDay] = useState(() => checkIn ?? today);
  const keyboardMoved = useRef(false);
  const firstSelectable = today;

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

  const minDay = firstMonth;
  const maxDay = addDays(addMonths(lastMonth, 1), -1);
  const clampDay = (d: string) => (d < minDay ? minDay : d > maxDay ? maxDay : d);

  // The roving day must be inside the visible months; otherwise the first visible day takes its place.
  const visibleEnd = addDays(addMonths(month, months), -1);
  const activeDay = focusDay >= month && focusDay <= visibleEnd ? focusDay : focusDay < firstSelectable && month <= firstSelectable ? firstSelectable : month;

  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    rootRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, month]);

  function moveFocus(to: string) {
    const day = clampDay(to);
    // The second month is hidden on small screens, so only one month counts as visible there.
    const shown = months > 1 && window.matchMedia("(min-width: 768px)").matches ? months : 1;
    const target = startOfMonth(day);
    if (target < month) setMonth(target);
    else if (target > addMonths(month, shown - 1)) setMonth(addMonths(target, -(shown - 1)));
    keyboardMoved.current = true;
    setFocusDay(day);
  }

  function onGridKeyDown(e: React.KeyboardEvent, day: string) {
    const isoWeekday = (weekday(day) + 6) % 7; // 0 = Monday
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -isoWeekday),
      End: () => addDays(day, 6 - isoWeekday),
      PageUp: () => shiftMonths(day, e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(day, e.shiftKey ? 12 : 1),
    };
    const next = keys[e.key];
    if (!next) return;
    e.preventDefault();
    moveFocus(next());
  }

  return (
    <div aria-label={labels.calendarLabel} role="group" ref={rootRef}>
      <p id={helpId} className="sr-only">{labels.calendarHelp}</p>
      <p className="sr-only" aria-live="polite">
        {Array.from({ length: months }, (_, i) => monthFmt.format(parseDay(addMonths(month, i)))).join(", ")}
      </p>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost px-2.5"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={month <= firstMonth}
          aria-label={labels.prevMonth}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-ghost px-2.5"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={addMonths(month, months - 1) >= lastMonth}
          aria-label={labels.nextMonth}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className={cn("grid gap-8", months > 1 && "md:grid-cols-2")}>
        {Array.from({ length: months }, (_, i) => addMonths(month, i)).map((m, mi) => {
          const offset = (weekday(m) + 6) % 7; // Monday-first grid
          const total = daysInMonth(m);
          const cells: (string | null)[] = [
            ...Array.from({ length: offset }, () => null),
            ...Array.from({ length: total }, (_, d) => addDays(m, d)),
          ];
          while (cells.length % 7) cells.push(null);
          const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
          const headingId = `${helpId}-m${mi}`;
          return (
            <div key={m} className={cn(mi > 0 && "hidden md:block")}>
              <h3 id={headingId} className="mb-3 text-center font-sans text-base font-semibold text-sea-900 first-letter:uppercase">
                {monthFmt.format(parseDay(m))}
              </h3>
              <div role="grid" aria-labelledby={headingId} aria-describedby={helpId}>
                <div role="row" className="grid grid-cols-7 text-center text-xs font-medium uppercase text-ink-soft">
                  {weekdayNames.map((w, wi) => (
                    <div key={w} role="columnheader" className="py-1">
                      <abbr title={weekdayLong[wi]} className="no-underline">{w}</abbr>
                    </div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} role="row" className="mt-1 grid grid-cols-7">
                    {week.map((day, ci) => {
                      if (!day) return <div key={`pad-${ci}`} role="gridcell" />;
                      const s = dayState(day);
                      const isStart = day === checkIn;
                      const isEnd = day === checkOut;
                      const between = inRange(day);
                      const status = isStart || isEnd
                        ? labels.selected
                        : s.past
                          ? labels.pastDay
                          : s.isOccupied
                            ? labels.unavailable
                            : s.selectable
                              ? labels.available
                              : labels.unavailable;
                      return (
                        <div
                          key={day}
                          role="gridcell"
                          aria-selected={isStart || isEnd || Boolean(between)}
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
                            tabIndex={day === activeDay ? 0 : -1}
                            onClick={() => {
                              setFocusDay(day);
                              select(day);
                            }}
                            onKeyDown={(e) => onGridKeyDown(e, day)}
                            aria-disabled={!s.selectable || undefined}
                            aria-label={`${dayFmt.format(parseDay(day))}, ${status}`}
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
                            {Number(day.slice(8))}
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

/** Same day-of-month `n` months away, clamped to that month's length (31 Jan + 1 month → 28/29 Feb). */
function shiftMonths(day: string, n: number): string {
  const target = addMonths(startOfMonth(day), n);
  const dom = Math.min(Number(day.slice(8)), daysInMonth(target));
  return addDays(target, dom - 1);
}
