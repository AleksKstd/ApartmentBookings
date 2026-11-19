import { pick } from "@/i18n";
import { shown } from "@/lib/placeholder";
import type { HomepageContent, Locale } from "@/lib/types";

/** "From the door": nearby places and how far they are, as a quiet two-column list. */
export function Nearby({ items, locale, demo, title }: { items: HomepageContent["nearby"]; locale: Locale; demo: boolean; title: string }) {
  const rows = items
    .map((n) => ({ place: pick(n.place, locale), distance: shown(pick(n.distance, locale), demo) }))
    .filter((r): r is { place: string; distance: string } => !!r.place && !!r.distance);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="nearby-title">
      <h2 id="nearby-title" className="text-2xl">{title}</h2>
      <dl className="mt-4 border-t border-sand-300">
        {rows.map((r) => (
          <div key={r.place} className="flex items-baseline justify-between gap-6 border-b border-sand-300 py-3">
            <dt className="text-ink">{r.place}</dt>
            <dd className="shrink-0 text-ink-muted tabular-nums">{r.distance}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
