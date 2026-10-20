import type {
  BlockedRange,
  Booking,
  BookingStatus,
  CalendarFeed,
  HomepageContent,
  MediaItem,
  OutboxEmail,
  PricingSettings,
  PropertyInfo,
  SeasonalRate,
} from "@/lib/types";

export interface SiteSettings {
  property: PropertyInfo;
  homepage: HomepageContent;
  pricing: PricingSettings;
}

export type NewBooking = Omit<Booking, "id" | "createdAt" | "updatedAt">;

export interface BookingFilter {
  status?: BookingStatus[];
  /** bookings whose stay overlaps [from, to) */
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export interface UploadInput {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

/** Thrown when an insert would overlap an active booking (double booking). */
export class BookingConflictError extends Error {
  constructor() {
    super("booking_conflict");
  }
}

export interface Repository {
  readonly mode: "demo" | "supabase";

  getSettings(): Promise<SiteSettings>;
  saveSettings<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]): Promise<void>;

  listSeasonalRates(): Promise<SeasonalRate[]>;
  saveSeasonalRate(rate: Omit<SeasonalRate, "id"> & { id?: string }): Promise<SeasonalRate>;
  deleteSeasonalRate(id: string): Promise<void>;

  listMedia(): Promise<MediaItem[]>;
  createMedia(item: Omit<MediaItem, "id" | "createdAt" | "sortOrder">): Promise<MediaItem>;
  updateMedia(id: string, patch: Partial<Pick<MediaItem, "alt" | "inCarousel" | "inGallery">>): Promise<void>;
  reorderMedia(orderedIds: string[]): Promise<void>;
  deleteMedia(id: string): Promise<MediaItem | null>;
  uploadMediaFile(input: UploadInput): Promise<{ url: string; storagePath: string }>;
  deleteMediaFile(storagePath: string): Promise<void>;
  /** Direct browser uploads (Supabase only): a signed URL the browser PUTs the file to. */
  createUploadTarget?(extension: string): Promise<{ signedUrl: string; storagePath: string }>;
  readUploadedFile?(storagePath: string): Promise<Uint8Array | null>;
  publicMediaUrl?(storagePath: string): string;

  listBookings(filter?: BookingFilter): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByReference(reference: string): Promise<Booking | null>;
  getBookingByStripeSession(sessionId: string): Promise<Booking | null>;
  /** Inserts atomically; throws BookingConflictError on overlap with an active booking. */
  createBooking(booking: NewBooking): Promise<Booking>;
  updateBooking(id: string, patch: Partial<NewBooking>): Promise<Booking>;
  /** Cancels unpaid bookings whose hold has expired so their dates are released. */
  expireStaleHolds(now?: Date): Promise<number>;

  listBlockedRanges(): Promise<BlockedRange[]>;
  createBlockedRange(range: Omit<BlockedRange, "id">): Promise<BlockedRange>;
  deleteBlockedRange(id: string): Promise<void>;
  /** Replaces every range imported from a feed with a fresh set. */
  replaceFeedRanges(feedId: string, ranges: Omit<BlockedRange, "id">[]): Promise<void>;

  listFeeds(): Promise<CalendarFeed[]>;
  saveFeed(feed: Partial<CalendarFeed> & { name: string; url: string }): Promise<CalendarFeed>;
  updateFeedStatus(id: string, patch: Pick<CalendarFeed, "lastSyncedAt" | "lastError" | "lastEventCount">): Promise<void>;
  deleteFeed(id: string): Promise<void>;

  logEmail(email: Omit<OutboxEmail, "id" | "createdAt">): Promise<void>;
  listEmails(limit?: number): Promise<OutboxEmail[]>;
}
