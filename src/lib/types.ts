// Shared domain types. Dates without time are ISO "YYYY-MM-DD" strings (property-local days);
// money is always integer cents.

export type Locale = "bg" | "en";

export type Localized = { bg: string; en: string };

export type BookingStatus = "pending" | "awaiting_payment" | "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export interface PricingSettings {
  currency: string; // ISO 4217, e.g. "EUR"
  baseNightly: number; // cents
  weekendNightly: number | null; // cents, applies to Friday and Saturday nights
  cleaningFee: number; // cents, once per stay
  includedGuests: number;
  extraGuestNightly: number; // cents per extra guest per night
  maxGuests: number;
  minNights: number;
  maxNights: number;
  weeklyDiscountPercent: number; // stays of 7+ nights
  monthlyDiscountPercent: number; // stays of 28+ nights
  bookingWindowDays: number; // how far into the future guests may book
  holdMinutes: number; // how long an unpaid booking blocks the calendar
}

export interface SeasonalRate {
  id: string;
  name: string;
  startDate: string; // inclusive night
  endDate: string; // inclusive night
  nightly: number; // cents
  minNights: number | null;
}

export interface PropertyInfo {
  name: string;
  tagline: Localized;
  description: Localized;
  address: string;
  city: Localized;
  mapUrl: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  areaSqm: number;
  checkInTime: string; // "15:00"
  checkOutTime: string; // "11:00"
  amenities: string[]; // amenity keys, see AMENITIES
  houseRules: Localized;
  contactEmail: string;
  contactPhone: string;
  // Host and booking terms, shown where guests decide. A value wrapped in [square brackets] is a
  // placeholder: admin shows it, the public site hides it (except in demo mode). See lib/placeholder.ts.
  hostName: string;
  hostPhotoUrl: string; // a media URL, or "" for none
  hostBio: Localized;
  replyTime: Localized; // e.g. "Usually replies within a few hours"
  cancellationPolicy: Localized;
}

export interface HomepageContent {
  heroTitle: Localized;
  heroSubtitle: Localized;
  introTitle: Localized;
  introText: Localized;
  /** The street sign by the headline: the street the house stands on or next to. Empty name hides it. */
  streetSign: { name: string; latin: string; note: Localized };
  /** "From the door": nearby places and how far they are. */
  nearby: { place: Localized; distance: Localized }[];
  locationTitle: Localized;
  locationText: Localized;
  ctaTitle: Localized;
  ctaText: Localized;
}

export interface MediaItem {
  id: string;
  url: string;
  storagePath: string | null;
  alt: Localized;
  sortOrder: number;
  inCarousel: boolean;
  inGallery: boolean;
  createdAt: string;
}

export interface PriceLine {
  kind: "nights" | "extra_guests" | "cleaning" | "discount";
  label: string; // machine label, translated in UI
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface PriceQuote {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: string;
  nightly: { date: string; amount: number; source: "base" | "weekend" | "season" }[];
  lines: PriceLine[];
  subtotal: number;
  total: number;
}

export interface Booking {
  id: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNote: string | null;
  locale: Locale;
  nights: number;
  totalAmount: number;
  currency: string;
  priceBreakdown: PriceQuote;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  holdExpiresAt: string | null;
  adminNote: string | null;
  accessToken: string; // random secret that lets the guest view their booking page
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export interface BlockedRange {
  id: string;
  startDate: string; // first blocked night
  endDate: string; // exclusive (like check-out)
  reason: string | null;
  source: "manual" | "ical";
  feedId: string | null;
  externalUid: string | null;
}

export interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastEventCount: number | null;
}

export interface OutboxEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  status: "sent" | "logged" | "failed";
  error: string | null;
  createdAt: string;
}
