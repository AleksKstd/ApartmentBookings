"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { endAdminSession, requireAdmin, startAdminSession } from "@/lib/auth/admin";
import { verifyAdminCredentials } from "@/lib/auth/password";
import { generateAccessToken, generateReference } from "@/lib/booking-service";
import { syncFeed, validateFeedUrl } from "@/lib/calendar-sync";
import { BookingConflictError, getRepository, isDemoMode } from "@/lib/data";
import { AMENITY_KEYS } from "@/lib/data/defaults";
import { diffDays, isIsoDate, rangesOverlap } from "@/lib/dates";
import { sendGuestEmail } from "@/lib/email";
import { MAX_UPLOAD_BYTES, extensionFor, sniffImageType } from "@/lib/image-sniff";
import { PricingError, calculateQuote } from "@/lib/pricing";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { HomepageContent, Localized, PricingSettings, PropertyInfo } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

function refreshEverything() {
  revalidatePath("/", "layout");
}

const str = (fd: FormData, key: string, max = 5000) => String(fd.get(key) ?? "").trim().slice(0, max);
const localized = (fd: FormData, key: string, max = 5000): Localized => ({ bg: str(fd, `${key}.bg`, max), en: str(fd, `${key}.en`, max) });

/** "12,50" / "12.50" (euros) → 1250 cents */
async function parseMoney(value: string): Promise<number> {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error("Невалидна сума");
  return Math.round(n * 100);
}

