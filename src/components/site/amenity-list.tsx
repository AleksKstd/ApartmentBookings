import type { Dictionary } from "@/i18n";
import { AmenityIcon } from "./amenity-icon";

export function AmenityList({ amenities, t, limit }: { amenities: string[]; t: Dictionary; limit?: number }) {
  const labels = t.amenities as Record<string, string>;
  const items = amenities.filter((a) => labels[a]).slice(0, limit);
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((key) => (
        <li key={key} className="flex items-center gap-3 text-ink">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea-50 text-sea-700">
            <AmenityIcon name={key} className="h-5 w-5" />
          </span>
          {labels[key]}
        </li>
      ))}
    </ul>
  );
}
