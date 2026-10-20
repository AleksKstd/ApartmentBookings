import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n";
import { siteUrl } from "@/lib/site-url";

const PAGES = ["", "/apartment", "/gallery", "/booking", "/contact", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}${page}`,
      changeFrequency: page === "/booking" ? ("daily" as const) : ("weekly" as const),
      priority: page === "" ? 1 : 0.7,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${page}`])) },
    })),
  );
}
