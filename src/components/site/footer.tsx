import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale, PropertyInfo } from "@/lib/types";

export function Footer({ locale, t, property }: { locale: Locale; t: Dictionary; property: PropertyInfo }) {
  return (
    <footer className="mt-auto bg-sea-900 text-sea-100">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-serif text-2xl text-white">{property.name}</p>
          <p className="mt-2 text-sm text-sea-200">{t.footer.directBooking}</p>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
            <span>{property.address}</span>
          </li>
          <li className="flex gap-3">
            <Mail className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
            <a href={`mailto:${property.contactEmail}`} className="hover:text-white">
              {property.contactEmail}
            </a>
          </li>
          <li className="flex gap-3">
            <Phone className="h-5 w-5 shrink-0 text-clay-400" aria-hidden />
            <a href={`tel:${property.contactPhone.replace(/\s/g, "")}`} className="hover:text-white">
              {property.contactPhone}
            </a>
          </li>
        </ul>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <Link href={`/${locale}/apartment`} className="hover:text-white">{t.nav.apartment}</Link>
          <Link href={`/${locale}/gallery`} className="hover:text-white">{t.nav.gallery}</Link>
          <Link href={`/${locale}/booking`} className="hover:text-white">{t.nav.booking}</Link>
          <Link href={`/${locale}/contact`} className="hover:text-white">{t.nav.contact}</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-white">{t.meta.privacy}</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="container py-5 text-xs text-sea-200">
          © {new Date().getFullYear()} {property.name}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
