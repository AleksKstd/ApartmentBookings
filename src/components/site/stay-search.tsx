import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";

/** Quick date search under the hero. A plain GET form: the booking page reads checkIn/checkOut/guests. */
export function StaySearch({ locale, t, maxGuests }: { locale: Locale; t: Dictionary; maxGuests: number }) {
  return (
    <form
      action={`/${locale}/booking`}
      method="get"
      className="grid grid-cols-2 bg-white shadow-lift ring-1 ring-ink/10 md:grid-cols-[1fr_1fr_0.8fr_auto]"
      aria-label={t.common.checkAvailability}
    >
      <label className="border-b border-r border-ink/10 px-5 py-4 md:border-b-0">
        <span className="label mb-1 text-ink-muted">{t.common.checkIn}</span>
        <input type="date" name="checkIn" className="w-full bg-transparent text-base text-ink focus:outline-none" />
      </label>
      <label className="border-b border-ink/10 px-5 py-4 md:border-b-0 md:border-r">
        <span className="label mb-1 text-ink-muted">{t.common.checkOut}</span>
        <input type="date" name="checkOut" className="w-full bg-transparent text-base text-ink focus:outline-none" />
      </label>
      <label className="col-span-2 px-5 py-4 md:col-span-1">
        <span className="label mb-1 text-ink-muted">{t.common.guests}</span>
        <select name="guests" defaultValue="2" className="w-full bg-transparent text-base text-ink focus:outline-none">
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-primary col-span-2 rounded-none px-8 py-5 md:col-span-1">
        {t.common.checkAvailability}
      </button>
    </form>
  );
}
