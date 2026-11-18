import { BedDouble, DoorOpen, Bath, Ruler, Users } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { PricingSettings, PropertyInfo } from "@/lib/types";

export function Facts({ property, pricing, t, compact = false }: { property: PropertyInfo; pricing: PricingSettings; t: Dictionary; compact?: boolean }) {
  const facts = [
    { icon: Users, label: t.common.guests, value: `${t.common.upTo} ${pricing.maxGuests}` },
    { icon: DoorOpen, label: t.common.bedrooms, value: property.bedrooms },
    { icon: BedDouble, label: t.common.beds, value: property.beds },
    { icon: Bath, label: t.common.bathrooms, value: property.bathrooms },
    { icon: Ruler, label: t.common.area, value: `${property.areaSqm} ${t.common.sqm}` },
  ];
  return (
    <dl
      className={
        compact
          ? "grid grid-cols-2 border-l border-t border-ink/15 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
          : "grid grid-cols-2 border-l border-t border-ink/15 sm:grid-cols-3 lg:grid-cols-5"
      }
    >
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col justify-between gap-6 border-b border-r border-ink/15 p-5">
          <Icon className="h-5 w-5 text-clay-600" strokeWidth={1.5} aria-hidden />
          <div className="flex flex-col-reverse">
            <dt className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">{label}</dt>
            <dd className="font-serif text-3xl leading-none text-ink">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
