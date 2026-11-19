import { pick } from "@/i18n";
import { isPlaceholder, shown } from "@/lib/placeholder";
import type { HomepageContent, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Stop {
  /** Sign lettering, Cyrillic first as on Burgas street signs. */
  place: string;
  /** Latin line under the Cyrillic name (English pages only). */
  latin: string | null;
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
 * "From the door" as a signpost: one direction plate per place, nearest first, pointing alternately
 * left and right off a single post. Places whose distance is still a placeholder are hidden outside
 * demo mode.
 */
export function Nearby({
  items,
  locale,
  demo,
  title,
  note,
  exampleNote,
}: {
  items: HomepageContent["nearby"];
  locale: Locale;
  demo: boolean;
  title: string;
  note: string;
  exampleNote: string;
}) {
  const stops: Stop[] = items
    .map((n) => {
      const distance = shown(pick(n.distance, locale), demo);
      const place = n.place.bg || pick(n.place, locale);
      const latin = locale === "en" && n.place.en && n.place.en !== place ? n.place.en : null;
      if (!place || !distance) return null;
      return { place, latin, ...parseDistance(distance), example: isPlaceholder(distance) };
    })
    .filter((s): s is Stop => s !== null)
    .sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
  if (stops.length === 0) return null;

  return (
    <section aria-labelledby="nearby-title" className="section">
      <div className="container grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 id="nearby-title" className="text-5xl sm:text-6xl">{title}</h2>
          <p className="mt-4 text-lg text-ink-muted">{note}</p>
        </div>

        {/* The post is decoration; each plate is a list item a screen reader reads as "place, 5 min walk". */}
        <ul className="relative grid gap-3.5 py-4 before:absolute before:inset-y-0 before:left-1/2 before:w-3.5 before:-translate-x-1/2 before:rounded before:bg-sand-400 before:content-['']">
          {stops.map((s, i) => {
            const right = i % 2 === 0; // the plate points right
            return (
              <li key={s.place} className={cn("relative w-[92%] sm:w-[86%]", !right && "justify-self-end")}>
                <div
                  className={cn(
                    "plate",
                    // The point stops 7px short of the edge so the painted rule never shows at the tip.
                    right ? "[clip-path:polygon(0_0,93%_0,calc(100%_-_7px)_50%,93%_100%,0_100%)]" : "[clip-path:polygon(7%_0,100%_0,100%_100%,7%_100%,7px_50%)]",
                  )}
                >
                  <div
                    className={cn(
                      "plate-face flex items-center gap-3 py-3",
                      right ? "pl-4 pr-10 sm:pl-5 sm:pr-12" : "flex-row-reverse pl-10 pr-4 text-right sm:pl-12 sm:pr-5",
                    )}
                  >
                    <span className="min-w-0 flex-1 whitespace-nowrap">
                      <span lang="bg" className="block font-display text-[1.375rem] font-extrabold leading-tight sm:text-[1.75rem]">{s.place}</span>
                      {s.latin && <span lang="en" className="block font-display text-xs font-bold uppercase tracking-[0.16em] text-sea-100 sm:text-sm">{s.latin}</span>}
                    </span>
                    <span className="whitespace-nowrap font-display font-extrabold tabular-nums">
                      {s.amount != null && <span className="text-[2rem] leading-none sm:text-5xl">{s.amount}</span>}
                      <span className="ml-1 text-sm font-bold text-sea-100 sm:ml-1.5 sm:text-base">{s.unit}</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {stops.some((s) => s.example) && <p className="text-sm text-ink-muted lg:col-start-2">{exampleNote}</p>}
      </div>
    </section>
  );
}
