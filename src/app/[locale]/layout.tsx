import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { getDictionary, isLocale, pick } from "@/i18n";
import { pageMetadata } from "@/lib/seo";
import { getSiteData } from "@/lib/site";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { property } = await getSiteData();
  const t = getDictionary(locale);
  const home = pageMetadata(locale, "/", undefined, t.meta.siteDescription);
  return {
    ...home,
    title: { default: `${property.name} — ${pick(property.tagline, locale)}`, template: `%s · ${property.name}` },
    openGraph: { ...home.openGraph, siteName: property.name },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, demo } = await getSiteData();

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        {t.nav.skipToContent}
      </a>
      {demo && (
        <div className="bg-clay-600 px-4 py-1.5 text-center text-xs font-medium text-white" role="note">
          {t.demo.banner}
        </div>
      )}
      <Header locale={locale} t={t.nav} siteName={property.name} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer locale={locale} t={t} property={property} />
    </>
  );
}
