import { headers } from "next/headers";
import { pick } from "@/i18n";
import { siteUrl } from "@/lib/site-url";
import type { Locale, MediaItem, PricingSettings, PropertyInfo } from "@/lib/types";

/**
 * schema.org VacationRental / LodgingBusiness data so search engines can show the apartment as a
 * rich result. Rendered with the request's CSP nonce.
 */
export async function StructuredData({
  locale,
  property,
  pricing,
  photos,
  lowestNightly,
}: {
  locale: Locale;
  property: PropertyInfo;
  pricing: PricingSettings;
  photos: MediaItem[];
  lowestNightly: number;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const base = siteUrl();
  const absolute = (url: string) => (url.startsWith("http") ? url : `${base}${url}`);
  const data = {
    "@context": "https://schema.org",
    "@type": ["VacationRental", "LodgingBusiness"],
    name: property.name,
    description: pick(property.description, locale),
    url: `${base}/${locale}`,
    image: photos.slice(0, 8).map((p) => absolute(p.url)),
    telephone: property.contactPhone || undefined,
    email: property.contactEmail || undefined,
    address: { "@type": "PostalAddress", streetAddress: property.address, addressLocality: pick(property.city, locale) },
    ...(property.latitude != null && property.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: property.latitude, longitude: property.longitude } }
      : {}),
    checkinTime: property.checkInTime,
    checkoutTime: property.checkOutTime,
    numberOfRooms: property.bedrooms,
    occupancy: { "@type": "QuantitativeValue", maxValue: pricing.maxGuests },
    floorSize: { "@type": "QuantitativeValue", value: property.areaSqm, unitCode: "MTK" },
    priceRange: `${(lowestNightly / 100).toFixed(0)}+ ${pricing.currency}`,
  };
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // JSON.stringify output with "<" escaped cannot break out of the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
