import type { Dictionary } from "@/i18n";
import { fmt } from "@/i18n";
import type { PricingSettings, PropertyInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The apartment in one line: "68 m² · 1 bedroom · 2 beds · 1 bathroom · sleeps 4". */
export function FactLine({ property, pricing, t, className }: { property: PropertyInfo; pricing: PricingSettings; t: Dictionary; className?: string }) {
  const c = t.common;
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const facts = [
    `${property.areaSqm} ${c.sqm}`,
    count(property.bedrooms, c.bedroomOne, c.bedroomMany),
    count(property.beds, c.bedOne, c.bedMany),
    count(property.bathrooms, c.bathroomOne, c.bathroomMany),
    fmt(c.sleeps, { n: pricing.maxGuests }),
  ];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-ink", className)} aria-label={t.home.factsTitle}>
      {facts.map((f, i) => (
        <li key={f} className="flex items-center gap-3 whitespace-nowrap">
          {i > 0 && <span className="text-clay-500" aria-hidden>·</span>}
          {f}
        </li>
      ))}
    </ul>
  );
}
