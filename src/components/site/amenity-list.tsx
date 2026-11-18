import type { Dictionary } from "@/i18n";
import { AmenityIcon } from "./amenity-icon";

export function AmenityList({ amenities, t, limit }: { amenities: string[]; t: Dictionary; limit?: number }) {
  const labels = t.amenities as Record<string, string>;
  const items = amenities.filter((a) => labels[a]).slice(0, limit);
  return (
    <ul className="grid grid-cols-1 border-t border-ink/15 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
      {items.map((key) => (
        <li key={key} className="flex items-center gap-4 border-b border-ink/15 py-4 text-ink">
          <span className="grid h-9 w-9 shrink-0 place-items-center text-clay-600">
            <AmenityIcon name={key} className="h-5 w-5" />
          </span>
          {labels[key]}
        </li>
      ))}
    </ul>
  );
}
