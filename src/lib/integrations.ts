import "server-only";
import { isEmailConfigured } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/data";
import { isStripeConfigured } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";

/**
 * Readiness report for every external service, shown in Admin → Интеграции. Only checks what can be
 * read from the environment (no network calls); the page offers explicit "test connection" buttons.
 * Never returns secret values — only whether they are set and well-formed.
 */

export type CheckState = "ok" | "warn" | "missing" | "optional";

export interface Check {
  label: string;
  state: CheckState;
  detail: string;
}

export interface Integration {
  id: "site" | "supabase" | "admin" | "stripe" | "email" | "calendar" | "vercel";
  title: string;
  summary: string;
  checks: Check[];
}

const env = (name: string) => process.env[name]?.trim() || "";

function check(label: string, state: CheckState, detail: string): Check {
  return { label, state, detail };
}

export function overallState(checks: Check[]): CheckState {
  if (checks.some((c) => c.state === "missing")) return "missing";
  if (checks.some((c) => c.state === "warn")) return "warn";
  if (checks.every((c) => c.state === "optional")) return "optional";
  return "ok";
}

export function integrationReport(): Integration[] {
  const url = siteUrl();
  const https = url.startsWith("https://");
  const configuredUrl = env("NEXT_PUBLIC_SITE_URL");

  const stripeKey = env("STRIPE_SECRET_KEY");
  const stripeMode = stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_") ? "live" : stripeKey ? "test" : null;
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");

  const from = env("EMAIL_FROM");
  const fromDomain = /@([^>\s]+)>?\s*$/.exec(from)?.[1] ?? "";

  const passwordHash = env("ADMIN_PASSWORD_HASH");
  const sessionSecret = env("ADMIN_SESSION_SECRET");
  const exportToken = env("ICAL_EXPORT_TOKEN");
  const cronSecret = env("CRON_SECRET");

  return [
    {
      id: "site",
      title: "Адрес на сайта",
      summary: "Използва се в имейлите, в адресите за връщане от Stripe, в sitemap и в iCal износа.",
      checks: [
        configuredUrl
          ? check("NEXT_PUBLIC_SITE_URL", https ? "ok" : "warn", https ? url : `${url} — в продукция трябва да е https://`)
          : check("NEXT_PUBLIC_SITE_URL", "missing", `Не е зададен — използва се ${url}`),
      ],
    },
    {
      id: "supabase",
      title: "Supabase (база данни и снимки)",
      summary: "Задължително за продукция. Без него сайтът работи в демо режим с локални данни.",
      checks: [
        check("NEXT_PUBLIC_SUPABASE_URL", env("NEXT_PUBLIC_SUPABASE_URL") ? "ok" : "missing", env("NEXT_PUBLIC_SUPABASE_URL") || "Не е зададен"),
        check(
          "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY",
          isSupabaseConfigured() ? "ok" : "missing",
          isSupabaseConfigured() ? "Зададен (таен, само на сървъра)" : "Не е зададен",
        ),
      ],
    },
    {
      id: "admin",
      title: "Вход за администратор",
      summary: "Собствено потребителско име и парола вместо демо данните.",
      checks: [
        check("ADMIN_USERNAME", env("ADMIN_USERNAME") ? "ok" : "missing", env("ADMIN_USERNAME") || "Не е зададен (демо: admin)"),
        check(
          "ADMIN_PASSWORD_HASH",
          passwordHash.startsWith("scrypt:") ? "ok" : passwordHash ? "warn" : "missing",
          passwordHash.startsWith("scrypt:") ? "Зададен" : passwordHash ? "Неочакван формат — генерирайте с npm run hash-password" : "Не е зададен",
        ),
        check(
          "ADMIN_SESSION_SECRET",
          sessionSecret.length >= 32 ? "ok" : "missing",
          sessionSecret.length >= 32 ? "Зададен" : "Нужни са поне 32 произволни символа (npm run generate-secrets)",
        ),
      ],
    },
    {
      id: "stripe",
      title: "Stripe (онлайн плащания)",
      summary: "По избор. Без Stripe резервациите са запитвания, които потвърждавате ръчно.",
      checks: [
        stripeKey
          ? check("STRIPE_SECRET_KEY", stripeMode === "live" ? "ok" : "warn", stripeMode === "live" ? "Реален режим" : "Тестов режим — сменете с live ключ преди старта")
          : check("STRIPE_SECRET_KEY", "optional", "Не е зададен — плащанията са изключени"),
        stripeKey
          ? check(
              "STRIPE_WEBHOOK_SECRET",
              webhookSecret.startsWith("whsec_") ? "ok" : "missing",
              webhookSecret.startsWith("whsec_") ? `Зададен · адрес: ${url}/api/stripe/webhook` : `Липсва — без него плащанията не се потвърждават. Адрес: ${url}/api/stripe/webhook`,
            )
          : check("STRIPE_WEBHOOK_SECRET", "optional", "Нужен само със Stripe"),
      ],
    },
    {
      id: "email",
      title: "Имейли чрез Resend",
      summary: "По избор. Без него имейлите само се записват в „Имейли“.",
      checks: [
        env("RESEND_API_KEY")
          ? check("RESEND_API_KEY", env("RESEND_API_KEY").startsWith("re_") ? "ok" : "warn", env("RESEND_API_KEY").startsWith("re_") ? "Зададен" : "Неочакван формат (очаква се re_…)")
          : check("RESEND_API_KEY", "optional", "Не е зададен — имейлите не се изпращат"),
        from
          ? check("EMAIL_FROM", fromDomain ? "ok" : "warn", fromDomain ? `${from} — домейнът ${fromDomain} трябва да е потвърден в Resend` : `${from} — очаква се „Име <адрес@домейн>“`)
          : check("EMAIL_FROM", isEmailConfigured() ? "missing" : "optional", "Не е зададен"),
        check(
          "ADMIN_NOTIFICATION_EMAIL",
          "optional",
          env("ADMIN_NOTIFICATION_EMAIL") || "Не е зададен — известията отиват на имейла за контакт от „Съдържание“",
        ),
      ],
    },
    {
      id: "calendar",
      title: "Booking.com, Airbnb и други (iCal)",
      summary: "Двупосочна синхронизация на заетите дати срещу двойни резервации.",
      checks: [
        check(
          "ICAL_EXPORT_TOKEN",
          exportToken.length >= 16 ? "ok" : "missing",
          exportToken.length >= 16 ? "Износът е включен — адресът е в „Синхронизация“" : "Нужни са поне 16 произволни символа, иначе износът е изключен",
        ),
        check(
          "CRON_SECRET",
          cronSecret.length >= 16 ? "ok" : "missing",
          cronSecret.length >= 16 ? "Зададен — автоматичната синхронизация е включена" : "Без него вносът става само ръчно (бутон „Синхронизирай“)",
        ),
      ],
    },
    {
      id: "vercel",
      title: "Хостинг (Vercel)",
      summary: "Регион fra1 (Франкфурт), автоматична синхронизация по график.",
      checks: [
        process.env.VERCEL
          ? check("Среда", "ok", `Vercel · ${process.env.VERCEL_ENV ?? "?"}${process.env.VERCEL_REGION ? ` · ${process.env.VERCEL_REGION}` : ""}`)
          : check("Среда", "optional", "Не се изпълнява във Vercel (локално или друг хостинг)"),
        check(
          "Режим",
          process.env.DEMO_MODE === "true" ? "warn" : "ok",
          process.env.DEMO_MODE === "true" ? "DEMO_MODE=true — данните не се пазят трайно" : isSupabaseConfigured() ? "Продукция" : "Демо (локални данни)",
        ),
      ],
    },
  ];
}

/** Short status line per integration for the dashboard. */
export function readinessSummary() {
  const report = integrationReport();
  return {
    report,
    ready: report.filter((i) => overallState(i.checks) === "ok").length,
    total: report.length,
    paymentsLive: isStripeConfigured() && env("STRIPE_SECRET_KEY").includes("_live_"),
  };
}
