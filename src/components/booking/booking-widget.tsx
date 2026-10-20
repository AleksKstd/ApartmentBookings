"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, Users } from "lucide-react";
import { submitBooking, type BookingFormState } from "@/app/[locale]/booking/actions";
import { fmt, type Dictionary } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import type { Locale, PriceQuote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvailabilityCalendar } from "./availability-calendar";

interface Props {
  locale: Locale;
  t: Dictionary;
  today: string;
  lastDay: string;
  occupied: string[];
  maxGuests: number;
  minNights: number;
  seasonMinNights: { startDate: string; endDate: string; minNights: number }[];
  paymentsEnabled: boolean;
  holdMinutes: number;
  initial?: { checkIn?: string; checkOut?: string; guests?: number };
}

type QuoteState = { status: "idle" } | { status: "loading" } | { status: "ok"; quote: PriceQuote } | { status: "error"; message: string };

export function BookingWidget(props: Props) {
  const { locale, t, today, lastDay, maxGuests, paymentsEnabled } = props;
  const occupied = useMemo(() => new Set(props.occupied), [props.occupied]);
  const [checkIn, setCheckIn] = useState<string | null>(props.initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(props.initial?.checkOut ?? null);
  const [guests, setGuests] = useState(Math.min(props.initial?.guests ?? 2, maxGuests));
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(submitBooking, {});

  const minNightsFor = (day: string) =>
    props.seasonMinNights.findLast((s) => day >= s.startDate && day <= s.endDate)?.minNights ?? props.minNights;

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setQuote({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setQuote({ status: "loading" });
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn, checkOut, guests, locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        setQuote(res.ok ? { status: "ok", quote: data.quote } : { status: "error", message: data.message ?? t.booking.errors.server });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setQuote({ status: "error", message: t.booking.errors.server });
      });
    return () => controller.abort();
  }, [checkIn, checkOut, guests, locale, t.booking.errors.server]);

  const dateFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));
  const money = (cents: number) => formatMoney(cents, quote.status === "ok" ? quote.quote.currency : "EUR", locale);
  const lineLabel = (label: string, quantity: number) => fmt((t.booking.lines as Record<string, string>)[label] ?? label, { n: quantity });
  const ready = quote.status === "ok";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div className="card p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-sans text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-clay-500" aria-hidden />
            {checkIn && !checkOut ? t.booking.selectCheckOut : t.booking.selectDates}
          </h2>
          {(checkIn || checkOut) && (
            <button type="button" className="text-sm font-medium text-sea-700 underline" onClick={() => { setCheckIn(null); setCheckOut(null); }}>
              {t.booking.clearDates}
            </button>
          )}
        </div>
        <AvailabilityCalendar
          locale={locale}
          today={today}
          lastDay={lastDay}
          occupied={occupied}
          checkIn={checkIn}
          checkOut={checkOut}
          minNightsFor={minNightsFor}
          onChange={(r) => {
            setCheckIn(r.checkIn);
            setCheckOut(r.checkOut);
          }}
          labels={t.booking}
        />
        <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
          {fmt(t.booking.minStayHint, { n: checkIn ? minNightsFor(checkIn) : props.minNights })}
        </p>
      </div>

      <div className="space-y-6 lg:sticky lg:top-24">
        <section className="card p-5 sm:p-7" aria-labelledby="summary-title">
          <h2 id="summary-title" className="font-sans text-lg font-semibold">{t.booking.summaryTitle}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-sand-100 p-3">
              <dt className="text-ink-muted">{t.common.checkIn}</dt>
              <dd className="mt-0.5 font-semibold" data-testid="summary-checkin">{checkIn ? showDate(checkIn) : "—"}</dd>
            </div>
            <div className="rounded-xl bg-sand-100 p-3">
              <dt className="text-ink-muted">{t.common.checkOut}</dt>
              <dd className="mt-0.5 font-semibold" data-testid="summary-checkout">{checkOut ? showDate(checkOut) : "—"}</dd>
            </div>
          </dl>
          <label className="label mt-4" htmlFor="guests-select">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-clay-500" aria-hidden />{t.common.guests}</span>
          </label>
          <select id="guests-select" className="input" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? t.common.guest : t.common.guestsPlural}
              </option>
            ))}
          </select>

          <div className="mt-5 border-t border-sand-200 pt-4" aria-live="polite" aria-busy={quote.status === "loading"}>
            {quote.status === "idle" && <p className="text-sm text-ink-muted">{t.booking.noDates}</p>}
            {quote.status === "loading" && (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> {t.common.loading}
              </p>
            )}
            {quote.status === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{quote.message}</p>}
            {quote.status === "ok" && (
              <div>
                <ul className="space-y-2 text-sm">
                  {quote.quote.lines.map((line) => (
                    <li key={line.label} className="flex justify-between gap-4">
                      <span className="text-ink-muted">
                        {line.kind === "nights"
                          ? `${money(line.unitAmount)} × ${line.quantity} ${line.quantity === 1 ? t.common.night : t.common.nights}`
                          : lineLabel(line.label, line.quantity)}
                      </span>
                      <span className={cn("font-medium", line.amount < 0 && "text-green-700")}>{money(line.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex justify-between border-t border-sand-200 pt-4 text-lg font-semibold">
                  <span>{t.booking.total}</span>
                  <span data-testid="quote-total">{money(quote.quote.total)}</span>
                </p>
              </div>
            )}
          </div>
        </section>

        <form action={formAction} className={cn("card space-y-4 p-5 sm:p-7", !ready && "opacity-60")} aria-labelledby="details-title" noValidate>
          <h2 id="details-title" className="font-sans text-lg font-semibold">{t.booking.yourDetails}</h2>
          <input type="hidden" name="checkIn" value={checkIn ?? ""} />
          <input type="hidden" name="checkOut" value={checkOut ?? ""} />
          <input type="hidden" name="guests" value={guests} />
          <input type="hidden" name="locale" value={locale} />
          <div className="hidden" aria-hidden>
            <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <Field id="guestName" label={t.booking.fullName} error={state.fieldErrors?.guestName}>
            <input id="guestName" name="guestName" className="input" autoComplete="name" defaultValue={state.values?.guestName} required minLength={2} maxLength={120} disabled={!ready} />
          </Field>
          <Field id="guestEmail" label={t.booking.email} error={state.fieldErrors?.guestEmail}>
            <input id="guestEmail" name="guestEmail" type="email" className="input" autoComplete="email" defaultValue={state.values?.guestEmail} required maxLength={254} disabled={!ready} />
          </Field>
          <Field id="guestPhone" label={t.booking.phone} error={state.fieldErrors?.guestPhone}>
            <input id="guestPhone" name="guestPhone" type="tel" className="input" autoComplete="tel" defaultValue={state.values?.guestPhone} required maxLength={40} disabled={!ready} />
          </Field>
          <Field id="guestNote" label={t.booking.note}>
            <textarea id="guestNote" name="guestNote" rows={3} className="input" maxLength={2000} placeholder={t.booking.notePlaceholder} defaultValue={state.values?.guestNote} disabled={!ready} />
          </Field>
          <div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 rounded border-sand-300 accent-sea-700" required disabled={!ready} aria-describedby={state.fieldErrors?.acceptTerms ? "acceptTerms-error" : undefined} />
              <span>
                {t.booking.acceptTerms.split("{privacy}")[0]}
                <Link href={`/${locale}/privacy`} className="text-sea-700 underline" target="_blank">{t.booking.privacyLink}</Link>
                {t.booking.acceptTerms.split("{privacy}")[1]}
              </span>
            </label>
            {state.fieldErrors?.acceptTerms && <p id="acceptTerms-error" className="mt-1 text-sm text-red-700">{state.fieldErrors.acceptTerms}</p>}
          </div>

          {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{state.error}</p>}

          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={!ready || pending}>
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? t.booking.submitting : paymentsEnabled ? t.booking.submitPay : t.booking.submitRequest}
          </button>
          <p className="text-xs text-ink-muted">
            {paymentsEnabled ? fmt(t.booking.payInfo, { n: props.holdMinutes }) : t.booking.requestInfo}
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
