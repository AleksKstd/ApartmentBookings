import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Dictionary } from "@/i18n";
import { publicContact } from "@/lib/placeholder";
import { LanguageSwitch } from "./language-switch";
import { langFor } from "@/lib/utils";
import type { Locale, PropertyInfo } from "@/lib/types";

export function Footer({ locale, t, property, demo }: { locale: Locale; t: Dictionary; property: PropertyInfo; demo: boolean }) {
  const contact = publicContact(property, demo);
  return (
    <footer className="mt-auto bg-sea-900 text-sea-100">
      <div className="container grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-display text-3xl font-extrabold text-white">{property.name}</p>
          <p className="mt-2 text-sm text-sea-200">{t.footer.directBooking}</p>
        </div>
        <ul className="space-y-3 text-sm">
          {contact.address && (
            <li className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
              <span lang={langFor(contact.address)}>{contact.address}</span>
            </li>
          )}
          {contact.email && (
            <li className="flex gap-3">
              <Mail className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
              <a href={`mailto:${contact.email}`} className="hover:text-white">
                {contact.email}
              </a>
            </li>
          )}
          {contact.phone && (
            <li className="flex gap-3">
              <Phone className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {contact.phone}
              </a>
            </li>
          )}
        </ul>
        <nav aria-label={t.nav.footerLabel} className="flex flex-col gap-2 text-sm">
          <Link href={`/${locale}/apartment`} className="hover:text-white">{t.nav.apartment}</Link>
          <Link href={`/${locale}/gallery`} className="hover:text-white">{t.nav.gallery}</Link>
          <Link href={`/${locale}/booking`} className="hover:text-white">{t.nav.booking}</Link>
          <Link href={`/${locale}/contact`} className="hover:text-white">{t.nav.contact}</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-white">{t.meta.privacy}</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="text-xs text-sea-200">
            © {new Date().getFullYear()} {property.name}. {t.footer.rights}
          </p>
          <LanguageSwitch locale={locale} t={t.nav} tone="dark" />
        </div>
      </div>
    </footer>
  );
}
