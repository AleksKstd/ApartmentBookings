"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe, Menu, X } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Header({ locale, t, siteName }: { locale: Locale; t: Dictionary["nav"]; siteName: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
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
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-sand-50/95 backdrop-blur">
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <Link href={`/${locale}`} className="whitespace-nowrap font-serif text-xl tracking-[-0.02em] text-ink sm:text-2xl">
          {siteName}
        </Link>

        <nav aria-label={t.mainNavLabel} className="hidden h-full items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "flex h-full items-center border-b-2 border-transparent pt-0.5 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink",
                isActive(l.href) && "border-clay-600 text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Plain <a>: a full load re-renders the root layout so <html lang> and metadata follow the language. */}
          <a
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
          </a>
          <Link href={`/${locale}/booking`} className="btn-primary hidden sm:inline-flex">
            {t.bookNow}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="btn-ghost px-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label={t.mobileNavLabel} className="animate-fade-in border-t border-ink/10 bg-sand-50 md:hidden">
          <ul className="container flex flex-col py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className="block border-b border-ink/10 px-1 py-4 font-serif text-2xl text-ink hover:text-clay-600"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-6 pb-4">
              <Link href={`/${locale}/booking`} onClick={() => setOpen(false)} className="btn-primary w-full">
                {t.bookNow}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
