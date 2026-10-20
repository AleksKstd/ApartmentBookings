import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelBooking, confirmBooking, markBookingPaid, resendGuestEmail, saveAdminNote } from "@/app/admin/actions";
import { ActionButton, AdminForm } from "@/components/admin/form-kit";
import { PageHeader, Panel, PaymentBadge, StatusBadge, money, showDateTime, showDay } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

const LINE_LABELS: Record<string, string> = {
  nights: "Нощувки",
  extra_guests: "Допълнителни гости",
  weekly_discount: "Седмична отстъпка",
  monthly_discount: "Месечна отстъпка",
  cleaning: "Почистване",
};

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  const booking = await getRepository().getBooking(id);
  if (!booking) notFound();
  const q = booking.priceBreakdown;
  const guestLink = `${siteUrl()}/${booking.locale}/booking/confirmation/${booking.reference}?t=${booking.accessToken}`;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/bookings" className="text-sea-700 underline">← Всички резервации</Link></p>
      <PageHeader
        title={`Резервация ${booking.reference}`}
        description={`Създадена ${showDateTime(booking.createdAt)}`}
        actions={<div className="flex gap-2"><StatusBadge status={booking.status} /><PaymentBadge status={booking.paymentStatus} /></div>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Престой">
            <dl className="grid gap-4 sm:grid-cols-4">
              <Item label="Настаняване" value={showDay(booking.checkIn)} />
              <Item label="Напускане" value={showDay(booking.checkOut)} />
              <Item label="Нощувки" value={booking.nights} />
              <Item label="Гости" value={booking.guests} />
            </dl>
          </Panel>

          <Panel title="Гост">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Име" value={booking.guestName} />
              <Item label="Език" value={booking.locale === "bg" ? "Български" : "English"} />
              <Item label="Имейл" value={<a className="text-sea-700 underline" href={`mailto:${booking.guestEmail}`}>{booking.guestEmail}</a>} />
              <Item label="Телефон" value={<a className="text-sea-700 underline" href={`tel:${booking.guestPhone.replace(/\s/g, "")}`}>{booking.guestPhone}</a>} />
            </dl>
            {booking.guestNote && (
              <div className="mt-4 rounded-xl bg-sand-100 p-4 text-sm">
                <p className="mb-1 font-medium">Съобщение от госта</p>
                <p className="whitespace-pre-line text-ink-muted">{booking.guestNote}</p>
              </div>
            )}
          </Panel>

          <Panel title="Цена">
            <ul className="space-y-2 text-sm">
              {q.lines.map((l) => (
                <li key={l.label} className="flex justify-between">
                  <span className="text-ink-muted">{LINE_LABELS[l.label] ?? l.label}{l.kind === "nights" ? ` × ${l.quantity}` : l.kind === "discount" ? ` (${l.quantity}%)` : ""}</span>
                  <span>{money(l.amount, booking.currency)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-sand-200 pt-2 text-base font-semibold">
                <span>Общо</span><span>{money(booking.totalAmount, booking.currency)}</span>
              </li>
            </ul>
            {q.total !== booking.totalAmount && <p className="mt-2 text-xs text-ink-muted">Сумата е зададена ръчно (изчислена: {money(q.total, booking.currency)}).</p>}
            {booking.stripePaymentIntent && <p className="mt-3 text-xs text-ink-muted">Stripe плащане: <code>{booking.stripePaymentIntent}</code></p>}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Действия">
            <div className="flex flex-wrap gap-2">
              {booking.status !== "confirmed" && booking.status !== "cancelled" && (
                <ActionButton action={confirmBooking.bind(null, booking.id)} className="btn-secondary">Потвърди</ActionButton>
              )}
              {booking.paymentStatus !== "paid" && booking.status !== "cancelled" && (
                <ActionButton action={markBookingPaid.bind(null, booking.id)} confirm="Да отбележа ли резервацията като платена (напр. в брой или по банка)?">
                  Отбележи като платена
                </ActionButton>
              )}
              <ActionButton action={resendGuestEmail.bind(null, booking.id)}>Изпрати имейл отново</ActionButton>
            </div>
            <p className="mt-4 break-all text-xs text-ink-muted">Линк за госта: <a className="text-sea-700 underline" href={guestLink} target="_blank" rel="noreferrer">{guestLink}</a></p>
          </Panel>

          {booking.status !== "cancelled" && (
            <Panel title="Отказ">
              <AdminForm action={async (_prev, fd) => { "use server"; return cancelBooking(booking.id, fd); }} submitLabel="Откажи резервацията">
                <div>
                  <label className="label" htmlFor="reason">Причина (вътрешна бележка)</label>
                  <input id="reason" name="reason" className="input" maxLength={500} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-sea-700" /> Уведоми госта по имейл</label>
                {booking.paymentStatus === "paid" && booking.stripePaymentIntent && (
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="refund" defaultChecked className="accent-sea-700" /> Възстанови сумата чрез Stripe</label>
                )}
              </AdminForm>
            </Panel>
          )}

          <Panel title="Вътрешна бележка">
            <AdminForm action={async (_prev, fd) => { "use server"; return saveAdminNote(booking.id, fd); }}>
              <textarea name="adminNote" rows={5} className="input" defaultValue={booking.adminNote ?? ""} maxLength={4000} aria-label="Вътрешна бележка" />
            </AdminForm>
          </Panel>

          <Panel title="История">
            <ul className="space-y-1 text-sm text-ink-muted">
              <li>Създадена: {showDateTime(booking.createdAt)}</li>
              {booking.confirmedAt && <li>Потвърдена: {showDateTime(booking.confirmedAt)}</li>}
              {booking.cancelledAt && <li>Отказана: {showDateTime(booking.cancelledAt)}</li>}
              {booking.holdExpiresAt && booking.status === "awaiting_payment" && <li>Задържането изтича: {showDateTime(booking.holdExpiresAt)}</li>}
              <li>Последна промяна: {showDateTime(booking.updatedAt)}</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
