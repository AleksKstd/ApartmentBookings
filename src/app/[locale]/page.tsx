import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { AmenityList } from "@/components/site/amenity-list";
import { Facts } from "@/components/site/facts";
import { Gallery } from "@/components/site/gallery";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { SectionHeading } from "@/components/site/section-heading";
import { StaySearch } from "@/components/site/stay-search";
import { StructuredData } from "@/components/site/structured-data";
import { getDictionary, isLocale, pick } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, homepage, pricing, carousel, gallery, lowestNightly } =
    await getSiteData();
  const slides = (carousel.length ? carousel : gallery.slice(0, 1)).map(
    (m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }),
  );

  return (
    <>
      <StructuredData
        locale={locale}
        property={property}
        pricing={pricing}
        photos={gallery}
        lowestNightly={lowestNightly}
      />
      <HeroCarousel
        slides={slides}
        title={pick(homepage.heroTitle, locale)}
        subtitle={pick(homepage.heroSubtitle, locale)}
        primaryCta={{
          href: `/${locale}/booking`,
          label: t.common.checkAvailability,
        }}
        secondaryCta={{
          href: `/${locale}/apartment`,
          label: t.common.learnMore,
        }}
        t={t.carousel}
      />

      <div className="container relative z-10 -mt-12 sm:-mt-14">
        <StaySearch locale={locale} t={t} maxGuests={pricing.maxGuests} />
      </div>

      <section className="section">
        <div className="container">
          <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="eyebrow mb-5">01 · {pick(property.city, locale)}</p>
              <h2 className="text-4xl leading-[1.05] sm:text-6xl">
                {pick(homepage.introTitle, locale)}
              </h2>
            </div>
            <div>
              <p className="whitespace-pre-line text-lg leading-relaxed text-ink-muted">
                {pick(homepage.introText, locale)}
              </p>
              <p className="mt-6 flex items-baseline gap-2 border-t border-ink/15 pt-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                  {t.apartment.pricesFrom}
                </span>
                <span className="font-serif text-4xl text-ink">
                  {formatMoney(lowestNightly, pricing.currency, locale)}
                </span>
                <span className="text-sm text-ink-muted">
                  / {t.common.night}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-14">
            <h3 className="sr-only">{t.home.factsTitle}</h3>
            <Facts property={property} pricing={pricing} t={t} />
          </div>
        </div>
      </section>

      {homepage.highlights.length > 0 && (
        <section className="section bg-white">
          <div className="container">
            <SectionHeading eyebrow="02" title={t.home.highlightsTitle} />
            <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
              {homepage.highlights.map((h, i) => (
                <li key={i} className="border-t-2 border-ink pt-6">
                  <span className="index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-2xl">{pick(h.title, locale)}</h3>
                  <p className="mt-3 leading-relaxed text-ink-muted">
                    {pick(h.text, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="03" title={t.home.galleryTitle} />
            <Link
              href={`/${locale}/gallery`}
              className="btn-outline mb-10 sm:mb-14"
            >
              {t.common.viewAll}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <Gallery
            variant="preview"
            photos={gallery
              .slice(0, 5)
              .map((m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }))}
            t={t.galleryPage}
            carouselT={t.carousel}
            closeLabel={t.common.close}
          />
        </div>
      </section>

      <section className="section bg-white">
        <div className="container grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <SectionHeading eyebrow="04" title={t.home.amenitiesTitle} />
            <Link href={`/${locale}/apartment`} className="btn-outline">
              {t.common.learnMore}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <AmenityList amenities={property.amenities} t={t} limit={9} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-0">
            <div className="py-2 lg:border-r lg:border-ink/15 lg:pr-12">
              <SectionHeading
                eyebrow="05"
                title={pick(homepage.locationTitle, locale)}
                text={pick(homepage.locationText, locale)}
              />
              <p className="flex items-start gap-3 text-ink">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0 text-clay-600"
                  aria-hidden
                />
                {property.address}
              </p>
              {property.mapUrl && (
                <a
                  href={property.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline mt-8"
                >
                  {t.common.openMap}
                  <span className="sr-only"> {t.common.opensNewTab}</span>
                </a>
              )}
            </div>
            <div className="flex flex-col justify-between gap-10 bg-sea-900 p-8 text-white sm:p-12 lg:ml-12">
              <div>
                <p className="eyebrow mb-5 text-clay-400">{property.name}</p>
                <h2 className="text-4xl leading-[1.05] text-white sm:text-5xl">
                  {pick(homepage.ctaTitle, locale)}
                </h2>
                <p className="mt-4 max-w-md text-white/75">
                  {pick(homepage.ctaText, locale)}
                </p>
              </div>
              <Link
                href={`/${locale}/booking`}
                className="btn-primary self-start px-7 py-4"
              >
                {t.common.checkAvailability}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
