import Link from "next/link";
import { CalendarCheck, Clock, Euro, Percent } from "lucide-react";
import { Panel, PageHeader, StatusBadge, money, showDay } from "@/components/admin/ui";
import { bookingBlocksCalendar } from "@/lib/availability";
import { getRepository } from "@/lib/data";
import { addDays, eachNight, todayAtProperty } from "@/lib/dates";

export default async function DashboardPage() {
  const repo = getRepository();
  await repo.expireStaleHolds();
  const today = todayAtProperty();
  const in30 = addDays(today, 30);
  const [all, blocked, { pricing }] = await Promise.all([repo.listBookings(), repo.listBlockedRanges(), repo.getSettings()]);

  const active = all.filter((b) => bookingBlocksCalendar(b));
  const pending = all.filter((b) => b.status === "pending");
  const upcoming = all
    .filter((b) => b.status === "confirmed" && b.checkIn >= today && b.checkIn <= addDays(today, 14))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const inHouse = all.filter((b) => b.status === "confirmed" && b.checkIn <= today && b.checkOut > today);

  const window30 = eachNight(today, in30);
  const occupied = new Set<string>();
  for (const b of active) for (const n of eachNight(b.checkIn, b.checkOut)) occupied.add(n);
  for (const r of blocked) for (const n of eachNight(r.startDate, r.endDate)) occupied.add(n);
  const occupancy = Math.round((window30.filter((n) => occupied.has(n)).length / window30.length) * 100);

  const revenueMonth = all
    .filter((b) => b.status === "confirmed" && b.checkIn.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const stats = [
    { label: "Чакащи потвърждение", value: pending.length, icon: Clock, href: "/admin/bookings?status=pending" },
    { label: "Пристигания (14 дни)", value: upcoming.length, icon: CalendarCheck, href: "/admin/bookings?status=confirmed" },
    { label: "Заетост (30 дни)", value: `${occupancy}%`, icon: Percent, href: "/admin/calendar" },
    { label: "Приходи този месец", value: money(revenueMonth, pricing.currency), icon: Euro, href: "/admin/bookings" },
  ];

  return (
    <>
      <PageHeader title="Табло" description={`Днес е ${showDay(today)}`} actions={<Link href="/admin/bookings/new" className="btn-primary">+ Ръчна резервация</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="card flex items-center gap-4 p-5 hover:ring-sea-200">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-sea-50 text-sea-700"><Icon className="h-5 w-5" aria-hidden /></span>
            <span>
              <span className="block text-2xl font-semibold text-sea-900">{value}</span>
              <span className="text-sm text-ink-muted">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Изискват действие">
          {pending.length === 0 ? (
            <p className="text-sm text-ink-muted">Няма чакащи запитвания.</p>
          ) : (
            <BookingRows bookings={pending} />
          )}
        </Panel>
        <Panel title="Предстоящи пристигания">
          {inHouse.length > 0 && (
            <p className="mb-3 rounded-xl bg-sea-50 p-3 text-sm text-sea-800">В момента настанени: {inHouse.map((b) => b.guestName).join(", ")}</p>
          )}
          {upcoming.length === 0 ? <p className="text-sm text-ink-muted">Няма пристигания в следващите 14 дни.</p> : <BookingRows bookings={upcoming} />}
        </Panel>
        <Panel title="Последни резервации" className="xl:col-span-2">
          {all.length === 0 ? <p className="text-sm text-ink-muted">Все още няма резервации.</p> : <BookingRows bookings={all.slice(0, 8)} />}
        </Panel>
      </div>
    </>
  );
}

function BookingRows({ bookings }: { bookings: Awaited<ReturnType<ReturnType<typeof getRepository>["listBookings"]>> }) {
  return (
    <ul className="divide-y divide-sand-200">
      {bookings.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-sand-50">
            <span className="font-mono text-xs text-ink-muted">{b.reference}</span>
            <span className="font-medium">{b.guestName}</span>
            <span className="text-sm text-ink-muted">{showDay(b.checkIn)} → {showDay(b.checkOut)}</span>
            <span className="ml-auto flex items-center gap-3">
              <span className="text-sm font-semibold">{money(b.totalAmount, b.currency)}</span>
              <StatusBadge status={b.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
