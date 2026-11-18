"use server";

import { getRepository } from "@/lib/data";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { type ActionResult, fail, guarded, ok } from "./shared";

/** Webhook events the app relies on (see src/app/api/stripe/webhook/route.ts). */
const REQUIRED_STRIPE_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
];

export async function testSupabase(): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    if (!repo.healthCheck) return fail("Supabase не е конфигуриран — сайтът работи в демо режим.");
    const problems = await repo.healthCheck();
    return problems.length ? fail(problems.join(" ")) : ok("Връзката с Supabase работи: таблици, миграции и хранилище за снимки са наред.");
  });
}

export async function testStripe(): Promise<ActionResult> {
  return guarded(async () => {
    if (!isStripeConfigured()) return fail("STRIPE_SECRET_KEY не е зададен.");
    const stripe = getStripe();
    try {
      await stripe.balance.retrieve();
    } catch {
      return fail("Stripe отхвърли ключа — проверете STRIPE_SECRET_KEY.");
    }
    const target = `${siteUrl()}/api/stripe/webhook`;
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find((e) => e.url === target && e.status === "enabled");
    if (!endpoint) return fail(`Ключът работи, но няма активен webhook към ${target}. Добавете го в Stripe → Developers → Webhooks.`);
    const missing = endpoint.enabled_events.includes("*") ? [] : REQUIRED_STRIPE_EVENTS.filter((e) => !endpoint.enabled_events.includes(e as never));
    if (missing.length) return fail(`Webhook-ът съществува, но липсват събития: ${missing.join(", ")}.`);
    if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) return fail("Webhook-ът е наред, но STRIPE_WEBHOOK_SECRET липсва.");
    return ok("Stripe е готов: ключът работи и webhook-ът получава всички нужни събития.");
  });
}

export async function testEmail(): Promise<ActionResult> {
  return guarded(async () => {
    const { property } = await getRepository().getSettings();
    const to = process.env.ADMIN_NOTIFICATION_EMAIL || property.contactEmail;
    if (!to) return fail("Няма адрес за получаване — задайте имейл за контакт в „Съдържание“.");
    const sent = await sendEmail({
      to,
      subject: `Тестов имейл от ${property.name}`,
      text: "Ако четете това, изпращането на имейли работи.",
      html: "<p>Ако четете това, изпращането на имейли работи.</p>",
    });
    return sent ? ok(`Тестов имейл е изпратен до ${to}.`) : fail("Имейлът не беше изпратен — вижте „Имейли“ за подробности.");
  });
}
