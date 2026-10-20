import type { BookingStatus, PaymentStatus } from "@/lib/types";
import { formatMoney } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Чака потвърждение",
  awaiting_payment: "Чака плащане",
  confirmed: "Потвърдена",
  cancelled: "Отказана",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-sky-100 text-sky-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Неплатена",
  paid: "Платена",
  refunded: "Възстановена",
  failed: "Неуспешно плащане",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={cn("badge", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("badge", status === "paid" ? "bg-green-50 text-green-700 ring-1 ring-green-200" : status === "refunded" ? "bg-violet-50 text-violet-700" : "bg-sand-200 text-ink-muted")}>
      {PAYMENT_LABELS[status]}
    </span>
  );
}

const dayFmt = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Sofia" });

export const showDay = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));
export const showDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const money = (cents: number, currency = "EUR") => formatMoney(cents, currency, "bg");
export const euros = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description && <p className="mt-1 text-ink-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {title && <h2 className="mb-4 font-sans text-lg font-semibold text-sea-900">{title}</h2>}
      {children}
    </section>
  );
}
