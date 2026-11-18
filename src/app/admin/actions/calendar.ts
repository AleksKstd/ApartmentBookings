"use server";

import { syncFeed, validateFeedUrl } from "@/lib/calendar-sync";
import { getRepository } from "@/lib/data";
import { isIsoDate } from "@/lib/dates";
import { type ActionResult, ok, fail, refreshEverything, str, guarded } from "./shared";

// ---------------------------------------------------------------------------
// Calendar blocks and external feeds
// ---------------------------------------------------------------------------

export async function addBlockedRange(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const start = str(formData, "startDate", 10);
    const end = str(formData, "endDate", 10);
    if (!isIsoDate(start) || !isIsoDate(end) || end <= start) return fail("Изберете валиден период (крайната дата е денят след последната блокирана нощ).");
    const repo = getRepository();
    const active = await repo.listBookings({ status: ["pending", "awaiting_payment", "confirmed"], from: start, to: end });
    if (active.length) return fail(`Периодът съдържа активна резервация (${active.map((b) => b.reference).join(", ")}).`);
    await repo.createBlockedRange({ startDate: start, endDate: end, reason: str(formData, "reason", 200) || null, source: "manual", feedId: null, externalUid: null });
    refreshEverything();
    return ok("Периодът е блокиран.");
  });
}

export async function deleteBlockedRange(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().deleteBlockedRange(id);
    refreshEverything();
    return ok("Блокировката е премахната.");
  });
}

export async function saveFeed(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const name = str(formData, "name", 80);
    const url = str(formData, "url", 2000);
    if (!name) return fail("Въведете име.");
    try {
      validateFeedUrl(url);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Невалиден адрес");
    }
    const feed = await getRepository().saveFeed({ name, url, isActive: true });
    const result = await syncFeed(feed);
    refreshEverything();
    return result.ok ? ok(`Календарът е добавен и синхронизиран (${result.count} периода).`) : fail(`Календарът е добавен, но синхронизацията неуспешна: ${result.error}`);
  });
}

export async function syncFeedNow(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const feed = (await getRepository().listFeeds()).find((f) => f.id === id);
    if (!feed) return fail("Календарът не е намерен.");
    const result = await syncFeed(feed);
    refreshEverything();
    return result.ok ? ok(`Синхронизирано: ${result.count} периода.`) : fail(`Грешка: ${result.error}`);
  });
}

export async function toggleFeed(id: string, active: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const feed = (await getRepository().listFeeds()).find((f) => f.id === id);
    if (!feed) return fail("Календарът не е намерен.");
    await getRepository().saveFeed({ ...feed, isActive: active });
    refreshEverything();
    return ok(active ? "Активиран." : "Спрян.");
  });
}

export async function deleteFeed(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().deleteFeed(id);
    refreshEverything();
    return ok("Календарът и импортираните от него периоди са премахнати.");
  });
}