function intField(fd: FormData, key: string, min: number, max: number): number {
  const n = Number(fd.get(key));
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Невалидна стойност за „${key}“ (${min}–${max})`);
  return n;
}

async function guarded(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  await requireAdmin();
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() propagate
    if (error instanceof BookingConflictError) return fail("Датите се застъпват с друга активна резервация.");
    console.error("[admin]", error);
    return fail(error instanceof Error ? error.message : "Възникна грешка");
  }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 5, 15 * 60_000)) {
    return fail("Твърде много неуспешни опити. Опитайте отново след 15 минути.");
  }
  const username = str(formData, "username", 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!(await verifyAdminCredentials(username, password, isDemoMode()))) {
    return fail("Невалидно потребителско име или парола.");
  }
  resetRateLimit(`login:${ip}`);
  await startAdminSession(username);
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function confirmBooking(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const booking = await repo.getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    if (booking.status === "confirmed") return ok("Резервацията вече е потвърдена.");
    const updated = await repo.updateBooking(id, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      cancelledAt: null,
      holdExpiresAt: null,
    });
    const sent = await sendGuestEmail("confirmed", updated);
    refreshEverything();
    return ok(sent ? "Потвърдена. Гостът е уведомен по имейл." : "Потвърдена. (Имейлът е записан в дневника — изпращането не е конфигурирано.)");
  });
}

export async function cancelBooking(id: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const booking = await repo.getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    if (booking.status === "cancelled") return ok("Резервацията вече е отказана.");
    const refund = formData.get("refund") === "on";
    const notify = formData.get("notify") === "on";
    let refunded = false;
    if (refund && booking.paymentStatus === "paid" && booking.stripePaymentIntent) {
      if (!isStripeConfigured()) return fail("Stripe не е конфигуриран — възстановете сумата ръчно.");
      await getStripe().refunds.create({ payment_intent: booking.stripePaymentIntent }, { idempotencyKey: `refund-${booking.id}` });
      refunded = true;
    }
    const reason = str(formData, "reason", 500);
    const updated = await repo.updateBooking(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      paymentStatus: refunded ? "refunded" : booking.paymentStatus,
      adminNote: reason ? [booking.adminNote, `Отказ: ${reason}`].filter(Boolean).join("\n") : booking.adminNote,
    });
    if (notify) await sendGuestEmail("cancelled", updated);
    refreshEverything();
    return ok(`Резервацията е отказана${refunded ? " и сумата е възстановена" : ""}.`);
  });
}

export async function markBookingPaid(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateBooking(id, { paymentStatus: "paid" });
    refreshEverything();
    return ok("Отбелязана като платена.");
  });
}

export async function saveAdminNote(id: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateBooking(id, { adminNote: str(formData, "adminNote", 4000) || null });
    refreshEverything();
    return ok("Бележката е запазена.");
  });
}

export async function resendGuestEmail(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const booking = await getRepository().getBooking(id);
    if (!booking) return fail("Резервацията не е намерена.");
    const kind = booking.status === "confirmed" ? "confirmed" : booking.status === "cancelled" ? "cancelled" : "received";
    const sent = await sendGuestEmail(kind, booking);
    return ok(sent ? "Имейлът е изпратен." : "Имейлът е записан в дневника (изпращането не е конфигурирано).");
  });
}

const manualBookingSchema = z.object({
  checkIn: z.string().refine(isIsoDate, "Невалидна дата на настаняване"),
  checkOut: z.string().refine(isIsoDate, "Невалидна дата на напускане"),
  guests: z.coerce.number().int().min(1).max(50),
  guestName: z.string().trim().min(2, "Въведете име").max(120),
  guestEmail: z.string().trim().toLowerCase().pipe(z.email("Невалиден имейл")),
  guestPhone: z.string().trim().max(40),
  guestNote: z.string().trim().max(2000),
  locale: z.enum(["bg", "en"]),
});

export async function createManualBooking(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = manualBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Невалидни данни");
    const input = parsed.data;
    if (input.checkOut <= input.checkIn) return fail("Датата на напускане трябва да е след настаняването.");
    const repo = getRepository();
    const [settings, seasons, blocked] = await Promise.all([repo.getSettings(), repo.listSeasonalRates(), repo.listBlockedRanges()]);
    if (blocked.some((b) => rangesOverlap(b.startDate, b.endDate, input.checkIn, input.checkOut))) {
      return fail("Датите са блокирани в календара (ръчно или от външен календар).");
    }
    // Admin bookings bypass guest-facing limits (min stay, guest cap) but are still priced the same way.
    const pricing: PricingSettings = { ...settings.pricing, minNights: 1, maxNights: 3650, maxGuests: Math.max(settings.pricing.maxGuests, input.guests) };
    let quote;
    try {
      quote = calculateQuote(input.checkIn, input.checkOut, input.guests, pricing, seasons.map((s) => ({ ...s, minNights: null })));
    } catch (error) {
      if (error instanceof PricingError) return fail("Невалиден период.");
      throw error;
    }
    const override = str(formData, "totalOverride", 20);
    const total = override ? await parseMoney(override) : quote.total;
    const now = new Date().toISOString();
    const booking = await repo.createBooking({
      reference: generateReference(),
      accessToken: generateAccessToken(),
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone || "—",
      guestNote: input.guestNote || null,
      locale: input.locale,
      nights: diffDays(input.checkIn, input.checkOut),
      totalAmount: total,
      currency: settings.pricing.currency,
      priceBreakdown: { ...quote, total },
      status: "confirmed",
      paymentStatus: formData.get("paid") === "on" ? "paid" : "unpaid",
      stripeSessionId: null,
      stripePaymentIntent: null,
      holdExpiresAt: null,
      adminNote: "Създадена ръчно от администратор",
      confirmedAt: now,
      cancelledAt: null,
    });
    if (formData.get("notify") === "on") await sendGuestEmail("confirmed", booking);
    refreshEverything();
    redirect(`/admin/bookings/${booking.id}`);
  });
}

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
      baseNightly: await parseMoney(str(formData, "baseNightly", 20)),
      weekendNightly: weekend ? await parseMoney(weekend) : null,
      cleaningFee: await parseMoney(str(formData, "cleaningFee", 20) || "0"),
      includedGuests: intField(formData, "includedGuests", 1, 50),
      extraGuestNightly: await parseMoney(str(formData, "extraGuestNightly", 20) || "0"),
      maxGuests: intField(formData, "maxGuests", 1, 50),
      minNights: intField(formData, "minNights", 1, 365),
      maxNights: intField(formData, "maxNights", 1, 3650),
      weeklyDiscountPercent: intField(formData, "weeklyDiscountPercent", 0, 90),
      monthlyDiscountPercent: intField(formData, "monthlyDiscountPercent", 0, 90),
      bookingWindowDays: intField(formData, "bookingWindowDays", 7, 1095),
      holdMinutes: intField(formData, "holdMinutes", 30, 1440),
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
    await getRepository().saveSeasonalRate({
      id: str(formData, "id", 64) || undefined,
      name: str(formData, "name", 80) || "Сезон",
      startDate,
      endDate,
      nightly: await parseMoney(str(formData, "nightly", 20)),
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

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export async function uploadMedia(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return fail("Изберете поне една снимка.");
    if (files.length > 20) return fail("Най-много 20 снимки наведнъж.");
    const repo = getRepository();
    const inCarousel = formData.get("inCarousel") === "on";
    let uploaded = 0;
    const rejected: string[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniffImageType(bytes);
      if (!type || file.size > MAX_UPLOAD_BYTES) {
        rejected.push(file.name);
        continue;
      }
      const stored = await repo.uploadMediaFile({ fileName: `photo.${extensionFor(type)}`, contentType: type, bytes });
      await repo.createMedia({
        url: stored.url,
        storagePath: stored.storagePath,
        alt: { bg: str(formData, "alt.bg", 200), en: str(formData, "alt.en", 200) },
        inCarousel,
        inGallery: true,
      });
      uploaded++;
    }
    refreshEverything();
    const note = rejected.length ? ` Отхвърлени (позволени са JPG, PNG, WebP, AVIF до 10 MB): ${rejected.join(", ")}` : "";
    return uploaded ? ok(`Качени снимки: ${uploaded}.${note}`) : fail(`Няма качени снимки.${note}`);
  });
}

/**
 * Production (Supabase) uploads go straight from the browser to Storage through a short-lived
 * signed URL, so photo size is not limited by the hosting platform's request body limit.
 */
export async function createUploadTarget(contentType: string, size: number): Promise<ActionResult & { signedUrl?: string; storagePath?: string }> {
  return guarded(async () => {
    const ext = extensionFor(contentType);
    if (!ext || size <= 0 || size > MAX_UPLOAD_BYTES) return fail("Позволени са JPG, PNG, WebP и AVIF до 10 MB.");
    const repo = getRepository();
    if (!repo.createUploadTarget) return fail("Директното качване не се поддържа в демо режим.");
    const target = await repo.createUploadTarget(ext);
    return { ok: true, message: "", ...target };
  });
}

export async function finalizeUpload(storagePath: string, alt: { bg: string; en: string }, inCarousel: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    if (!repo.readUploadedFile || !/^photos\/[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(storagePath)) return fail("Невалиден файл.");
    const bytes = await repo.readUploadedFile(storagePath);
    if (!bytes || bytes.length > MAX_UPLOAD_BYTES || sniffImageType(bytes) !== `image/${storagePath.endsWith(".jpg") ? "jpeg" : storagePath.split(".").pop()}`) {
      await repo.deleteMediaFile(storagePath).catch(() => undefined);
      return fail("Файлът не е валидна снимка и беше изтрит.");
    }
    await repo.createMedia({
      url: repo.publicMediaUrl!(storagePath),
      storagePath,
      alt: { bg: alt.bg.slice(0, 200), en: alt.en.slice(0, 200) },
      inCarousel,
      inGallery: true,
    });
    refreshEverything();
    return ok("Качено.");
  });
}

export async function updateMediaItem(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateMedia(id, {
      alt: localized(formData, "alt", 200),
      inCarousel: formData.get("inCarousel") === "on",
      inGallery: formData.get("inGallery") === "on",
    });
    refreshEverything();
    return ok("Запазено.");
  });
}

export async function moveMedia(id: string, direction: -1 | 1): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const ids = (await repo.listMedia()).map((m) => m.id);
    const i = ids.indexOf(id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ids.length) return ok("");
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await repo.reorderMedia(ids);
    refreshEverything();
    return ok("Подредбата е запазена.");
  });
}

export async function deleteMediaItem(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const removed = await repo.deleteMedia(id);
    if (removed?.storagePath) await repo.deleteMediaFile(removed.storagePath).catch((e) => console.error("[media] file delete failed", e));
    refreshEverything();
    return ok("Снимката е изтрита.");
  });
}

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
      if (!Number.isFinite(n) || Math.abs(n) > limit) throw new Error("Невалидни координати");
      return n;
    };
    const time = (key: string) => {
      const v = str(formData, key, 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error("Часът трябва да е във формат ЧЧ:ММ");
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

