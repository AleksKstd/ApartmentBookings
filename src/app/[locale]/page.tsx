import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressPlate } from "@/components/site/address-plate";
import { AmenityList } from "@/components/site/amenity-list";
import { FactLine } from "@/components/site/facts";
import { Gallery } from "@/components/site/gallery";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { HostCard } from "@/components/site/host-card";
import { Nearby } from "@/components/site/nearby";
import { SearchPlate } from "@/components/site/search-plate";
import { SectionHeading } from "@/components/site/section-heading";
import { StreetSign } from "@/components/site/street-sign";
import { getDictionary, isLocale, pick } from "@/i18n";
import { todayAtProperty } from "@/lib/dates";
import { publicContact, shown } from "@/lib/placeholder";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, homepage, pricing, carousel, gallery, lowestNightly, demo } = await getSiteData();
  const contact = publicContact(property, demo);
  const slides = (carousel.length ? carousel : gallery.slice(0, 1)).map((m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }));

  return (
    <>
      {/* The opening: headline and the street sign, then the search as the primary action. */}
      <section className="container pb-14 pt-10 sm:pb-20 sm:pt-14" aria-labelledby="home-title">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <h1 id="home-title" className="max-w-[11ch] text-[clamp(2.75rem,7.2vw,6.25rem)]">{pick(homepage.heroTitle, locale)}</h1>
            <p className="mt-5 max-w-[38ch] text-xl text-ink-muted">{pick(homepage.heroSubtitle, locale)}</p>
          </div>
          <StreetSign sign={homepage.streetSign} note={pick(homepage.streetSign.note, locale)} />
        </div>
        <div className="mt-10">
          <SearchPlate locale={locale} t={t} today={todayAtProperty()} maxGuests={pricing.maxGuests} />
        </div>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-ink-muted">
          <span>
            {t.apartment.pricesFrom} <b className="font-semibold tabular-nums text-ink">{formatMoney(lowestNightly, pricing.currency, locale)}</b> / {t.common.night}
          </span>
          <span>{t.home.eventsNote}</span>
        </p>
        <div className="mt-10">
          <HeroCarousel slides={slides} t={t.carousel} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-4xl sm:text-5xl">{pick(homepage.introTitle, locale)}</h2>
            <p className="mt-5 max-w-prose whitespace-pre-line text-lg leading-relaxed text-ink-muted">{pick(homepage.introText, locale)}</p>
            <FactLine property={property} pricing={pricing} t={t} className="mt-6 text-lg" />
          </div>
        </div>
      </section>

      <Nearby
        items={homepage.nearby}
        locale={locale}
        demo={demo}
        title={t.home.nearbyTitle}
        note={t.home.nearbyNote}
        exampleNote={t.home.nearbyExample}
      />

      <section className="section">
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
        <div className="section">
          <div className="container">
            <HostCard property={property} locale={locale} demo={demo} />
          </div>
        </div>
      )}

      <section className="section">
        <div className="container grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title={pick(homepage.locationTitle, locale)} text={pick(homepage.locationText, locale)} />
            {contact.address && (
              <AddressPlate address={contact.address} href={property.mapUrl || undefined} label={t.common.openMap} newTab={t.common.opensInNewTab} />
            )}
          </div>
          <div className="plate">
            <div className="plate-face p-8 sm:p-12">
              <h2 className="text-4xl text-white sm:text-5xl">{pick(homepage.ctaTitle, locale)}</h2>
              <p className="mt-3 text-lg text-sea-100">{pick(homepage.ctaText, locale)}</p>
              <Link href={`/${locale}/booking`} className="btn mt-8 bg-white px-6 py-3 text-lg text-sea-700 hover:bg-sea-50">
                {t.common.checkAvailability} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

