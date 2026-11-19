import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { AmenityList } from "@/components/site/amenity-list";
import { FactLine } from "@/components/site/facts";
import { Gallery } from "@/components/site/gallery";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { HostCard } from "@/components/site/host-card";
import { Nearby } from "@/components/site/nearby";
import { SectionHeading } from "@/components/site/section-heading";
import { getDictionary, isLocale, pick } from "@/i18n";
import { shown } from "@/lib/placeholder";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, homepage, pricing, carousel, gallery, lowestNightly, demo } = await getSiteData();
  const slides = (carousel.length ? carousel : gallery.slice(0, 1)).map((m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }));

  return (
    <>
      <HeroCarousel
        slides={slides}
        title={pick(homepage.heroTitle, locale)}
        subtitle={pick(homepage.heroSubtitle, locale)}
        primaryCta={{ href: `/${locale}/booking`, label: t.common.checkAvailability }}
        secondaryCta={{ href: `/${locale}/apartment`, label: t.common.learnMore }}
        t={t.carousel}
      />

      <section className="section">
        <div className="container grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl">{pick(homepage.introTitle, locale)}</h2>
            <p className="mt-5 max-w-prose whitespace-pre-line text-lg leading-relaxed text-ink-muted">{pick(homepage.introText, locale)}</p>
            <FactLine property={property} pricing={pricing} t={t} className="mt-6" />
            <p className="mt-6 text-sea-800">
              <span className="text-sm text-ink-muted">{t.apartment.pricesFrom} </span>
              <span className="text-2xl font-semibold tabular-nums">{formatMoney(lowestNightly, pricing.currency, locale)}</span>
              <span className="text-sm text-ink-muted"> / {t.common.night}</span>
            </p>
          </div>
          <Nearby items={homepage.nearby} locale={locale} demo={demo} title={t.home.nearbyTitle} />
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading title={t.home.galleryTitle} />
            <Link href={`/${locale}/gallery`} className="btn-outline mb-8 sm:mb-10">
              {t.common.viewAll}
            </Link>
          </div>
          <Gallery
            variant="preview"
            photos={gallery.slice(0, 5).map((m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }))}
            t={t.galleryPage}
            carouselT={t.carousel}
            closeLabel={t.common.close}
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title={t.home.amenitiesTitle} />
          <AmenityList amenities={property.amenities} t={t} limit={9} />
          <Link href={`/${locale}/apartment`} className="btn-outline mt-8">
            {t.apartment.amenitiesTitle}
          </Link>
        </div>
      </section>

      {shown(property.hostName, demo) && (
        <div className="section bg-white">
          <div className="container">
            <HostCard property={property} locale={locale} demo={demo} title={t.home.hostTitle} />
          </div>
        </div>
      )}

      <section className="section">
        <div className="container grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title={pick(homepage.locationTitle, locale)} text={pick(homepage.locationText, locale)} />
            <p className="flex items-start gap-2 text-ink">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-clay-500" aria-hidden />
              {property.address}
            </p>
            {property.mapUrl && (
              <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">
                {t.common.openMap}
                <span className="sr-only"> ({t.common.opensInNewTab})</span>
              </a>
            )}
          </div>
          <div className="rounded-3xl bg-sea-700 p-8 text-white sm:p-12">
            <h2 className="text-3xl text-white">{pick(homepage.ctaTitle, locale)}</h2>
            <p className="mt-3 text-sea-100">{pick(homepage.ctaText, locale)}</p>
            <Link href={`/${locale}/booking`} className="btn-primary mt-8 px-6 py-3 text-base">
              {t.common.checkAvailability}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

