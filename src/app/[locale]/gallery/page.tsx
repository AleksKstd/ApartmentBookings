import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/site/gallery";
import { getDictionary, isLocale, pick } from "@/i18n";
import { getSiteData } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).meta.gallery } : {};
}

export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { gallery } = await getSiteData();

  return (
    <section className="section">
      <div className="container">
        <h1 className="text-4xl sm:text-5xl">{t.galleryPage.title}</h1>
        <p className="mb-10 mt-3 text-lg text-ink-muted">{t.galleryPage.subtitle}</p>
        <Gallery
          photos={gallery.map((m) => ({ id: m.id, url: m.url, alt: pick(m.alt, locale) }))}
          t={t.galleryPage}
          carouselT={t.carousel}
          closeLabel={t.common.close}
        />
      </div>
    </section>
  );
}
