import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { getSiteData } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).meta.privacy } : {};
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property } = await getSiteData();
  return (
    <section className="section">
      <div className="container max-w-3xl space-y-5">
        <h1 className="text-4xl">{t.privacy.title}</h1>
        {t.privacy.body.map((p) => (
          <p key={p} className="leading-relaxed text-ink-muted">{p}</p>
        ))}
        <p className="font-semibold">
          {property.name} · <a className="text-sea-700 underline" href={`mailto:${property.contactEmail}`}>{property.contactEmail}</a>
        </p>
      </div>
    </section>
  );
}
