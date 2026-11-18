import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { UnsafeUrlError } from "@/lib/net-guard";
import { BookingConflictError } from "@/lib/data";
import type { Localized } from "@/lib/types";

// Helpers shared by the admin server actions (not actions themselves).

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Validation problems whose message is safe (and meant) to show to the owner. */
export class AdminInputError extends Error {}

export const ok = (message: string): ActionResult => ({ ok: true, message });
export const fail = (message: string): ActionResult => ({ ok: false, message });

export function refreshEverything() {
  revalidatePath("/", "layout");
}

export const str = (fd: FormData, key: string, max = 5000) => String(fd.get(key) ?? "").trim().slice(0, max);
export const localized = (fd: FormData, key: string, max = 5000): Localized => ({ bg: str(fd, `${key}.bg`, max), en: str(fd, `${key}.en`, max) });

/** "12,50" / "12.50" (euros) → 1250 cents */
export function parseMoney(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new AdminInputError("Невалидна сума");
  return Math.round(n * 100);
}

const FIELD_LABELS: Record<string, string> = {
  includedGuests: "Включени гости",
  maxGuests: "Максимален брой гости",
  minNights: "Минимален престой",
  maxNights: "Максимален престой",
  weeklyDiscountPercent: "Седмична отстъпка",
  monthlyDiscountPercent: "Месечна отстъпка",
  bookingWindowDays: "Резервации напред (дни)",
  holdMinutes: "Задържане (минути)",
  bedrooms: "Спални",
  bathrooms: "Бани",
  beds: "Легла",
  areaSqm: "Площ",
};

export function intField(fd: FormData, key: string, min: number, max: number): number {
  const n = Number(fd.get(key));
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AdminInputError(`Невалидна стойност за „${FIELD_LABELS[key] ?? key}“ (цяло число от ${min} до ${max}).`);
  }
  return n;
}

export async function guarded(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  await requireAdmin();
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() propagate
    if (error instanceof BookingConflictError) return fail("Датите се застъпват с друга активна резервация.");
    if (error instanceof AdminInputError || error instanceof UnsafeUrlError) return fail(error.message);
    // Anything else may be a raw database/Stripe message: log it, show a generic one.
    console.error("[admin]", error);
    return fail("Възникна грешка. Опитайте отново или проверете дневника на сървъра.");
  }
}
