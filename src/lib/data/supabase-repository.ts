import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BlockedRange, Booking, CalendarFeed, MediaItem, OutboxEmail, SeasonalRate } from "@/lib/types";
import { DEFAULT_SETTINGS } from "./defaults";
import {
  BookingConflictError,
  type BookingFilter,
  type NewBooking,
  type Repository,
  type SiteSettings,
  type UploadInput,
} from "./repository";

const MEDIA_BUCKET = "media";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are mapped explicitly below */
type Row = Record<string, any>;

/** Unwraps a PostgREST response, throwing on error (`.single()` data is non-null when there is no error). */
function check<T>(result: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (result.error) {
    const err = new Error(result.error.message) as Error & { code?: string };
    err.code = result.error.code;
    throw err;
  }
  return result.data as NonNullable<T>;
}

const toBooking = (r: Row): Booking => ({
  id: r.id,
  reference: r.reference,
  accessToken: r.access_token,
  checkIn: r.check_in,
  checkOut: r.check_out,
  guests: r.guests,
  guestName: r.guest_name,
  guestEmail: r.guest_email,
  guestPhone: r.guest_phone,
  guestNote: r.guest_note,
  locale: r.locale,
  nights: r.nights,
  totalAmount: r.total_cents,
  currency: r.currency,
  priceBreakdown: r.price_breakdown,
  status: r.status,
  paymentStatus: r.payment_status,
  stripeSessionId: r.stripe_session_id,
  stripePaymentIntent: r.stripe_payment_intent,
  holdExpiresAt: r.hold_expires_at,
  adminNote: r.admin_note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  confirmedAt: r.confirmed_at,
  cancelledAt: r.cancelled_at,
});

const BOOKING_COLUMNS: Record<keyof NewBooking, string> = {
  reference: "reference",
  accessToken: "access_token",
  checkIn: "check_in",
  checkOut: "check_out",
  guests: "guests",
  guestName: "guest_name",
  guestEmail: "guest_email",
  guestPhone: "guest_phone",
  guestNote: "guest_note",
  locale: "locale",
  nights: "nights",
  totalAmount: "total_cents",
  currency: "currency",
  priceBreakdown: "price_breakdown",
  status: "status",
  paymentStatus: "payment_status",
  stripeSessionId: "stripe_session_id",
  stripePaymentIntent: "stripe_payment_intent",
  holdExpiresAt: "hold_expires_at",
  adminNote: "admin_note",
  confirmedAt: "confirmed_at",
  cancelledAt: "cancelled_at",
};

function fromBooking(patch: Partial<NewBooking>): Row {
  const row: Row = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = BOOKING_COLUMNS[key as keyof NewBooking];
    if (column && value !== undefined) row[column] = value;
  }
  return row;
}

const toMedia = (r: Row): MediaItem => ({
  id: r.id,
  url: r.url,
  storagePath: r.storage_path,
  alt: { bg: r.alt_bg, en: r.alt_en },
  sortOrder: r.sort_order,
  inCarousel: r.in_carousel,
  inGallery: r.in_gallery,
  createdAt: r.created_at,
});

const toRate = (r: Row): SeasonalRate => ({
  id: r.id,
  name: r.name,
  startDate: r.start_date,
  endDate: r.end_date,
  nightly: r.nightly_cents,
  minNights: r.min_nights,
});

const toBlocked = (r: Row): BlockedRange => ({
  id: r.id,
  startDate: r.start_date,
  endDate: r.end_date,
  reason: r.reason,
  source: r.source,
  feedId: r.feed_id,
  externalUid: r.external_uid,
});

const fromBlocked = (b: Omit<BlockedRange, "id">): Row => ({
  start_date: b.startDate,
  end_date: b.endDate,
  reason: b.reason,
  source: b.source,
  feed_id: b.feedId,
  external_uid: b.externalUid,
});

