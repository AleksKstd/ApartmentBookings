import "server-only";
import { fmt, getDictionary } from "@/i18n";
import { getRepository } from "@/lib/data";
import { formatMoney } from "@/lib/pricing";
import { siteUrl } from "@/lib/site-url";
import type { Booking, Locale, PropertyInfo } from "@/lib/types";

interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends through the Resend HTTP API when configured; otherwise the message is only recorded in
 * the email log (visible in the admin area). Never throws: a failed email must not fail a booking.
 */
export async function sendEmail(message: Message): Promise<boolean> {
  const repo = getRepository();
  if (!isEmailConfigured()) {
    console.info(`[email:logged] to=${message.to} subject=${message.subject}`);
    await repo.logEmail({ ...message, status: "logged", error: null }).catch(() => undefined);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await repo.logEmail({ ...message, status: "sent", error: null }).catch(() => undefined);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[email:failed]", msg);
    await repo.logEmail({ ...message, status: "failed", error: msg }).catch(() => undefined);
    return false;
  }
}

function bookingUrl(booking: Booking): string {
  return `${siteUrl()}/${booking.locale}/booking/confirmation/${booking.reference}?t=${booking.accessToken}`;
}

function detailRows(booking: Booking, locale: Locale) {
  const t = getDictionary(locale);
  return [
    [t.confirmation.reference, booking.reference],
    [t.common.checkIn, booking.checkIn],
    [t.common.checkOut, booking.checkOut],
    [t.common.guests, String(booking.guests)],
    [t.booking.total, formatMoney(booking.totalAmount, booking.currency, locale)],
    [t.confirmation.status, t.confirmation.statuses[booking.status]],
  ];
}

function layout(property: PropertyInfo, title: string, paragraphs: string[], rows: string[][], link?: { href: string; label: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1f2a2e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1d4e5f;color:#fff;padding:20px 28px;font-size:20px;font-weight:bold">${escapeHtml(property.name)}</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(p)}</p>`).join("")}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#5b6b70;border-bottom:1px solid #eee">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right;border-bottom:1px solid #eee"><strong>${escapeHtml(v)}</strong></td></tr>`).join("")}
</table>
${link ? `<p style="margin:24px 0"><a href="${escapeHtml(link.href)}" style="background:#c9714b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(link.label)}</a></p>` : ""}
<p style="margin:24px 0 0;color:#5b6b70;font-size:13px">${escapeHtml(property.contactEmail)} · ${escapeHtml(property.contactPhone)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(link ? ["", `${link.label}: ${link.href}`] : [])].join("\n");
  return { html, text };
}

export type GuestEmailKind = "received" | "confirmed" | "cancelled";

export function renderGuestEmail(kind: GuestEmailKind, booking: Booking, property: PropertyInfo) {
  const locale = booking.locale;
  const t = getDictionary(locale);
  const subject = fmt(t.email[`${kind}Subject`], { ref: booking.reference });
  const body = t.email[`${kind}Body`];
  const { html, text } = layout(
    property,
    subject,
    [fmt(t.email.greeting, { name: booking.guestName }), body],
    detailRows(booking, locale),
    { href: bookingUrl(booking), label: t.email.viewBooking },
  );
  return { subject, html, text };
}

export async function sendGuestEmail(kind: GuestEmailKind, booking: Booking) {
  const { property } = await getRepository().getSettings();
  const { subject, html, text } = renderGuestEmail(kind, booking, property);
  return sendEmail({ to: booking.guestEmail, subject, html, text, replyTo: property.contactEmail });
}

/** Notifies the owner (in Bulgarian) about a new booking or payment. */
export async function sendAdminNotification(booking: Booking, event: "new_request" | "paid") {
  const { property } = await getRepository().getSettings();
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || property.contactEmail;
  if (!to) return false;
  const title = event === "paid" ? `Платена резервация ${booking.reference}` : `Ново запитване ${booking.reference}`;
  const rows = [
    ...detailRows(booking, "bg"),
    ["Гост", booking.guestName],
    ["Имейл", booking.guestEmail],
    ["Телефон", booking.guestPhone],
    ...(booking.guestNote ? [["Съобщение", booking.guestNote]] : []),
  ];
  const { html, text } = layout(property, title, [], rows, {
    href: `${siteUrl()}/admin/bookings/${booking.id}`,
    label: "Отвори в админ панела",
  });
  return sendEmail({ to, subject: title, html, text, replyTo: booking.guestEmail });
}
