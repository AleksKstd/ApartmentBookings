import type { SiteSettings } from "./repository";
import type { MediaItem } from "@/lib/types";

// Starting content used by demo mode and by the starter-content migration. Everything here is editable in
// the admin area.
export const DEFAULT_SETTINGS: SiteSettings = {
  property: {
    name: "Morski Briz Apartment",
    tagline: {
      bg: "Светъл апартамент с гледка към морето в Бургас",
      en: "A bright sea-view apartment in Burgas",
    },
    description: {
      bg: "Просторен двустаен апартамент на пет минути пеша от плажа и Морската градина. Отворена дневна с кухня, спалня с двойно легло, разтегателен диван и широк балкон с гледка към залива. Идеален за двойки, семейства и дистанционна работа.",
      en: "A spacious one-bedroom apartment a five-minute walk from the beach and the Sea Garden. Open-plan living room and kitchen, a bedroom with a double bed, a sofa bed and a wide balcony overlooking the bay. Ideal for couples, families and remote work.",
    },
    address: "ул. „Примерна“ 12, 8000 Бургас, България",
    city: { bg: "Бургас", en: "Burgas" },
    mapUrl: "https://www.openstreetmap.org/?mlat=42.4958&mlon=27.4746#map=16/42.4958/27.4746",
    latitude: 42.4958,
    longitude: 27.4746,
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
    // [Bracketed] values are placeholders for the host to replace in admin → Content.
    hostName: "[Име на домакина]",
    hostPhotoUrl: "",
    hostBio: {
      bg: "[Няколко думи за вас — напр. „Живея в Бургас и с удоволствие ще ви подскажа къде да хапнете и къде да плувате.“]",
      en: "[A few words about you — e.g. “I live in Burgas and I'm happy to tell you where to eat and where to swim.”]",
    },
    replyTime: {
      bg: "[Обикновено отговаря до няколко часа]",
      en: "[Usually replies within a few hours]",
    },
    cancellationPolicy: {
      bg: "[Безплатно анулиране до 14 дни преди пристигане. При по-късно анулиране — …]",
      en: "[Free cancellation up to 14 days before arrival. Later cancellations — …]",
    },
  },
  homepage: {
    heroTitle: { bg: "Тих апартамент край Бургаския залив", en: "A quiet apartment on Burgas Bay" },
    heroSubtitle: {
      bg: "Резервирайте директно при домакина — най-добрата цена, без комисионни.",
      en: "Book directly with the host — best price, no booking fees.",
    },
    introTitle: { bg: "Светлина, морски въздух и балкон над залива", en: "Light, sea air and a balcony over the bay" },
    introText: {
      bg: "Морски бриз е уютен апартамент в центъра на Бургас, обзаведен с внимание към детайла. Събуждайте се с изгледа към залива, разходете се през Морската градина до плажа и се върнете в спокойна, светла обстановка.",
      en: "Morski Briz is a cosy apartment in the centre of Burgas, furnished with attention to detail. Wake up to views of the bay, walk through the Sea Garden to the beach and come back to a calm, bright space.",
    },
    nearby: [
      { place: { bg: "Морската градина", en: "The Sea Garden" }, distance: { bg: "[5 мин пеша]", en: "[5 min walk]" } },
      { place: { bg: "Централен плаж", en: "Central Beach" }, distance: { bg: "[8 мин пеша]", en: "[8 min walk]" } },
      { place: { bg: "бул. „Богориди“", en: "Bogoridi Boulevard" }, distance: { bg: "[4 мин пеша]", en: "[4 min walk]" } },
      { place: { bg: "Гара Бургас", en: "Burgas railway station" }, distance: { bg: "[12 мин пеша]", en: "[12 min walk]" } },
    ],
    locationTitle: { bg: "В центъра на Бургас", en: "In the centre of Burgas" },
    locationText: {
      bg: "На тиха улица в центъра — ресторанти, магазини и катедралата „Св. св. Кирил и Методий“ са на пешеходно разстояние.",
      en: "On a quiet street in the centre — restaurants, shops and the Cathedral of Saints Cyril and Methodius are all within walking distance.",
    },
    ctaTitle: { bg: "Изберете вашите дати", en: "Choose your dates" },
    ctaText: {
      bg: "Вижте свободните нощи и пълната цена, после изпратете запитване на домакина.",
      en: "See which nights are free and the full price, then send the host your request.",
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
  ["beach", "Плажът, на пет минути пеша", "The beach, a five-minute walk away"],
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
