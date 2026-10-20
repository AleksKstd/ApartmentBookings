import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { bookingBlocksCalendar } from "@/lib/availability";
import { rangesOverlap } from "@/lib/dates";
import type { BlockedRange, Booking, CalendarFeed, MediaItem, OutboxEmail, SeasonalRate } from "@/lib/types";
import { DEFAULT_SETTINGS, demoMedia } from "./defaults";
import {
  BookingConflictError,
  type BookingFilter,
  type NewBooking,
  type Repository,
  type SiteSettings,
  type UploadInput,
} from "./repository";

interface DemoDb {
  settings: SiteSettings;
  seasonalRates: SeasonalRate[];
  media: MediaItem[];
  bookings: Booking[];
  blocked: BlockedRange[];
  feeds: CalendarFeed[];
  emails: OutboxEmail[];
}

export function demoDataDir(): string {
  return path.resolve(process.env.DEMO_DATA_DIR || ".demo-data");
}

function seed(): DemoDb {
  const now = new Date().toISOString();
  const year = new Date().getUTCFullYear();
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    seasonalRates: [
      { id: randomUUID(), name: "Лято / Summer", startDate: `${year}-06-15`, endDate: `${year}-09-15`, nightly: 12_000, minNights: 3 },
      { id: randomUUID(), name: "Лято / Summer", startDate: `${year + 1}-06-15`, endDate: `${year + 1}-09-15`, nightly: 12_000, minNights: 3 },
    ],
    media: demoMedia(now),
    bookings: [],
    blocked: [],
    feeds: [],
    emails: [],
  };
}

/**
 * File-backed store for local demonstration. Every operation re-reads the JSON file so separate
 * server bundles (route handlers, server actions) always see the same data; a promise chain
 * serialises writes within the process. Not intended for production traffic.
 */
export class DemoRepository implements Repository {
  readonly mode = "demo" as const;
  private queue: Promise<unknown> = Promise.resolve();

  private get file() {
    return path.join(demoDataDir(), "db.json");
  }

