import Link from "next/link";
import { addBlockedRange, deleteBlockedRange } from "@/app/admin/actions";
import { ActionButton, AdminForm, Field } from "@/components/admin/form-kit";
import { PageHeader, Panel, showDay } from "@/components/admin/ui";
import { bookingBlocksCalendar } from "@/lib/availability";
import { getRepository } from "@/lib/data";
import { addDays, addMonths, daysInMonth, eachNight, isIsoDate, startOfMonth, todayAtProperty, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Календар" };

const monthFmt = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const query = await searchParams;
  const today = todayAtProperty();
  const requested = typeof query.month === "string" && isIsoDate(`${query.month}-01`) ? `${query.month}-01` : startOfMonth(today);
  const months = [requested, addMonths(requested, 1)];
  const rangeEnd = addMonths(requested, 2);

  const repo = getRepository();
  await repo.expireStaleHolds();
  const [bookings, blocked] = await Promise.all([
    repo.listBookings({ status: ["pending", "awaiting_payment", "confirmed"], from: requested, to: rangeEnd }),
    repo.listBlockedRanges(),
  ]);

  type Cell = { kind: "booking" | "pending" | "manual" | "ical"; label: string; href?: string };
  const cells = new Map<string, Cell>();
  for (const b of bookings.filter((x) => bookingBlocksCalendar(x))) {
    for (const n of eachNight(b.checkIn, b.checkOut)) cells.set(n, { kind: b.status === "confirmed" ? "booking" : "pending", label: `${b.reference} · ${b.guestName}`, href: `/admin/bookings/${b.id}` });
  }
  for (const r of blocked) {
    for (const n of eachNight(r.startDate, r.endDate)) if (!cells.has(n)) cells.set(n, { kind: r.source === "ical" ? "ical" : "manual", label: r.reason ?? "Блокирано" });
  }
  const styles: Record<Cell["kind"], string> = {
    booking: "bg-sea-700 text-white",
    pending: "bg-amber-200 text-amber-900",
    manual: "bg-gray-300 text-gray-800",
    ical: "bg-violet-200 text-violet-900",
  };
  const upcomingBlocks = blocked.filter((b) => b.endDate > today);

  return (
    <>
      <PageHeader
        title="Календар"
        description="Заетост по нощувки. Блокирайте дати за ремонт, лично ползване и др."
        actions={
          <div className="flex gap-2">
            <Link className="btn-outline" href={`/admin/calendar?month=${addMonths(requested, -1).slice(0, 7)}`}>← Назад</Link>
            <Link className="btn-outline" href="/admin/calendar">Днес</Link>
            <Link className="btn-outline" href={`/admin/calendar?month=${addMonths(requested, 1).slice(0, 7)}`}>Напред →</Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        {[["booking", "Потвърдена"], ["pending", "Чакаща / плащане"], ["manual", "Блокирано ръчно"], ["ical", "Външен календар"]].map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded", styles[k as Cell["kind"]])} />{l}</span>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {months.map((m) => (
          <Panel key={m} title={monthFmt.format(new Date(`${m}T00:00:00Z`))}>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: (weekday(m) + 6) % 7 }, (_, i) => <div key={`p${i}`} />)}
              {Array.from({ length: daysInMonth(m) }, (_, i) => {
                const day = addDays(m, i);
                const cell = cells.get(day);
                const content = (
                  <>
                    <span className="font-semibold">{i + 1}</span>
                    {cell && <span className="mt-auto line-clamp-2 text-[10px] leading-tight opacity-90">{cell.label}</span>}
                  </>
                );
                const cls = cn("flex h-16 flex-col rounded-lg p-1 text-left text-xs sm:h-20", cell ? styles[cell.kind] : "bg-sand-50", day < today && "opacity-50", day === today && "ring-2 ring-clay-500");
                return cell?.href ? (
                  <Link key={day} href={cell.href} className={cls} title={cell.label}>{content}</Link>
                ) : (
                  <div key={day} className={cls} title={cell?.label}>{content}</div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Блокирай период">
          <AdminForm action={addBlockedRange} submitLabel="Блокирай" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="От (първа нощ)" name="startDate" type="date" required min={today} />
              <Field label="До (ден на освобождаване)" name="endDate" type="date" required min={today} />
            </div>
            <Field label="Причина" name="reason" maxLength={200} placeholder="напр. ремонт" />
          </AdminForm>
        </Panel>
        <Panel title="Блокирани периоди">
          {upcomingBlocks.length === 0 ? (
            <p className="text-sm text-ink-muted">Няма блокирани периоди.</p>
          ) : (
            <ul className="divide-y divide-sand-200 text-sm">
              {upcomingBlocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span>{showDay(b.startDate)} → {showDay(b.endDate)}</span>
                  <span className="text-ink-muted">{b.reason}</span>
                  <span className="ml-auto">
                    {b.source === "manual" ? (
                      <ActionButton action={deleteBlockedRange.bind(null, b.id)} className="btn-ghost text-red-700" confirm="Да премахна ли блокировката?">Премахни</ActionButton>
                    ) : (
                      <span className="badge bg-violet-100 text-violet-800">от синхронизация</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
