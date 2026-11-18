import type { Metadata } from "next";
import { LOCALES } from "@/i18n";
import type { Locale } from "@/lib/types";

/**
 * Per-page canonical URL and hreflang alternates (each language version points at the same page in
 * the other language, plus x-default), so search engines index the right page per language.
 */
export function localizedAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;
  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l === "bg" ? "bg-BG" : "en-GB", `/${l}${suffix}`])),
      "x-default": `/bg${suffix}`,
    },
  };
}

export function pageMetadata(locale: Locale, path: string, title: string | undefined, description?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: localizedAlternates(locale, path),
    openGraph: {
      url: `/${locale}${path === "/" ? "" : path}`,
      locale: locale === "bg" ? "bg_BG" : "en_GB",
      alternateLocale: locale === "bg" ? "en_GB" : "bg_BG",
      type: "website",
      // Set explicitly: a page-level openGraph object replaces the parent's, including the generated image.
      images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630 }],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    },
  };
}
