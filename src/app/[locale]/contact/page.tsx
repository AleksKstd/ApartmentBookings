import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { getDictionary, isLocale, pick } from "@/i18n";
import { publicContact, shown } from "@/lib/placeholder";
import { getSiteData } from "@/lib/site";
import { langFor } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).meta.contact } : {};
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { property, demo } = await getSiteData();
  const replyTime = shown(pick(property.replyTime, locale), demo) ?? t.contact.responseTime;
  const contact = publicContact(property, demo);
  const items = [
    contact.email && { icon: Mail, label: t.common.email, value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: Phone, label: t.common.phone, value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
    contact.address && { icon: MapPin, label: t.common.address, value: contact.address, href: property.mapUrl || undefined },
  ].filter((item): item is { icon: typeof Mail; label: string; value: string; href: string | undefined } => Boolean(item));

  return (
    <section className="section">
      <div className="container max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{t.contact.title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{t.contact.subtitle}</p>
        <ul className="mt-10 grid grid-cols-1 border-t-2 border-sea-700">
          {items.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="flex items-center gap-4 border-b border-sand-300 py-5">
              <span className="plate grid h-12 w-12 shrink-0 place-items-center">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">{label}</p>
                {href ? (
                  <a href={href} lang={langFor(value)} className="text-lg [overflow-wrap:anywhere] font-semibold text-sea-800 hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {value}
                  </a>
                ) : (
                  <p lang={langFor(value)} className="text-lg font-semibold">{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-lg text-ink">{replyTime}</p>
        <Link href={`/${locale}/booking`} className="btn-primary mt-8 px-6 py-3 text-base">
          {t.common.checkAvailability}
        </Link>
      </div>
    </section>
  );
}
