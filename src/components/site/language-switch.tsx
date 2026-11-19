"use client";

import { usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { locale: Locale; short: string; name: keyof Pick<Dictionary["nav"], "bulgarian" | "english"> }[] = [
  { locale: "bg", short: "БГ", name: "bulgarian" },
  { locale: "en", short: "EN", name: "english" },
];

/**
 * БГ | EN segmented switch: both languages always visible, the current one filled.
 * Plain <a> links on purpose: a full load re-renders the root layout so <html lang> and metadata follow.
 */
export function LanguageSwitch({ locale, t, tone = "light" }: { locale: Locale; t: Dictionary["nav"]; tone?: "light" | "dark" }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(bg|en)(?=\/|$)/, "");
  return (
    <nav aria-label={t.language}>
      <ul className={cn("flex rounded-lg p-1 ring-2 ring-inset", tone === "light" ? "ring-sea-700" : "ring-white/50")}>
        {OPTIONS.map((o) => {
          const current = o.locale === locale;
          return (
            <li key={o.locale}>
              <a
                href={`/${o.locale}${rest}`}
                hrefLang={o.locale}
                lang={o.locale}
                aria-label={t[o.name]}
                aria-current={current ? "true" : undefined}
                onClick={() => {
                  document.cookie = `NEXT_LOCALE=${o.locale}; path=/; max-age=31536000; samesite=lax`;
                }}
                className={cn(
                  "grid h-8 min-w-[2.75rem] place-items-center rounded-md px-2 font-display text-base font-bold leading-none transition-colors",
                  tone === "light"
                    ? current ? "bg-sea-700 text-white" : "text-sea-700 hover:bg-sea-50"
                    : current ? "bg-white text-sea-900" : "text-sea-100 hover:bg-white/10",
                )}
              >
                {o.short}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
