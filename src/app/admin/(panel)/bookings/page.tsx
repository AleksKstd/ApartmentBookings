import Link from "next/link";
import { PageHeader, PaymentBadge, StatusBadge, STATUS_LABELS, money, showDateTime, showDay } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Резервации" };

const FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "Активни" },
  { value: "pending", label: STATUS_LABELS.pending },
  { value: "confirmed", label: STATUS_LABELS.confirmed },
  { value: "awaiting_payment", label: STATUS_LABELS.awaiting_payment },
  { value: "cancelled", label: STATUS_LABELS.cancelled },
  { value: "all", label: "Всички" },
];

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const query = await searchParams;
  const filter = typeof query.status === "string" && FILTERS.some((f) => f.value === query.status) ? query.status : "active";
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status: BookingStatus[] | undefined =
    filter === "all" ? undefined : filter === "active" ? ["pending", "awaiting_payment", "confirmed"] : [filter as BookingStatus];
  const repo = getRepository();
  await repo.expireStaleHolds();
  const bookings = await repo.listBookings({ status, search: search || undefined, limit: 500 });

  return (
    <>
      <PageHeader title="Резервации" actions={<Link href="/admin/bookings/new" className="btn-primary">+ Ръчна резервация</Link>} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/bookings?status=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", f.value === filter ? "bg-sea-700 text-white" : "bg-white text-ink-muted hover:text-sea-800")}
            aria-current={f.value === filter ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto" role="search">
          <input type="hidden" name="status" value={filter} />
          <input name="q" defaultValue={search} placeholder="Търси по име, имейл, номер…" className="input w-full sm:w-64" aria-label="Търсене" />
          <button className="btn-outline" type="submit">Търси</button>
        </form>
      </div>

      {/* Phones: one card per booking instead of a wide table. */}
      <ul className="space-y-3 md:hidden" aria-label="Резервации">
        {bookings.length === 0 && <li className="card p-6 text-center text-ink-muted">Няма резервации.</li>}
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="card block p-4 hover:ring-sea-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.guestName}</p>
                  <p className="font-mono text-xs text-ink-muted">{b.reference}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-3 text-sm">{showDay(b.checkIn)} → {showDay(b.checkOut)} · {b.nights} нощ. · {b.guests} гости</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-semibold">{money(b.totalAmount, b.currency)}</span>
                <PaymentBadge status={b.paymentStatus} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-sand-200 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Номер</th>
              <th className="px-4 py-3">Гост</th>
              <th className="px-4 py-3">Престой</th>
              <th className="px-4 py-3">Гости</th>
              <th className="px-4 py-3 text-right">Сума</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Създадена</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-muted">Няма резервации.</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-mono text-xs"><Link href={`/admin/bookings/${b.id}`} className="text-sea-700 underline">{b.reference}</Link></td>
                <td className="px-4 py-3"><div className="font-medium">{b.guestName}</div><div className="text-xs text-ink-muted">{b.guestEmail}</div></td>
                <td className="px-4 py-3 whitespace-nowrap">{showDay(b.checkIn)} → {showDay(b.checkOut)}<div className="text-xs text-ink-muted">{b.nights} нощ.</div></td>
                <td className="px-4 py-3">{b.guests}</td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{money(b.totalAmount, b.currency)}<div className="mt-1"><PaymentBadge status={b.paymentStatus} /></div></td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{showDateTime(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
