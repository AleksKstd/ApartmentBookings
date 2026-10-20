import { describe, expect, it } from "vitest";
import bg from "@/i18n/bg";
import en from "@/i18n/en";
import { fmt, pick } from "@/i18n";
import { AMENITY_KEYS } from "@/lib/data/defaults";

function shape(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (Array.isArray(value)) return [`${prefix}[]`];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  return Object.values(value as Record<string, unknown>).flatMap(strings);
}

describe("dictionaries", () => {
  it("have identical keys in Bulgarian and English", () => {
    expect(shape(en).sort()).toEqual(shape(bg).sort());
  });

  it("have no empty strings", () => {
    for (const s of [...strings(bg), ...strings(en)]) expect(s.trim()).not.toBe("");
  });

  it("keep placeholders consistent between languages", () => {
    const keys = shape(bg).filter((k) => !k.endsWith("[]"));
    const get = (obj: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)[k], obj) as string;
    for (const key of keys) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(ph(get(en, key)), key).toEqual(ph(get(bg, key)));
    }
  });

  it("translate every amenity", () => {
    for (const key of AMENITY_KEYS) {
      expect(bg.amenities[key]).toBeTruthy();
      expect(en.amenities[key]).toBeTruthy();
    }
  });
});

describe("helpers", () => {
  it("fmt replaces placeholders", () => {
    expect(fmt("{n} of {total}", { n: 1, total: 3 })).toBe("1 of 3");
    expect(fmt("{missing}", {})).toBe("{missing}");
  });

  it("pick falls back to Bulgarian", () => {
    expect(pick({ bg: "Здравей", en: "" }, "en")).toBe("Здравей");
    expect(pick({ bg: "Здравей", en: "Hello" }, "en")).toBe("Hello");
  });
});
