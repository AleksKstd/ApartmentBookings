import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { AmenityList } from "@/components/site/amenity-list";
import { Facts } from "@/components/site/facts";
import { SectionHeading } from "@/components/site/section-heading";
import { getDictionary, isLocale, pick } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/apartment">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { property } = await getSiteData();
  return { title: getDictionary(locale).meta.apartment, description: pick(property.description, locale).slice(0, 160) };
}

export default async function ApartmentPage({ params }: PageProps<"/[locale]/apartment">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, pricing, gallery, lowestNightly } = await getSiteData();
  const cover = gallery[0];
  const rules = pick(property.houseRules, locale).split("\n").map((r) => r.trim()).filter(Boolean);

  return (
    <>
      <section className="bg-white">
        <div className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow mb-2">{pick(property.city, locale)}</p>
            <h1 className="text-4xl sm:text-5xl">{property.name}</h1>
            <p className="mt-4 text-xl text-ink-muted">{pick(property.tagline, locale)}</p>
            <p className="mt-6 text-sea-800">
              <span className="text-sm text-ink-muted">{t.apartment.pricesFrom} </span>
              <span className="text-2xl font-semibold">{formatMoney(lowestNightly, pricing.currency, locale)}</span>
              <span className="text-sm text-ink-muted"> / {t.common.night}</span>
            </p>
            <Link href={`/${locale}/booking`} className="btn-primary mt-6 px-6 py-3 text-base">
              {t.common.checkAvailability}
            </Link>
          </div>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage
            <img src={cover.url} alt={pick(cover.alt, locale)} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
          )}
        </div>
      </section>

      <section className="section">
        <div className="container space-y-14">
          <Facts property={property} pricing={pricing} t={t} />

          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <SectionHeading title={t.apartment.aboutTitle} />
              <p className="whitespace-pre-line text-lg leading-relaxed text-ink-muted">{pick(property.description, locale)}</p>
            </div>
            <aside className="space-y-6">
              <div className="card p-6">
                <h2 className="text-xl">{t.apartment.timesTitle}</h2>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-clay-500" aria-hidden />
                    <dt className="text-ink-muted">{t.common.checkIn}</dt>
                    <dd className="ml-auto font-semibold">{t.common.after} {property.checkInTime}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-clay-500" aria-hidden />
                    <dt className="text-ink-muted">{t.common.checkOut}</dt>
                    <dd className="ml-auto font-semibold">{t.common.before} {property.checkOutTime}</dd>
                  </div>
                </dl>
              </div>
              {rules.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-xl">{t.apartment.rulesTitle}</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-muted">
                    {rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          <div>
            <SectionHeading title={t.apartment.amenitiesTitle} />
            <AmenityList amenities={property.amenities} t={t} />
          </div>

          <div>
            <SectionHeading title={t.apartment.locationTitle} />
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-clay-500" aria-hidden />
              {property.address}
            </p>
            {property.latitude != null && property.longitude != null && (
              <iframe
                title={t.apartment.locationTitle}
                className="mt-6 h-80 w-full rounded-2xl border-0 shadow-card"
                loading="lazy"
                referrerPolicy="no-referrer"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.006}%2C${property.longitude + 0.01}%2C${property.latitude + 0.006}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
              />
            )}
            {property.mapUrl && (
              <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-4">
                {t.common.openMap}
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
