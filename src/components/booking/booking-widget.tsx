"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CalendarDays, LoaderCircle, ShieldCheck, Undo2, Users } from "lucide-react";
import { submitBooking, type BookingFormState } from "@/app/[locale]/booking/actions";
import { fmt, type Dictionary } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import type { Locale, PriceQuote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvailabilityCalendar } from "./availability-calendar";

/** Host and terms shown beside the form. Null fields are unfilled placeholders and are left out. */
export interface BookingTrust {
  hostName: string | null;
  hostPhotoUrl: string | null;
  replyTime: string | null;
  cancellationPolicy: string | null;
  houseRules: string[];
  checkInTime: string;
  checkOutTime: string;
}

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
  trust: BookingTrust;
  initial?: { checkIn?: string; checkOut?: string; guests?: number };
}

type QuoteState = { status: "idle" } | { status: "loading" } | { status: "ok"; quote: PriceQuote } | { status: "error"; message: string };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function BookingWidget(props: Props) {
  const { locale, t, today, lastDay, maxGuests, paymentsEnabled, trust } = props;
  const occupied = useMemo(() => new Set(props.occupied), [props.occupied]);
  const [checkIn, setCheckIn] = useState<string | null>(props.initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(props.initial?.checkOut ?? null);
  const [guests, setGuests] = useState(Math.min(Math.max(props.initial?.guests ?? 2, 1), maxGuests));
  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(submitBooking, {});

  const minNightsFor = (day: string) =>
    props.seasonMinNights.findLast((s) => day >= s.startDate && day <= s.endDate)?.minNights ?? props.minNights;

  // Quotes are fetched per (dates, guests) key; a stale result simply shows as "loading".
  const quoteKey = checkIn && checkOut ? `${checkIn}|${checkOut}|${guests}` : null;
  const [result, setResult] = useState<{ key: string; state: QuoteState } | null>(null);
  const quote: QuoteState = !quoteKey ? { status: "idle" } : result?.key === quoteKey ? result.state : { status: "loading" };

  useEffect(() => {
    if (!quoteKey) return;
    const [qIn, qOut] = quoteKey.split("|");
    const controller = new AbortController();
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn: qIn, checkOut: qOut, guests, locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        setResult({
          key: quoteKey,
          state: res.ok ? { status: "ok", quote: data.quote } : { status: "error", message: data.message ?? t.booking.errors.server },
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setResult({ key: quoteKey, state: { status: "error", message: t.booking.errors.server } });
      });
    return () => controller.abort();
  }, [quoteKey, guests, locale, t.booking.errors.server]);

  // Keep the choice in the URL so a reload, a shared link or an interrupted visit comes back to it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of [["checkIn", checkIn], ["checkOut", checkOut], ["guests", String(guests)]] as const) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [checkIn, checkOut, guests]);

  const dateFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const shortFmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const showDate = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));
  const showShort = (d: string) => shortFmt.format(new Date(`${d}T00:00:00Z`));
  const money = (cents: number) => formatMoney(cents, quote.status === "ok" ? quote.quote.currency : "EUR", locale);
  const lineLabel = (label: string, quantity: number) => fmt((t.booking.lines as Record<string, string>)[label] ?? label, { n: quantity });
  const nightsText = (n: number) => `${n} ${n === 1 ? t.common.night : t.common.nights}`;
  const guestsText = (n: number) => `${n} ${n === 1 ? t.common.guest : t.common.guestsPlural}`;
  const ready = quote.status === "ok";

  const errors = state.fieldErrors;
  /** Links a field to its error message so screen readers announce both together. */
  const invalid = (id: keyof NonNullable<typeof errors>, hintId?: string) => {
    const describedBy = [hintId, errors?.[id] ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
    return { "aria-invalid": errors?.[id] ? true : undefined, "aria-describedby": describedBy };
  };

  // After a failed submit, move focus to the first field that needs attention.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!errors) return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [errors]);

  // Phones: the price and form sit a screen or two below the calendar. Once a price exists, a bar
  // keeps it on screen until the summary or the form scrolls into view.
  const summaryRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState({ summary: false, form: false });
  useEffect(() => {
    const targets: [Element | null, "summary" | "form"][] = [[summaryRef.current, "summary"], [formRef.current, "form"]];
    const observer = new IntersectionObserver((entries) => {
      setInView((prev) => {
        const next = { ...prev };
        for (const e of entries) next[targets.find(([el]) => el === e.target)![1]] = e.isIntersecting;
        return next;
      });
    });
    for (const [el] of targets) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const showBar = ready && !inView.summary && !inView.form;

  const continueToDetails = () => {
    const smooth = !window.matchMedia(REDUCED_MOTION).matches;
    formRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    document.getElementById("guestName")?.focus({ preventScroll: true });
  };

  const nightsLine = (line: PriceQuote["lines"][number], nightly: PriceQuote["nightly"]) => {
    // One rate for every night reads as "€80 × 4 nights"; mixed rates show the count, with the detail below.
    const uniform = nightly.every((n) => n.amount === nightly[0]?.amount);
    return uniform ? `${money(line.unitAmount)} × ${nightsText(line.quantity)}` : nightsText(line.quantity);
  };

  const initials = trust.hostName?.replace(/[[\]]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const [beforeLink, afterLink] = t.booking.acceptTerms.split("{privacy}");

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-8">
        {/* 1. Guests and dates */}
        <div className="card p-5 sm:p-7 lg:col-start-1 lg:row-start-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5 text-clay-500" aria-hidden />
              {checkIn && checkOut ? t.booking.datesSelected : checkIn ? t.booking.selectCheckOut : t.booking.selectDates}
            </h2>
            {(checkIn || checkOut) && (
              <button type="button" className="btn-ghost px-3 py-1.5 underline underline-offset-4" onClick={() => { setCheckIn(null); setCheckOut(null); }}>
                {t.booking.clearDates}
              </button>
            )}
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink" htmlFor="guests-select">
              <Users className="h-4 w-4 text-clay-500" aria-hidden />
              {t.common.guests}
            </label>
            <select id="guests-select" className="input w-auto min-w-[9rem]" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{guestsText(n)}</option>
              ))}
            </select>
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
          <p className="mt-4 text-sm font-medium text-ink" aria-live="polite">
            {fmt(t.booking.minStayHint, { n: checkIn ? minNightsFor(checkIn) : props.minNights })}
          </p>
        </div>

        {/* 2. Price and reassurance: beside the calendar on desktop (sticky), after it on phones. */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section ref={summaryRef} id="stay-summary" className="card scroll-mt-24 p-5 sm:p-7" aria-labelledby="summary-title">
            <h2 id="summary-title" className="text-xl">{t.booking.summaryTitle}</h2>
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

            <div className="mt-5 border-t border-sand-200 pt-4" aria-live="polite" aria-busy={quote.status === "loading"}>
              {quote.status === "idle" && <p className="text-sm text-ink-muted">{t.booking.noDates}</p>}
              {quote.status === "loading" && (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> {t.common.loading}
                </p>
              )}
              {quote.status === "error" && <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">{quote.message}</p>}
              {quote.status === "ok" && (
                <div>
                  <p className="mb-3 text-sm text-ink-muted">{guestsText(quote.quote.guests)}</p>
                  <ul className="space-y-2 text-sm">
                    {quote.quote.lines.map((line) => (
                      <li key={line.label} className="flex justify-between gap-4">
                        <span className="text-ink-muted">
                          {line.kind === "nights" ? nightsLine(line, quote.quote.nightly) : lineLabel(line.label, line.quantity)}
                        </span>
                        <span className={cn("font-medium tabular-nums", line.amount < 0 && "text-success-700")}>{money(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {quote.quote.nightly.length > 1 && (
                    <details className="mt-3 text-xs text-ink-muted">
                      <summary className="cursor-pointer">{t.booking.nightlyBreakdown}</summary>
                      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                        {quote.quote.nightly.map((n) => (
                          <li key={n.date} className="flex justify-between">
                            <span>{showDate(n.date)}</span>
                            <span className="tabular-nums">{money(n.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <p className="mt-4 flex justify-between border-t border-sand-200 pt-4 text-lg font-semibold">
                    <span>{t.booking.total}</span>
                    <span className="tabular-nums" data-testid="quote-total">{money(quote.quote.total)}</span>
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-sand-200 p-5 sm:p-7" aria-labelledby="trust-title">
            <div className="flex items-center gap-4">
              {trust.hostName && (
                trust.hostPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage
                  <img src={trust.hostPhotoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sea-100 font-display text-lg text-sea-800" aria-hidden>{initials}</span>
                )
              )}
              <div>
                <h2 id="trust-title" className="text-xl">
                  {trust.hostName ? fmt(t.booking.trustTitle, { name: trust.hostName }) : t.booking.trustTitleNoHost}
                </h2>
                {trust.replyTime && <p className="mt-0.5 text-sm text-ink-muted">{trust.replyTime}</p>}
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-ink">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sea-600" aria-hidden />
                {paymentsEnabled ? fmt(t.booking.trustPayment, { n: props.holdMinutes }) : t.booking.trustNoCharge}
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sea-600" aria-hidden />
                {t.booking.trustNoFees}
              </li>
              {trust.cancellationPolicy && (
                <li className="flex gap-3">
                  <Undo2 className="mt-0.5 h-4 w-4 shrink-0 text-sea-600" aria-hidden />
                  <span>
                    <span className="font-semibold">{t.booking.cancellationTitle}. </span>
                    {trust.cancellationPolicy}
                  </span>
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* 3. Details: under the calendar on desktop, last on phones. */}
        <form
          ref={formRef}
          action={formAction}
          className="card flex scroll-mt-24 flex-col gap-4 p-5 sm:p-7 lg:col-start-1 lg:row-start-2" // gap, not space-y: React injects hidden inputs first
          aria-labelledby="details-title"
          aria-describedby={ready ? undefined : "details-locked"}
          noValidate
        >
          <h2 id="details-title" className="text-xl">{t.booking.yourDetails}</h2>
          {!ready && (
            <p id="details-locked" className="flex items-start gap-2 rounded-xl bg-sand-100 p-3 text-sm text-ink-muted">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" aria-hidden />
              {quote.status === "loading" ? t.booking.detailsLockedLoading : t.booking.detailsLocked}
            </p>
          )}
          <input type="hidden" name="checkIn" value={checkIn ?? ""} />
          <input type="hidden" name="checkOut" value={checkOut ?? ""} />
          <input type="hidden" name="guests" value={guests} />
          <input type="hidden" name="locale" value={locale} />
          <div className="hidden" aria-hidden>
            <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="guestName" label={t.booking.fullName} error={errors?.guestName} className="sm:col-span-2">
              <input id="guestName" name="guestName" className="input" autoComplete="name" {...invalid("guestName")} defaultValue={state.values?.guestName} required minLength={2} maxLength={120} disabled={!ready} />
            </Field>
            <Field id="guestEmail" label={t.booking.email} error={errors?.guestEmail}>
              <input id="guestEmail" name="guestEmail" type="email" inputMode="email" className="input" autoComplete="email" {...invalid("guestEmail")} defaultValue={state.values?.guestEmail} required maxLength={254} disabled={!ready} />
            </Field>
            <Field id="guestPhone" label={t.booking.phone} error={errors?.guestPhone} hint={t.booking.phoneHint}>
              <input id="guestPhone" name="guestPhone" type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="+359 …" {...invalid("guestPhone", "guestPhone-hint")} defaultValue={state.values?.guestPhone} required maxLength={40} disabled={!ready} />
            </Field>
          </div>
          <Field id="guestNote" label={t.booking.note}>
            <textarea id="guestNote" name="guestNote" rows={3} className="input" maxLength={2000} placeholder={t.booking.notePlaceholder} defaultValue={state.values?.guestNote} disabled={!ready} />
          </Field>

          <div className="space-y-3 rounded-xl bg-sand-100 p-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-sea-800">{t.booking.rulesSummary}</summary>
              <div className="mt-3 space-y-2 text-ink-muted">
                <p>{fmt(t.booking.rulesTimes, { in: trust.checkInTime, out: trust.checkOutTime })}</p>
                {trust.houseRules.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5">
                    {trust.houseRules.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </div>
            </details>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 shrink-0 rounded border-sand-400 accent-sea-700" required disabled={!ready} {...invalid("acceptTerms")} />
              <span>
                {beforeLink}
                <Link href={`/${locale}/privacy`} className="text-sea-700 underline" target="_blank">
                  {t.booking.privacyLink}
                  <span className="sr-only"> ({t.common.opensInNewTab})</span>
                </Link>
                {afterLink}
              </span>
            </label>
            {errors?.acceptTerms && <p id="acceptTerms-error" className="text-sm text-danger-700">{errors.acceptTerms}</p>}
          </div>

          {state.error && <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">{state.error}</p>}

          {/* Said before the decision, at reading size — not as fine print under the button. */}
          <p className="flex items-start gap-2 text-base text-ink">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-sea-600" aria-hidden />
            {paymentsEnabled ? fmt(t.booking.payInfo, { n: props.holdMinutes }) : t.booking.requestInfo}
          </p>
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={!ready || pending}>
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? t.booking.submitting : paymentsEnabled ? t.booking.submitPay : t.booking.submitRequest}
          </button>
        </form>
      </div>

      {/* Phones only: the price stays in view after choosing dates. */}
      {quote.status === "ok" && checkIn && checkOut && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(16,44,53,.25)] backdrop-blur transition-transform duration-300 ease-out lg:hidden",
            showBar ? "translate-y-0" : "invisible translate-y-full",
          )}
          aria-hidden={!showBar}
        >
          <div className="container flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 text-sm">
              <p className="truncate text-ink-muted">
                {showShort(checkIn)} – {showShort(checkOut)} · {nightsText(quote.quote.nights)}
              </p>
              <p className="text-lg font-semibold tabular-nums text-ink">{money(quote.quote.total)}</p>
            </div>
            <button type="button" className="btn-primary shrink-0 px-6" onClick={continueToDetails} tabIndex={showBar ? 0 : -1}>
              {t.booking.continue}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger-700">{error}</p>}
    </div>
  );
}
