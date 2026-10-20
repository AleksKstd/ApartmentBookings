import { deleteFeed, saveFeed, syncFeedNow, toggleFeed } from "@/app/admin/actions";
import { ActionButton, AdminForm, Field } from "@/components/admin/form-kit";
import { PageHeader, Panel, showDateTime } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

export const metadata = { title: "Синхронизация" };

export default async function SyncPage() {
  const feeds = await getRepository().listFeeds();
  const token = process.env.ICAL_EXPORT_TOKEN;
  const exportUrl = token && token.length >= 16 ? `${siteUrl()}/api/calendar/export?token=${token}` : null;

  return (
    <>
      <PageHeader title="Синхронизация на календари" description="Избягвайте двойни резервации с Airbnb, Booking.com и други платформи чрез iCal." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="1. Внос: заети дати от други платформи">
          <p className="mb-4 text-sm text-ink-muted">
            Поставете iCal адреса от Airbnb („Наличност → Свържете календари → Експортиране“) или Booking.com („Календар → Синхронизиране“). Заетите дати
            се блокират автоматично. Синхронизацията се изпълнява по график (виж документацията) и при натискане на „Синхронизирай“.
          </p>
          <AdminForm action={saveFeed} submitLabel="Добави календар" resetOnSuccess>
            <Field label="Име" name="name" placeholder="напр. Airbnb" required maxLength={80} />
            <Field label="iCal адрес (https://…)" name="url" type="url" required maxLength={2000} />
          </AdminForm>
          {feeds.length > 0 && (
            <ul className="mt-6 divide-y divide-sand-200">
              {feeds.map((f) => (
                <li key={f.id} className="space-y-2 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{f.name}</span>
                    <span className={`badge ${f.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{f.isActive ? "Активен" : "Спрян"}</span>
                    {f.lastError && <span className="badge bg-red-100 text-red-800">Грешка</span>}
                  </div>
                  <p className="break-all text-xs text-ink-muted">{f.url}</p>
                  <p className="text-xs text-ink-muted">
                    {f.lastSyncedAt ? `Последна синхронизация: ${showDateTime(f.lastSyncedAt)} · ${f.lastEventCount ?? 0} периода` : "Още не е синхронизиран"}
                    {f.lastError && <span className="block text-red-700">{f.lastError}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={syncFeedNow.bind(null, f.id)}>Синхронизирай</ActionButton>
                    <ActionButton action={toggleFeed.bind(null, f.id, !f.isActive)} className="btn-ghost">{f.isActive ? "Спри" : "Активирай"}</ActionButton>
                    <ActionButton action={deleteFeed.bind(null, f.id)} className="btn-ghost text-red-700" confirm="Да премахна ли календара и импортираните от него дати?">Премахни</ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="2. Износ: вашите резервации към други платформи">
          {exportUrl ? (
            <>
              <p className="mb-3 text-sm text-ink-muted">Добавете този адрес като „импортиран календар“ в Airbnb и Booking.com. Съдържа само заети дати — без лични данни.</p>
              <code className="block break-all rounded-xl bg-sand-100 p-3 text-xs">{exportUrl}</code>
              <p className="mt-3 text-xs text-ink-muted">Пазете адреса в тайна. За да го смените, задайте нова стойност на ICAL_EXPORT_TOKEN.</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Износът е изключен. Задайте променлива на средата <code>ICAL_EXPORT_TOKEN</code> (поне 16 произволни символа), за да получите адрес за износ.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
