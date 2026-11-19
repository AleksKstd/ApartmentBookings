"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n";
import { addDays } from "@/lib/dates";
import type { Locale } from "@/lib/types";

const label = "block font-display text-xs font-bold uppercase tracking-[0.14em] text-sea-100";
const lettering = "mt-1 block font-display text-2xl font-extrabold leading-tight sm:text-3xl";

/**
 * A date set into the plate. The plate's lettering is ours ("Add date", then "22 Nov"); the native date
 * input sits transparent on top of the whole field, so clicking anywhere opens the browser's picker and
 * keyboard and screen-reader use stay native.
 */
function DateField({
  id,
  name,
  text,
  value,
  min,
  placeholder,
  onChange,
  format,
  className,
}: {
  id: string;
  name: string;
  text: string;
  value: string;
  min: string;
  placeholder: string;
  onChange: (value: string) => void;
  format: (day: string) => string;
  className: string;
}) {
  return (
    <div className={`relative focus-within:outline focus-within:outline-2 focus-within:-outline-offset-[6px] focus-within:outline-white ${className}`}>
      <label htmlFor={id} className={label}>{text}</label>
      <span aria-hidden className={`${lettering} ${value ? "text-white" : "text-sea-200"}`}>{value ? format(value) : placeholder}</span>
      <input
        id={id}
        name={name}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* the browser opens its own picker or keyboard entry instead */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

/**
 * The opening's primary action: one long enamel plate with the dates and guests set into it.
 * A plain GET form, so it works before hydration; the booking page reads checkIn/checkOut/guests.
 */
export function SearchPlate({ locale, t, today, maxGuests }: { locale: Locale; t: Dictionary; today: string; maxGuests: number }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const minCheckOut = checkIn ? addDays(checkIn, 1) : addDays(today, 1);
  const short = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const format = (day: string) => short.format(new Date(`${day}T00:00:00Z`));
  const field = "border-white/35 px-4 pb-3.5 pt-3 sm:px-5";

  return (
    <form action={`/${locale}/booking`} method="get" className="plate" aria-label={t.common.checkAvailability}>
      <div className="plate-face grid grid-cols-2 sm:grid-cols-[1fr_1fr_0.8fr_auto]">
        <DateField
          id="search-in"
          name="checkIn"
          text={t.common.checkIn}
          value={checkIn}
          min={today}
          placeholder={t.common.addDate}
          format={format}
          onChange={(v) => {
            setCheckIn(v);
            if (v && checkOut && checkOut <= v) setCheckOut("");
          }}
          className={`${field} border-b-2 border-r-2 sm:border-b-0`}
        />
        <DateField
          id="search-out"
          name="checkOut"
          text={t.common.checkOut}
          value={checkOut}
          min={minCheckOut}
          placeholder={t.common.addDate}
          format={format}
          onChange={setCheckOut}
          className={`${field} border-b-2 sm:border-b-0 sm:border-r-2`}
        />
        <div className={`${field} col-span-2 border-b-2 sm:col-span-1 sm:border-b-0 sm:border-r-2`}>
          <label htmlFor="search-guests" className={label}>{t.common.guests}</label>
          <select id="search-guests" name="guests" defaultValue={2} className={`${lettering} w-full bg-transparent text-white focus:outline-none [&>option]:text-ink`}>
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 p-2 sm:col-span-1">
          <button
            type="submit"
            className="flex h-full min-h-14 w-full items-center justify-center rounded-md bg-white px-6 font-display text-xl font-extrabold text-sea-700 transition-colors hover:bg-sea-50"
          >
            {t.common.checkAvailability} <span aria-hidden className="ml-2">→</span>
          </button>
        </div>
      </div>
    </form>
  );
}
