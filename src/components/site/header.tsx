"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Header({ locale, t, siteName }: { locale: Locale; t: Dictionary["nav"]; siteName: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const otherLocale: Locale = locale === "bg" ? "en" : "bg";
  const switchHref = `/${otherLocale}${pathname.replace(/^\/(bg|en)(?=\/|$)/, "")}`;
  const links = [
    { href: `/${locale}`, label: t.home },
    { href: `/${locale}/apartment`, label: t.apartment },
    { href: `/${locale}/gallery`, label: t.gallery },
    { href: `/${locale}/contact`, label: t.contact },
  ];
  const isActive = (href: string) => (href === `/${locale}` ? pathname === href : pathname.startsWith(href));

  const rememberLocale = () => {
    document.cookie = `NEXT_LOCALE=${otherLocale}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sea-900/5 bg-sand-50/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="font-serif text-xl font-semibold text-sea-800">
          {siteName}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:text-sea-800",
                isActive(l.href) && "text-sea-800",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={switchHref}
            onClick={rememberLocale}
            hrefLang={otherLocale}
            lang={otherLocale}
            className="btn-ghost px-3"
            aria-label={`${t.language}: ${t.switchTo}`}
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t.switchTo}</span>
            <span className="sm:hidden">{otherLocale.toUpperCase()}</span>
          </Link>
          <Link href={`/${locale}/booking`} className="btn-primary hidden sm:inline-flex">
            {t.bookNow}
          </Link>
          <button
            type="button"
            className="btn-ghost px-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="animate-fade-in border-t border-sea-900/5 bg-sand-50 md:hidden">
          <ul className="container flex flex-col py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-sea-900 hover:bg-sea-50"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 px-3 pb-2">
              <Link href={`/${locale}/booking`} className="btn-primary w-full">
                {t.bookNow}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
