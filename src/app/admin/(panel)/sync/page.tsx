import { deleteFeed, saveFeed, syncFeedNow, toggleFeed } from "@/app/admin/actions/calendar";
import { CopyField } from "@/components/admin/copy-field";
import { ActionButton, AdminForm, Field } from "@/components/admin/form-kit";
import { PageHeader, Panel, showDateTime } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

export const metadata = { title: "Синхронизация" };

const PLATFORMS = ["Booking.com", "Airbnb", "Vrbo", "Google Calendar"];

export default async function SyncPage() {
  const feeds = await getRepository().listFeeds();
  const token = process.env.ICAL_EXPORT_TOKEN;
  const exportBase = token && token.length >= 16 ? `${siteUrl()}/api/calendar/availability.ics?token=${encodeURIComponent(token)}` : null;
  const autoSync = Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16);

  return (
    <>
      <PageHeader
        title="Синхронизация на календари"
        description="Двупосочна iCal връзка с Booking.com, Airbnb и други платформи — заетите дати се прехвърлят автоматично и предотвратяват двойни резервации."
      />

      <Panel title="Как да свържете Booking.com" className="mb-6">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
          <li>
            В Booking.com Extranet отворете <strong>Цени и наличност → Синхронизиране на календари</strong> (Rates &amp; Availability → Sync calendars) и
            изберете <strong>Добавяне на връзка с календар</strong>.
          </li>
          <li>
            Копирайте адреса за <strong>износ</strong>, който Booking.com показва (завършва на .ics), и го добавете отдолу в „1. Внос“ с име
            „Booking.com“.
          </li>
          <li>
            След като календарът е добавен тук, до него се появява <strong>личен адрес за Booking.com</strong>. Поставете го в Booking.com в полето за
            <strong> внос</strong> и запазете.
          </li>
          <li>Повторете същото за Airbnb (Календар → Наличност → Свързване към друг сайт) и всяка друга платформа.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-muted">
          iCal не е мигновен: Booking.com и Airbnb обновяват внесените календари на всеки 1–3 часа, а този сайт — {autoSync ? "на всеки 30 минути" : "само ръчно, докато не зададете CRON_SECRET"}.
          За последна минута проверявайте и в платформите.
        </p>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="1. Внос: заети дати от други платформи">
          <AdminForm action={saveFeed} submitLabel="Добави календар" resetOnSuccess>
            <Field label="Платформа" name="name" placeholder="напр. Booking.com" required maxLength={80} list="platform-names" />
            <datalist id="platform-names">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Field label="iCal адрес за износ от платформата (https://…)" name="url" type="url" required maxLength={2000} />
          </AdminForm>
          {feeds.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">Все още няма свързани календари.</p>
          ) : (
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
                  {exportBase && (
                    <div className="rounded-xl bg-sand-100 p-3">
                      <p className="mb-2 text-xs font-medium text-ink">Адрес за внос в {f.name} (съдържа вашите резервации и тези от другите платформи):</p>
                      <CopyField value={`${exportBase}&for=${f.id}`} label={`Адрес за внос в ${f.name}`} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={syncFeedNow.bind(null, f.id)} showSuccess>Синхронизирай</ActionButton>
                    <ActionButton action={toggleFeed.bind(null, f.id, !f.isActive)} className="btn-ghost">{f.isActive ? "Спри" : "Активирай"}</ActionButton>
                    <ActionButton action={deleteFeed.bind(null, f.id)} className="btn-ghost text-red-700" confirm="Да премахна ли календара и импортираните от него дати?">Премахни</ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="2. Износ: вашите резервации към други платформи">
          {exportBase ? (
            <>
              <p className="mb-3 text-sm text-ink-muted">
                За всяка свързана платформа използвайте личния ѝ адрес от „1. Внос“. Общият адрес по-долу съдържа само резервациите и блокировките от този
                сайт — за платформи, от които не внасяте календар.
              </p>
              <CopyField value={exportBase} label="Общ адрес за износ" />
              <p className="mt-3 text-xs text-ink-muted">
                Адресите съдържат само заети дати — без имена и лични данни. Пазете ги в тайна; за да ги смените, задайте нова стойност на ICAL_EXPORT_TOKEN.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Износът е изключен. Задайте променлива на средата <code>ICAL_EXPORT_TOKEN</code> (поне 16 произволни символа, например с{" "}
              <code>npm run generate-secrets</code>), за да получите адреси за Booking.com и Airbnb.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
