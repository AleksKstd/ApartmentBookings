"use server";

import { getRepository } from "@/lib/data";
import { isIsoDate } from "@/lib/dates";
import type { PricingSettings } from "@/lib/types";
import { type ActionResult, ok, fail, refreshEverything, str, parseMoney, intField, guarded } from "./shared";

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export async function savePricing(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const { pricing: current } = await repo.getSettings();
    const weekend = str(formData, "weekendNightly", 20);
    const pricing: PricingSettings = {
      currency: current.currency,
      baseNightly: parseMoney(str(formData, "baseNightly", 20)),
      weekendNightly: weekend ? parseMoney(weekend) : null,
      cleaningFee: parseMoney(str(formData, "cleaningFee", 20) || "0"),
      includedGuests: intField(formData, "includedGuests", 1, 50),
      extraGuestNightly: parseMoney(str(formData, "extraGuestNightly", 20) || "0"),
      maxGuests: intField(formData, "maxGuests", 1, 50),
      minNights: intField(formData, "minNights", 1, 365),
      maxNights: intField(formData, "maxNights", 1, 3650),
      weeklyDiscountPercent: intField(formData, "weeklyDiscountPercent", 0, 90),
      monthlyDiscountPercent: intField(formData, "monthlyDiscountPercent", 0, 90),
      bookingWindowDays: intField(formData, "bookingWindowDays", 7, 1095),
      holdMinutes: intField(formData, "holdMinutes", 32, 1440),
    };
    if (pricing.baseNightly <= 0) return fail("Основната цена трябва да е по-голяма от 0.");
    if (pricing.minNights > pricing.maxNights) return fail("Минималният престой не може да е по-дълъг от максималния.");
    if (pricing.includedGuests > pricing.maxGuests) return fail("Включените гости не може да са повече от максималния брой.");
    await repo.saveSettings("pricing", pricing);
    refreshEverything();
    return ok("Цените са запазени.");
  });
}

export async function saveSeasonalRate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const startDate = str(formData, "startDate", 10);
    const endDate = str(formData, "endDate", 10);
    if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) return fail("Невалиден период.");
    const minNights = str(formData, "minNights", 4);
    const nightly = parseMoney(str(formData, "nightly", 20));
    if (nightly <= 0) return fail("Сезонната цена трябва да е по-голяма от 0.");
    await getRepository().saveSeasonalRate({
      id: str(formData, "id", 64) || undefined,
      name: str(formData, "name", 80) || "Сезон",
      startDate,
      endDate,
      nightly,
      minNights: minNights ? intField(formData, "minNights", 1, 365) : null,
    });
    refreshEverything();
    return ok("Сезонната цена е запазена.");
  });
}

export async function deleteSeasonalRate(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().deleteSeasonalRate(id);
    refreshEverything();
    return ok("Сезонът е изтрит.");
  });
}
