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
    <dl className={compact ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"}>
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="card flex items-center gap-3 p-4">
          <Icon className="h-6 w-6 shrink-0 text-clay-500" aria-hidden />
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
            <dd className="text-lg font-semibold text-sea-900">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