  private async load(): Promise<DemoDb> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as DemoDb;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const db = seed();
      await this.save(db);
      return db;
    }
  }

  private async save(db: DemoDb) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, this.file);
  }

  private read<T>(fn: (db: DemoDb) => T): Promise<T> {
    return this.load().then((db) => structuredClone(fn(db)));
  }

  private write<T>(fn: (db: DemoDb) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.load();
      const result = fn(db);
      await this.save(db);
      return structuredClone(result);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  getSettings() {
    return this.read((db) => db.settings);
  }

  async saveSettings<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    await this.write((db) => {
      db.settings[key] = value;
    });
  }

  listSeasonalRates() {
    return this.read((db) => [...db.seasonalRates].sort((a, b) => a.startDate.localeCompare(b.startDate)));
  }

  saveSeasonalRate(rate: Omit<SeasonalRate, "id"> & { id?: string }) {
    return this.write((db) => {
      const saved = { ...rate, id: rate.id ?? randomUUID() } as SeasonalRate;
      const i = db.seasonalRates.findIndex((r) => r.id === saved.id);
      if (i >= 0) db.seasonalRates[i] = saved;
      else db.seasonalRates.push(saved);
      return saved;
    });
  }

  async deleteSeasonalRate(id: string) {
    await this.write((db) => {
      db.seasonalRates = db.seasonalRates.filter((r) => r.id !== id);
    });
  }

  listMedia() {
    return this.read((db) => [...db.media].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  createMedia(item: Omit<MediaItem, "id" | "createdAt" | "sortOrder">) {
    return this.write((db) => {
      const media: MediaItem = {
        ...item,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        sortOrder: db.media.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1,
      };
      db.media.push(media);
      return media;
    });
  }

  async updateMedia(id: string, patch: Partial<Pick<MediaItem, "alt" | "inCarousel" | "inGallery">>) {
    await this.write((db) => {
      const m = db.media.find((x) => x.id === id);
      if (m) Object.assign(m, patch);
    });
  }

  async reorderMedia(orderedIds: string[]) {
    await this.write((db) => {
      orderedIds.forEach((id, index) => {
        const m = db.media.find((x) => x.id === id);
        if (m) m.sortOrder = index;
      });
    });
  }

  deleteMedia(id: string) {
    return this.write((db) => {
      const m = db.media.find((x) => x.id === id) ?? null;
      db.media = db.media.filter((x) => x.id !== id);
      return m;
    });
  }

  async uploadMediaFile(input: UploadInput) {
    const dir = path.join(demoDataDir(), "uploads");
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(input.fileName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, name), input.bytes);
    return { url: `/api/media/${name}`, storagePath: name };
  }

  async deleteMediaFile(storagePath: string) {
    const name = path.basename(storagePath);
    await fs.rm(path.join(demoDataDir(), "uploads", name), { force: true });
  }

  listBookings(filter: BookingFilter = {}) {
    return this.read((db) => {
      let list = db.bookings;
      if (filter.status?.length) list = list.filter((b) => filter.status!.includes(b.status));
      if (filter.from || filter.to) {
        list = list.filter((b) => rangesOverlap(b.checkIn, b.checkOut, filter.from ?? "0000-01-01", filter.to ?? "9999-12-31"));
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter((b) =>
          [b.reference, b.guestName, b.guestEmail, b.guestPhone].some((v) => v.toLowerCase().includes(q)),
        );
      }
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return filter.limit ? list.slice(0, filter.limit) : list;
    });
  }

  getBooking(id: string) {
    return this.read((db) => db.bookings.find((b) => b.id === id) ?? null);
  }

  getBookingByReference(reference: string) {
    return this.read((db) => db.bookings.find((b) => b.reference === reference) ?? null);
  }

  getBookingByStripeSession(sessionId: string) {
    return this.read((db) => db.bookings.find((b) => b.stripeSessionId === sessionId) ?? null);
  }

  createBooking(booking: NewBooking) {
    return this.write((db) => {
      const now = new Date();
      if (booking.status !== "cancelled") {
        const clash = db.bookings.some(
          (b) => bookingBlocksCalendar(b, now) && rangesOverlap(b.checkIn, b.checkOut, booking.checkIn, booking.checkOut),
        );
        if (clash) throw new BookingConflictError();
      }
      const created: Booking = { ...booking, id: randomUUID(), createdAt: now.toISOString(), updatedAt: now.toISOString() };
      db.bookings.push(created);
      return created;
    });
  }

  updateBooking(id: string, patch: Partial<NewBooking>) {
    return this.write((db) => {
      const b = db.bookings.find((x) => x.id === id);
      if (!b) throw new Error("booking_not_found");
      const next = { ...b, ...patch, updatedAt: new Date().toISOString() };
      if (next.status !== "cancelled" && (patch.checkIn || patch.checkOut || patch.status)) {
        const now = new Date();
        const clash = db.bookings.some(
          (o) => o.id !== id && bookingBlocksCalendar(o, now) && rangesOverlap(o.checkIn, o.checkOut, next.checkIn, next.checkOut),
        );
        if (clash) throw new BookingConflictError();
      }
      Object.assign(b, next);
      return b;
    });
  }

  expireStaleHolds(now: Date = new Date()) {
    return this.write((db) => {
      let count = 0;
      for (const b of db.bookings) {
        if (b.status === "awaiting_payment" && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) {
          b.status = "cancelled";
          b.cancelledAt = now.toISOString();
          b.updatedAt = now.toISOString();
          b.adminNote = [b.adminNote, "Payment hold expired"].filter(Boolean).join("\n");
          count++;
        }
      }
      return count;
    });
  }

  listBlockedRanges() {
    return this.read((db) => [...db.blocked].sort((a, b) => a.startDate.localeCompare(b.startDate)));
  }

  createBlockedRange(range: Omit<BlockedRange, "id">) {
    return this.write((db) => {
      const created = { ...range, id: randomUUID() };
      db.blocked.push(created);
      return created;
    });
  }

  async deleteBlockedRange(id: string) {
    await this.write((db) => {
      db.blocked = db.blocked.filter((b) => b.id !== id);
    });
  }

  async replaceFeedRanges(feedId: string, ranges: Omit<BlockedRange, "id">[]) {
    await this.write((db) => {
      db.blocked = [...db.blocked.filter((b) => b.feedId !== feedId), ...ranges.map((r) => ({ ...r, id: randomUUID() }))];
    });
  }

  listFeeds() {
    return this.read((db) => db.feeds);
  }

  saveFeed(feed: Partial<CalendarFeed> & { name: string; url: string }) {
    return this.write((db) => {
      const existing = feed.id ? db.feeds.find((f) => f.id === feed.id) : undefined;
      if (existing) {
        Object.assign(existing, { name: feed.name, url: feed.url, isActive: feed.isActive ?? existing.isActive });
        return existing;
      }
      const created: CalendarFeed = {
        id: randomUUID(),
        name: feed.name,
        url: feed.url,
        isActive: feed.isActive ?? true,
        lastSyncedAt: null,
        lastError: null,
        lastEventCount: null,
      };
      db.feeds.push(created);
      return created;
    });
  }

  async updateFeedStatus(id: string, patch: Pick<CalendarFeed, "lastSyncedAt" | "lastError" | "lastEventCount">) {
    await this.write((db) => {
      const f = db.feeds.find((x) => x.id === id);
      if (f) Object.assign(f, patch);
    });
  }

  async deleteFeed(id: string) {
    await this.write((db) => {
      db.feeds = db.feeds.filter((f) => f.id !== id);
      db.blocked = db.blocked.filter((b) => b.feedId !== id);
    });
  }

  async logEmail(email: Omit<OutboxEmail, "id" | "createdAt">) {
    await this.write((db) => {
      db.emails.unshift({ ...email, id: randomUUID(), createdAt: new Date().toISOString() });
      db.emails = db.emails.slice(0, 200);
    });
  }

  listEmails(limit = 50) {
    return this.read((db) => db.emails.slice(0, limit));
  }
}
