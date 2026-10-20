import bg, { type Dictionary } from "./bg";
import en from "./en";
import type { Locale, Localized } from "@/lib/types";

export const LOCALES: Locale[] = ["bg", "en"];
export const DEFAULT_LOCALE: Locale = "bg";

const dictionaries: Record<Locale, Dictionary> = { bg, en };

export function isLocale(value: unknown): value is Locale {
  return value === "bg" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Replaces `{key}` placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Picks the localized text, falling back to Bulgarian when a translation is missing. */
export function pick(text: Localized, locale: Locale): string {
  return text[locale]?.trim() ? text[locale] : text.bg;
}

export function htmlLang(locale: Locale): string {
  return locale === "bg" ? "bg-BG" : "en-GB";
}

export type { Dictionary };
