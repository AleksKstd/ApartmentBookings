import type { SiteSettings } from "./repository";
import type { MediaItem } from "@/lib/types";

// Starting content used by demo mode and by the starter-content migration. Everything here is editable in
// the admin area.
export const DEFAULT_SETTINGS: SiteSettings = {
  property: {
    name: "Morski Briz Apartment",
    tagline: {
      bg: "Светъл апартамент с гледка към морето във Варна",
      en: "A bright sea-view apartment in Varna",
    },
    description: {
      bg: "Просторен двустаен апартамент на пет минути пеша от плажа и Морската градина. Отворена дневна с кухня, спалня с двойно легло, разтегателен диван и широк балкон с гледка към залива. Идеален за двойки, семейства и дистанционна работа.",
      en: "A spacious one-bedroom apartment a five-minute walk from the beach and the Sea Garden. Open-plan living room and kitchen, a bedroom with a double bed, a sofa bed and a wide balcony overlooking the bay. Ideal for couples, families and remote work.",
    },
    address: "ул. „Примерна“ 12, 9000 Варна, България",
    city: { bg: "Варна", en: "Varna" },
    mapUrl: "https://www.openstreetmap.org/?mlat=43.2049&mlon=27.9187#map=16/43.2049/27.9187",
    latitude: 43.2049,
    longitude: 27.9187,
    bedrooms: 1,
    bathrooms: 1,
    beds: 2,
    areaSqm: 68,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    amenities: [
      "wifi",
      "ac",
      "kitchen",
      "washer",
      "tv",
      "workspace",
      "balcony",
      "seaView",
      "parking",
      "coffee",
      "linens",
      "hairdryer",
      "crib",
      "selfCheckIn",
    ],
    houseRules: {
      bg: "Без пушене в апартамента.\nБез домашни любимци.\nБез партита и събития.\nТишина след 22:00 ч.",
      en: "No smoking inside.\nNo pets.\nNo parties or events.\nQuiet hours after 10 pm.",
    },
    contactEmail: "host@example.com",
    contactPhone: "+359 88 123 4567",
  },
  homepage: {
    heroTitle: { bg: "Вашият дом край морето", en: "Your home by the sea" },
    heroSubtitle: {
      bg: "Резервирайте директно при домакина — най-добрата цена, без комисионни.",
      en: "Book directly with the host — best price, no booking fees.",
    },
    introTitle: { bg: "Добре дошли", en: "Welcome" },
    introText: {
      bg: "Морски бриз е уютен апартамент в сърцето на Варна, обзаведен с внимание към детайла. Събуждайте се с изгледа към залива, разходете се до плажа и се върнете в спокойна, светла обстановка.",
      en: "Morski Briz is a cosy apartment in the heart of Varna, furnished with attention to detail. Wake up to views of the bay, stroll to the beach and come back to a calm, bright space.",
    },
    highlights: [
      {
        title: { bg: "5 минути до плажа", en: "5 minutes to the beach" },
        text: { bg: "Морската градина и плажът са на крачка.", en: "The Sea Garden and the beach are a short walk away." },
      },
      {
        title: { bg: "Самостоятелно настаняване", en: "Self check-in" },
        text: { bg: "Пристигнете когато ви е удобно с код за достъп.", en: "Arrive whenever suits you with a keypad code." },
      },
      {
        title: { bg: "Бърз интернет", en: "Fast Wi‑Fi" },
        text: { bg: "Оптична връзка и работно място за дистанционна работа.", en: "Fibre connection and a desk for remote work." },
      },
    ],
    locationTitle: { bg: "Отлична локация", en: "A great location" },
    locationText: {
      bg: "В тиха улица в центъра — ресторанти, магазини и Катедралата са на пешеходно разстояние.",
      en: "On a quiet street in the centre — restaurants, shops and the Cathedral are all within walking distance.",
    },
    ctaTitle: { bg: "Готови ли сте за морето?", en: "Ready for the seaside?" },
    ctaText: {
      bg: "Проверете свободните дати и резервирайте за минути.",
      en: "Check availability and book in minutes.",
    },
  },
  pricing: {
    currency: "EUR",
    baseNightly: 8_000,
    weekendNightly: 9_500,
    cleaningFee: 3_000,
    includedGuests: 2,
    extraGuestNightly: 1_500,
    maxGuests: 4,
    minNights: 2,
    maxNights: 60,
    weeklyDiscountPercent: 10,
    monthlyDiscountPercent: 25,
    bookingWindowDays: 365,
    holdMinutes: 32,
  },
};

const DEMO_PHOTOS: [string, string, string][] = [
  ["living-room", "Дневна с изглед към морето", "Living room with sea view"],
  ["bedroom", "Спалня с двойно легло", "Bedroom with double bed"],
  ["kitchen", "Напълно оборудвана кухня", "Fully equipped kitchen"],
  ["balcony", "Балкон с гледка към залива", "Balcony overlooking the bay"],
  ["bathroom", "Баня с душ", "Bathroom with walk-in shower"],
  ["beach", "Плажът на 5 минути", "The beach, five minutes away"],
];

export function demoMedia(now: string): MediaItem[] {
  return DEMO_PHOTOS.map(([slug, bg, en], i) => ({
    id: `demo-${slug}`,
    url: `/demo/${slug}.svg`,
    storagePath: null,
    alt: { bg, en },
    sortOrder: i,
    inCarousel: i < 4,
    inGallery: true,
    createdAt: now,
  }));
}

export const AMENITY_KEYS = [
  "wifi",
  "ac",
  "heating",
  "kitchen",
  "dishwasher",
  "washer",
  "tv",
  "workspace",
  "balcony",
  "seaView",
  "parking",
  "elevator",
  "coffee",
  "linens",
  "hairdryer",
  "iron",
  "crib",
  "selfCheckIn",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];
