import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { getDictionary, isLocale } from "@/i18n";
import { getSiteData } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).meta.contact } : {};
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property } = await getSiteData();
  const items = [
    { icon: Mail, label: t.common.email, value: property.contactEmail, href: `mailto:${property.contactEmail}` },
    { icon: Phone, label: t.common.phone, value: property.contactPhone, href: `tel:${property.contactPhone.replace(/\s/g, "")}` },
    { icon: MapPin, label: t.common.address, value: property.address, href: property.mapUrl || undefined },
  ];

  return (
    <section className="section">
      <div className="container max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{t.contact.title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{t.contact.subtitle}</p>
        <ul className="mt-10 grid gap-4">
          {items.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="card flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sea-50 text-sea-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">{label}</p>
                {href ? (
                  <a href={href} className="break-words text-lg font-semibold text-sea-800 hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {value}
                  </a>
                ) : (
                  <p className="text-lg font-semibold">{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-ink-muted">{t.contact.responseTime}</p>
        <Link href={`/${locale}/booking`} className="btn-primary mt-8 px-6 py-3 text-base">
          {t.common.checkAvailability}
        </Link>
      </div>
    </section>
  );
}
