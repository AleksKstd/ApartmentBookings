import { pick } from "@/i18n";
import { isPlaceholder, shown } from "@/lib/placeholder";
import type { HomepageContent, Locale } from "@/lib/types";

interface Stop {
  place: string;
  /** The leading number of the distance ("5 min walk" → 5), set large; null when there is none. */
  amount: number | null;
  /** The rest of the distance ("min walk"), or the whole text when it has no number. */
  unit: string;
  example: boolean;
}

/** "5 min walk" → { amount: 5, unit: "min walk" }; "[5 мин пеша]" works too (placeholder brackets stripped). */
function parseDistance(text: string): Pick<Stop, "amount" | "unit"> {
  const clean = text.replace(/^\s*\[|\]\s*$/g, "").trim();
  const m = clean.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  return m ? { amount: Number(m[1].replace(",", ".")), unit: m[2] } : { amount: null, unit: clean };
}

/**
 * "From the door" as a walking route: the apartment's door, then each place as a stop along one line,
 * nearest first, with the minutes set large. Places whose distance is still a placeholder are hidden
 * outside demo mode.
 */
export function Nearby({
  items,
  locale,
  demo,
  title,
  startLabel,
  exampleNote,
}: {
  items: HomepageContent["nearby"];
  locale: Locale;
  demo: boolean;
  title: string;
  startLabel: string;
  exampleNote: string;
}) {
  const stops: Stop[] = items
    .map((n) => {
      const distance = shown(pick(n.distance, locale), demo);
      const place = pick(n.place, locale);
      if (!place || !distance) return null;
      return { place, ...parseDistance(distance), example: isPlaceholder(distance) };
    })
    .filter((s): s is Stop => s !== null)
    .sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
  if (stops.length === 0) return null;

  return (
    <section aria-labelledby="nearby-title" className="overflow-hidden bg-sea-800 text-white">
      <div className="container section">
        <h2 id="nearby-title" className="text-4xl text-white sm:text-5xl">{title}</h2>

        {/* The route: a vertical line on phones, a horizontal one from md up. The line itself is decoration. */}
        <ol className="relative mt-12 grid gap-10 pl-10 before:absolute before:bottom-2 before:left-[0.6875rem] before:top-2 before:w-px before:bg-sea-500 before:content-[''] md:mt-16 md:auto-cols-fr md:grid-flow-col md:gap-6 md:pl-0 md:pt-12 md:before:bottom-auto md:before:left-2 md:before:right-0 md:before:top-[0.6875rem] md:before:h-px md:before:w-auto">

          <li className="relative">
            <span aria-hidden className="absolute -left-10 top-0.5 h-6 w-6 rounded-full bg-clay-400 ring-[6px] ring-sea-800 md:-top-12 md:left-0" />
            <p className="font-serif text-2xl leading-tight text-white md:text-3xl">{startLabel}</p>
          </li>

          {stops.map((s) => (
            <li key={s.place} className="relative">
              <span aria-hidden className="absolute -left-[2.0625rem] top-2 h-2.5 w-2.5 rounded-full bg-sea-100 ring-[6px] ring-sea-800 md:-top-[2.6875rem] md:left-1.5" />
              <p className="flex items-baseline gap-2 md:block">
                {s.amount != null && <span className="font-serif text-5xl leading-none tabular-nums text-white md:text-7xl">{s.amount}</span>}
                <span className="text-sm text-sea-100 md:mt-2 md:block">{s.unit}</span>
              </p>
              <p className="mt-1 text-lg text-white md:mt-3">
                {s.place}
                {s.example && <span className="ml-2 align-middle text-xs uppercase text-sea-200">{exampleNote}</span>}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
