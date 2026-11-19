"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LanguageSwitch } from "./language-switch";

export function Header({ locale, t, siteName }: { locale: Locale; t: Dictionary["nav"]; siteName: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    // Focus the first link on open; Escape closes and returns focus to the toggle.
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: `/${locale}`, label: t.home },
    { href: `/${locale}/apartment`, label: t.apartment },
    { href: `/${locale}/gallery`, label: t.gallery },
    { href: `/${locale}/contact`, label: t.contact },
  ];
  const isActive = (href: string) => (href === `/${locale}` ? pathname === href : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-sea-900/10 bg-sand-50/95 backdrop-blur">
      <div className="container flex min-h-16 items-center justify-between gap-4 py-2">
        {/* The name on its own small enamel plate. */}
        <Link href={`/${locale}`} className="plate min-w-0 shrink sm:whitespace-nowrap">
          <span className="plate-face block px-4 py-2 font-display text-xl font-extrabold leading-tight sm:text-2xl">{siteName}</span>
        </Link>

        <nav aria-label={t.mainLabel} className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-[0.9375rem] font-semibold text-ink-muted underline-offset-[6px] hover:text-sea-700",
                isActive(l.href) && "text-sea-700 underline decoration-2",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitch locale={locale} t={t} />
          <Link href={`/${locale}/booking`} className="btn-primary hidden sm:inline-flex">
            {t.bookNow}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="btn-ghost px-2.5 lg:hidden"
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
        <nav ref={menuRef} id="mobile-menu" aria-label={t.mobileLabel} className="animate-fade-in border-t border-sea-900/5 bg-sand-50 lg:hidden">
          <ul className="container flex flex-col py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className="block rounded-xl px-3 py-3 text-base font-semibold text-sea-900 hover:bg-sea-50"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 px-3 pb-2">
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