const toFeed = (r: Row): CalendarFeed => ({
  id: r.id,
  name: r.name,
  url: r.url,
  isActive: r.is_active,
  lastSyncedAt: r.last_synced_at,
  lastError: r.last_error,
  lastEventCount: r.last_event_count,
});

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async getSettings(): Promise<SiteSettings> {
    const rows = check(await this.db.from("site_settings").select("key, value")) as Row[];
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    // Merge over defaults so newly added fields always have a value.
    return {
      property: { ...DEFAULT_SETTINGS.property, ...byKey.property },
      homepage: { ...DEFAULT_SETTINGS.homepage, ...byKey.homepage },
      pricing: { ...DEFAULT_SETTINGS.pricing, ...byKey.pricing },
    };
  }

  async saveSettings<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    check(await this.db.from("site_settings").upsert({ key, value }));
  }

  async listSeasonalRates() {
    const rows = check(await this.db.from("seasonal_rates").select("*").order("start_date")) as Row[];
    return rows.map(toRate);
  }

  async saveSeasonalRate(rate: Omit<SeasonalRate, "id"> & { id?: string }) {
    const row = {
      id: rate.id ?? randomUUID(),
      name: rate.name,
      start_date: rate.startDate,
      end_date: rate.endDate,
      nightly_cents: rate.nightly,
      min_nights: rate.minNights,
    };
    return toRate(check(await this.db.from("seasonal_rates").upsert(row).select().single()));
  }

  async deleteSeasonalRate(id: string) {
    check(await this.db.from("seasonal_rates").delete().eq("id", id));
  }

  async listMedia() {
    const rows = check(await this.db.from("media").select("*").order("sort_order").order("created_at")) as Row[];
    return rows.map(toMedia);
  }

  async createMedia(item: Omit<MediaItem, "id" | "createdAt" | "sortOrder">) {
    const last = check(
      await this.db.from("media").select("sort_order").order("sort_order", { ascending: false }).limit(1),
    ) as Row[];
    const row = {
      url: item.url,
      storage_path: item.storagePath,
      alt_bg: item.alt.bg,
      alt_en: item.alt.en,
      in_carousel: item.inCarousel,
      in_gallery: item.inGallery,
      sort_order: (last[0]?.sort_order ?? -1) + 1,
    };
    return toMedia(check(await this.db.from("media").insert(row).select().single()));
  }

  async updateMedia(id: string, patch: Partial<Pick<MediaItem, "alt" | "inCarousel" | "inGallery">>) {
    const row: Row = {};
    if (patch.alt) {
      row.alt_bg = patch.alt.bg;
      row.alt_en = patch.alt.en;
    }
    if (patch.inCarousel !== undefined) row.in_carousel = patch.inCarousel;
    if (patch.inGallery !== undefined) row.in_gallery = patch.inGallery;
    check(await this.db.from("media").update(row).eq("id", id));
  }

  async reorderMedia(orderedIds: string[]) {
    check(await this.db.rpc("reorder_media", { ids: orderedIds }));
  }

  async deleteMedia(id: string) {
    const rows = check(await this.db.from("media").delete().eq("id", id).select()) as Row[];
    return rows[0] ? toMedia(rows[0]) : null;
  }

  async uploadMediaFile(input: UploadInput) {
    const ext = (input.fileName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const storagePath = `photos/${randomUUID()}.${ext}`;
    check(
      await this.db.storage.from(MEDIA_BUCKET).upload(storagePath, input.bytes, {
        contentType: input.contentType,
        cacheControl: "31536000",
        upsert: false,
      }),
    );
    const { data } = this.db.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
    return { url: data.publicUrl, storagePath };
  }

  async createUploadTarget(extension: string) {
    const storagePath = `photos/${randomUUID()}.${extension}`;
    const data = check(await this.db.storage.from(MEDIA_BUCKET).createSignedUploadUrl(storagePath));
    return { signedUrl: data.signedUrl, storagePath };
  }

  async readUploadedFile(storagePath: string) {
    const { data, error } = await this.db.storage.from(MEDIA_BUCKET).download(storagePath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  publicMediaUrl(storagePath: string) {
    return this.db.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }

  async deleteMediaFile(storagePath: string) {
    check(await this.db.storage.from(MEDIA_BUCKET).remove([storagePath]));
  }

  async listBookings(filter: BookingFilter = {}) {
    let q = this.db.from("bookings").select("*").order("created_at", { ascending: false });
    if (filter.status?.length) q = q.in("status", filter.status);
    if (filter.to) q = q.lt("check_in", filter.to);
    if (filter.from) q = q.gt("check_out", filter.from);
    if (filter.search) {
      // Keep only characters that are meaningful in names, emails, phones and references, so the
      // term can never alter the PostgREST filter syntax or act as a LIKE wildcard.
      const term = filter.search.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim();
      if (term) q = q.or(["reference", "guest_name", "guest_email", "guest_phone"].map((c) => `${c}.ilike.*${term}*`).join(","));
    }
    if (filter.limit) q = q.limit(filter.limit);
    return (check(await q) as Row[]).map(toBooking);
  }

  private async bookingBy(column: string, value: string) {
    const { data: row, error } = await this.db.from("bookings").select("*").eq(column, value).maybeSingle();
    if (error) throw new Error(error.message);
    return row ? toBooking(row) : null;
  }

  getBooking(id: string) {
    return this.bookingBy("id", id);
  }

  getBookingByReference(reference: string) {
    return this.bookingBy("reference", reference);
  }

  getBookingByStripeSession(sessionId: string) {
    return this.bookingBy("stripe_session_id", sessionId);
  }

  async createBooking(booking: NewBooking) {
    const result = await this.db.from("bookings").insert(fromBooking(booking)).select().single();
    if (result.error?.code === "23P01") throw new BookingConflictError(); // exclusion_violation
    return toBooking(check(result));
  }

  async updateBooking(id: string, patch: Partial<NewBooking>) {
    const result = await this.db.from("bookings").update(fromBooking(patch)).eq("id", id).select().single();
    if (result.error?.code === "23P01") throw new BookingConflictError();
    return toBooking(check(result));
  }

  async expireStaleHolds(now: Date = new Date()) {
    const rows = check(
      await this.db
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: now.toISOString(), admin_note: "Payment hold expired" })
        .eq("status", "awaiting_payment")
        .lte("hold_expires_at", now.toISOString())
        .select("id"),
    ) as Row[];
    return rows.length;
  }

  async listBlockedRanges() {
    const rows = check(await this.db.from("blocked_ranges").select("*").order("start_date")) as Row[];
    return rows.map(toBlocked);
  }

  async createBlockedRange(range: Omit<BlockedRange, "id">) {
    return toBlocked(check(await this.db.from("blocked_ranges").insert(fromBlocked(range)).select().single()));
  }

  async deleteBlockedRange(id: string) {
    check(await this.db.from("blocked_ranges").delete().eq("id", id));
  }

  async replaceFeedRanges(feedId: string, ranges: Omit<BlockedRange, "id">[]) {
    // Insert the fresh set first, then drop the old rows, so the calendar never has a gap.
    const inserted = ranges.length
      ? (check(await this.db.from("blocked_ranges").insert(ranges.map(fromBlocked)).select("id")) as Row[])
      : [];
    let del = this.db.from("blocked_ranges").delete().eq("feed_id", feedId);
    if (inserted.length) del = del.not("id", "in", `(${inserted.map((r) => r.id).join(",")})`);
    check(await del);
  }

  async listFeeds() {
    const rows = check(await this.db.from("calendar_feeds").select("*").order("created_at")) as Row[];
    return rows.map(toFeed);
  }

  async saveFeed(feed: Partial<CalendarFeed> & { name: string; url: string }) {
    const row: Row = { name: feed.name, url: feed.url };
    if (feed.isActive !== undefined) row.is_active = feed.isActive;
    if (feed.id) {
      return toFeed(check(await this.db.from("calendar_feeds").update(row).eq("id", feed.id).select().single()));
    }
    return toFeed(check(await this.db.from("calendar_feeds").insert(row).select().single()));
  }

  async updateFeedStatus(id: string, patch: Pick<CalendarFeed, "lastSyncedAt" | "lastError" | "lastEventCount">) {
    check(
      await this.db
        .from("calendar_feeds")
        .update({ last_synced_at: patch.lastSyncedAt, last_error: patch.lastError, last_event_count: patch.lastEventCount })
        .eq("id", id),
    );
  }

  async deleteFeed(id: string) {
    check(await this.db.from("calendar_feeds").delete().eq("id", id));
  }

  async logEmail(email: Omit<OutboxEmail, "id" | "createdAt">) {
    check(
      await this.db.from("email_log").insert({
        recipient: email.to,
        subject: email.subject,
        html: email.html,
        body_text: email.text,
        status: email.status,
        error: email.error,
      }),
    );
  }

  async listEmails(limit = 50) {
    const rows = check(
      await this.db.from("email_log").select("*").order("created_at", { ascending: false }).limit(limit),
    ) as Row[];
    return rows.map(
      (r): OutboxEmail => ({
        id: r.id,
        to: r.recipient,
        subject: r.subject,
        html: r.html,
        text: r.body_text,
        status: r.status,
        error: r.error,
        createdAt: r.created_at,
      }),
    );
  }
}
