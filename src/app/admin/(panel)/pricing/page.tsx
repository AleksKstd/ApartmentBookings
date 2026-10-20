import { deleteSeasonalRate, savePricing, saveSeasonalRate } from "@/app/admin/actions";
import { ActionButton, AdminForm, Field } from "@/components/admin/form-kit";
import { PageHeader, Panel, euros, money, showDay } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Цени" };

export default async function PricingPage() {
  const repo = getRepository();
  const [{ pricing: p }, seasons] = await Promise.all([repo.getSettings(), repo.listSeasonalRates()]);

  return (
    <>
      <PageHeader title="Цени и правила" description={`Всички суми са в ${p.currency}. Цената се изчислява на сървъра при всяка резервация.`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Основни цени">
          <AdminForm action={savePricing}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Цена на нощ (делник)" name="baseNightly" inputMode="decimal" defaultValue={euros(p.baseNightly)} required />
              <Field label="Цена на нощ (петък и събота)" name="weekendNightly" inputMode="decimal" defaultValue={euros(p.weekendNightly)} hint="Празно = като делник" />
              <Field label="Такса почистване" name="cleaningFee" inputMode="decimal" defaultValue={euros(p.cleaningFee)} />
              <Field label="Доплащане за гост на нощ" name="extraGuestNightly" inputMode="decimal" defaultValue={euros(p.extraGuestNightly)} />
              <Field label="Включени гости в цената" name="includedGuests" type="number" min={1} max={50} defaultValue={p.includedGuests} required />
              <Field label="Максимален брой гости" name="maxGuests" type="number" min={1} max={50} defaultValue={p.maxGuests} required />
              <Field label="Минимален престой (нощи)" name="minNights" type="number" min={1} max={365} defaultValue={p.minNights} required />
              <Field label="Максимален престой (нощи)" name="maxNights" type="number" min={1} max={3650} defaultValue={p.maxNights} required />
              <Field label="Отстъпка за 7+ нощи (%)" name="weeklyDiscountPercent" type="number" min={0} max={90} defaultValue={p.weeklyDiscountPercent} required />
              <Field label="Отстъпка за 28+ нощи (%)" name="monthlyDiscountPercent" type="number" min={0} max={90} defaultValue={p.monthlyDiscountPercent} required />
              <Field label="Резервации до (дни напред)" name="bookingWindowDays" type="number" min={7} max={1095} defaultValue={p.bookingWindowDays} required />
              <Field label="Задържане при плащане (мин.)" name="holdMinutes" type="number" min={32} max={1440} defaultValue={p.holdMinutes} required hint="Минимум 32 (Stripe изисква сесия от поне 30 мин.)" />
            </div>
          </AdminForm>
        </Panel>

        <div className="space-y-6">
          <Panel title="Сезонни цени">
            <p className="mb-4 text-sm text-ink-muted">Сезонната цена замества делнична и уикенд цена за всяка нощ в периода. При застъпване важи последно добавеният сезон.</p>
            {seasons.length === 0 ? (
              <p className="text-sm text-ink-muted">Няма сезонни цени.</p>
            ) : (
              <ul className="divide-y divide-sand-200">
                {seasons.map((s) => (
                  <li key={s.id} className="py-3">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-ink-muted">{showDay(s.startDate)} – {showDay(s.endDate)}</span>
                        <span className="ml-auto font-semibold">{money(s.nightly, p.currency)} / нощ{s.minNights ? ` · мин. ${s.minNights} н.` : ""}</span>
                      </summary>
                      <div className="mt-4">
                        <SeasonForm season={s} />
                        <div className="mt-3">
                          <ActionButton action={deleteSeasonalRate.bind(null, s.id)} className="btn-ghost text-red-700" confirm="Да изтрия ли сезона?">Изтрий сезона</ActionButton>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Нов сезон">
            <SeasonForm />
          </Panel>
        </div>
      </div>
    </>
  );
}

function SeasonForm({ season }: { season?: { id: string; name: string; startDate: string; endDate: string; nightly: number; minNights: number | null } }) {
  return (
    <AdminForm action={saveSeasonalRate} submitLabel={season ? "Запази сезона" : "Добави сезон"} resetOnSuccess={!season}>
      {season && <input type="hidden" name="id" value={season.id} />}
      <Field label="Име" name="name" defaultValue={season?.name} maxLength={80} placeholder="напр. Лято" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Първа нощ" name="startDate" type="date" defaultValue={season?.startDate} required />
        <Field label="Последна нощ" name="endDate" type="date" defaultValue={season?.endDate} required />
        <Field label="Цена на нощ" name="nightly" inputMode="decimal" defaultValue={euros(season?.nightly ?? null)} required />
        <Field label="Мин. престой (по желание)" name="minNights" type="number" min={1} max={365} defaultValue={season?.minNights ?? ""} />
      </div>
    </AdminForm>
  );
}
