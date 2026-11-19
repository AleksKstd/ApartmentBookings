import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { AmenityList } from "@/components/site/amenity-list";
import { FactLine } from "@/components/site/facts";
import { MapEmbed } from "@/components/site/map-embed";
import { StreetSign } from "@/components/site/street-sign";
import { AddressPlate } from "@/components/site/address-plate";
import { SectionHeading } from "@/components/site/section-heading";
import { getDictionary, isLocale, pick } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import { publicContact } from "@/lib/placeholder";
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
  const { property, homepage, pricing, gallery, lowestNightly, demo } = await getSiteData();
  const contact = publicContact(property, demo);
  const cover = gallery[0];
  const rules = pick(property.houseRules, locale).split("\n").map((r) => r.trim()).filter(Boolean);

  return (
    <>
      <section className="container pb-6 pt-10 sm:pt-14" aria-labelledby="apartment-title">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <h1 id="apartment-title" className="max-w-[14ch] text-[clamp(2.5rem,6vw,5rem)]">{property.name}</h1>
            <p className="mt-4 max-w-[40ch] text-xl text-ink-muted">{pick(property.tagline, locale)}</p>
            <FactLine property={property} pricing={pricing} t={t} className="mt-5 text-lg" />
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href={`/${locale}/booking`} className="btn-primary px-6 py-3 text-lg">
                {t.common.checkAvailability} <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <p className="text-ink-muted">
                {t.apartment.pricesFrom} <b className="font-semibold tabular-nums text-ink">{formatMoney(lowestNightly, pricing.currency, locale)}</b> / {t.common.night}
              </p>
            </div>
          </div>
          <StreetSign sign={homepage.streetSign} note={pick(homepage.streetSign.note, locale)} />
        </div>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage
          <img src={cover.url} alt={pick(cover.alt, locale)} className="mt-10 aspect-[4/3] w-full rounded-xl object-cover sm:aspect-[21/9]" />
        )}
      </section>

      <section className="section">
        <div className="container space-y-14">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <SectionHeading title={t.apartment.aboutTitle} />
              <p className="whitespace-pre-line text-lg leading-relaxed text-ink-muted">{pick(property.description, locale)}</p>
            </div>
            <aside className="space-y-10">
              {/* Opening hours, as the enamel plate by a front door would give them. */}
              <section className="plate" aria-labelledby="times-title">
                <div className="plate-face px-6 py-5">
                  <h2 id="times-title" className="text-2xl text-white">{t.apartment.timesTitle}</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="font-display text-sm font-bold uppercase tracking-[0.14em] text-sea-100">{t.common.checkIn}</dt>
                      <dd className="mt-1 font-display text-4xl font-extrabold tabular-nums">
                        <span className="mr-1.5 text-lg font-bold text-sea-100">{t.common.after}</span>{property.checkInTime}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-display text-sm font-bold uppercase tracking-[0.14em] text-sea-100">{t.common.checkOut}</dt>
                      <dd className="mt-1 font-display text-4xl font-extrabold tabular-nums">
                        <span className="mr-1.5 text-lg font-bold text-sea-100">{t.common.before}</span>{property.checkOutTime}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
              {rules.length > 0 && (
                <section aria-labelledby="rules-title">
                  <h2 id="rules-title" className="text-3xl">{t.apartment.rulesTitle}</h2>
                  <ul className="mt-4 border-t-2 border-sea-700">
                    {rules.map((r) => (
                      <li key={r} className="border-b border-sand-300 py-3 text-lg text-ink">{r}</li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          <div>
            <SectionHeading title={t.apartment.amenitiesTitle} />
            <AmenityList amenities={property.amenities} t={t} />
          </div>

          <div>
            <SectionHeading title={t.apartment.locationTitle} />
            {contact.address && <AddressPlate address={contact.address} />}
            {property.latitude != null && property.longitude != null && (
              <div className="mt-6">
                <MapEmbed
                  title={t.apartment.locationTitle}
                  showLabel={t.common.showMap}
                  note={t.common.mapNote}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.006}%2C${property.longitude + 0.01}%2C${property.latitude + 0.006}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                />
              </div>
            )}
            {property.mapUrl && (
              <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-4">
                {t.common.openMap}
                <span className="sr-only"> ({t.common.opensInNewTab})</span>
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
