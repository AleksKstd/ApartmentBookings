"use server";

import { z } from "zod";
import { getRepository } from "@/lib/data";
import { AMENITY_KEYS } from "@/lib/data/defaults";
import type { HomepageContent, PropertyInfo } from "@/lib/types";
import { type ActionResult, AdminInputError, ok, fail, refreshEverything, str, localized, intField, guarded } from "./shared";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export async function saveHomepage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const count = Math.min(Number(formData.get("highlightCount")) || 0, 12);
    const highlights: HomepageContent["highlights"] = [];
    for (let i = 0; i < count; i++) {
      if (formData.get(`highlights.${i}.remove`) === "on") continue;
      const item = { title: localized(formData, `highlights.${i}.title`, 120), text: localized(formData, `highlights.${i}.text`, 400) };
      if (item.title.bg || item.title.en) highlights.push(item);
    }
    const homepage: HomepageContent = {
      heroTitle: localized(formData, "heroTitle", 120),
      heroSubtitle: localized(formData, "heroSubtitle", 300),
      introTitle: localized(formData, "introTitle", 120),
      introText: localized(formData, "introText", 3000),
      highlights,
      locationTitle: localized(formData, "locationTitle", 120),
      locationText: localized(formData, "locationText", 1000),
      ctaTitle: localized(formData, "ctaTitle", 120),
      ctaText: localized(formData, "ctaText", 300),
    };
    if (!homepage.heroTitle.bg) return fail("Заглавието на български е задължително.");
    await getRepository().saveSettings("homepage", homepage);
    refreshEverything();
    return ok("Началната страница е запазена.");
  });
}

export async function saveProperty(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const coord = (key: string, limit: number) => {
      const raw = str(formData, key, 20);
      if (!raw) return null;
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || Math.abs(n) > limit) throw new AdminInputError("Невалидни координати");
      return n;
    };
    const time = (key: string) => {
      const v = str(formData, key, 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new AdminInputError("Часът трябва да е във формат ЧЧ:ММ");
      return v;
    };
    const mapUrl = str(formData, "mapUrl", 500);
    if (mapUrl && !/^https:\/\//.test(mapUrl)) return fail("Линкът към картата трябва да започва с https://");
    const email = str(formData, "contactEmail", 254);
    if (!z.email().safeParse(email).success) return fail("Невалиден имейл за контакт.");
    const property: PropertyInfo = {
      name: str(formData, "name", 80),
      tagline: localized(formData, "tagline", 200),
      description: localized(formData, "description", 5000),
      address: str(formData, "address", 200),
      city: localized(formData, "city", 80),
      mapUrl,
      latitude: coord("latitude", 90),
      longitude: coord("longitude", 180),
      bedrooms: intField(formData, "bedrooms", 0, 50),
      bathrooms: intField(formData, "bathrooms", 0, 50),
      beds: intField(formData, "beds", 0, 100),
      areaSqm: intField(formData, "areaSqm", 1, 10000),
      checkInTime: time("checkInTime"),
      checkOutTime: time("checkOutTime"),
      amenities: formData.getAll("amenities").map(String).filter((a) => (AMENITY_KEYS as readonly string[]).includes(a)),
      houseRules: localized(formData, "houseRules", 3000),
      contactEmail: email,
      contactPhone: str(formData, "contactPhone", 40),
    };
    if (!property.name) return fail("Името на обекта е задължително.");
    await getRepository().saveSettings("property", property);
    refreshEverything();
    return ok("Информацията за обекта е запазена.");
  });
}
