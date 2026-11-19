import { saveHomepage, saveHostInfo, saveProperty } from "@/app/admin/actions";
import { AdminForm, Field, LocalizedField } from "@/components/admin/form-kit";
import { PageHeader, Panel } from "@/components/admin/ui";
import bg from "@/i18n/bg";
import { getRepository } from "@/lib/data";
import { AMENITY_KEYS } from "@/lib/data/defaults";
import { isPlaceholder, isStarterContact } from "@/lib/placeholder";

export const metadata = { title: "Съдържание" };

const EMPTY = { bg: "", en: "" };

export default async function ContentPage() {
  const repo = getRepository();
  const [{ homepage: h, property: p }, media] = await Promise.all([repo.getSettings(), repo.listMedia()]);
  // Two blank rows so new places can be added without client-side code.
  const nearby = [...h.nearby, { place: EMPTY, distance: EMPTY }, { place: EMPTY, distance: EMPTY }];

  // Starter values in [square brackets] are hidden on the public site until replaced.
  const both = (v: { bg: string; en: string }) => isPlaceholder(v.bg) || isPlaceholder(v.en);
  const todo = [
    isPlaceholder(p.hostName) && "име на домакина",
    both(p.hostBio) && "няколко думи за домакина",
    both(p.replyTime) && "време за отговор",
    both(p.cancellationPolicy) && "условия за анулиране",
    h.nearby.some((n) => both(n.distance)) && "разстояния до места наблизо",
    isStarterContact("address", p.address) && "адрес",
    isStarterContact("contactEmail", p.contactEmail) && "имейл за контакт",
    isStarterContact("contactPhone", p.contactPhone) && "телефон за контакт",
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Съдържание" description="Текстовете се показват на двата езика. Ако английският превод липсва, се показва българският." />
      {todo.length > 0 && (
        <p className="mb-6 rounded-xl bg-warning-50 p-4 text-sm text-warning-800" role="note">
          <strong>Попълнете примерните данни.</strong> Полетата в [квадратни скоби] и примерните адрес, имейл и телефон не се показват на сайта,
          докато не ги замените: {todo.join(", ")}.
        </p>
      )}
      <div className="space-y-6">
        <Panel title="Домакин и условия за резервация">
          <p className="mb-4 text-sm text-ink-muted">Показват се до формата за резервация и на страницата за потвърждение — там, където гостите решават.</p>
          <AdminForm action={saveHostInfo} submitLabel="Запази домакина и условията">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Име на домакина" name="hostName" defaultValue={p.hostName} maxLength={80} />
              <div>
                <label className="label" htmlFor="f-hostPhotoUrl">Снимка на домакина</label>
                <select id="f-hostPhotoUrl" name="hostPhotoUrl" defaultValue={p.hostPhotoUrl} className="input">
                  <option value="">Без снимка (показват се инициали)</option>
                  {media.map((m) => (
                    <option key={m.id} value={m.url}>{m.alt.bg || m.url}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-muted">Качете снимката в „Снимки“ и махнете отметките за карусел и галерия, ако не искате да се показва там.</p>
              </div>
            </div>
            <LocalizedField label="Няколко думи за домакина" name="hostBio" value={p.hostBio} multiline maxLength={600} />
            <LocalizedField label="Време за отговор (напр. „Обикновено отговаря до няколко часа“)" name="replyTime" value={p.replyTime} maxLength={120} />
            <LocalizedField label="Условия за анулиране" name="cancellationPolicy" value={p.cancellationPolicy} multiline maxLength={1500} />
          </AdminForm>
        </Panel>

        <Panel title="Начална страница">
          <AdminForm action={saveHomepage} submitLabel="Запази началната страница">
            <LocalizedField label="Заглавие (върху карусела)" name="heroTitle" value={h.heroTitle} maxLength={120} />
            <LocalizedField label="Подзаглавие" name="heroSubtitle" value={h.heroSubtitle} maxLength={300} />
            <LocalizedField label="Въведение — заглавие" name="introTitle" value={h.introTitle} maxLength={120} />
            <LocalizedField label="Въведение — текст" name="introText" value={h.introText} multiline rows={5} maxLength={3000} />
            <fieldset className="space-y-4 rounded-2xl border border-sand-200 p-4">
              <legend className="px-2 font-semibold">Уличната табела до заглавието</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Текст на табелата (празно = скрита)" name="streetSign.name" defaultValue={h.streetSign.name} maxLength={60} hint="напр. бул. „Богориди“" />
                <Field label="Втори ред на латиница" name="streetSign.latin" defaultValue={h.streetSign.latin} maxLength={60} hint="напр. Bogoridi Blvd" />
              </div>
              <LocalizedField label="Бележка под табелата" name="streetSign.note" value={h.streetSign.note} maxLength={200} />
            </fieldset>
            <fieldset className="space-y-4 rounded-2xl border border-sand-200 p-4">
              <legend className="px-2 font-semibold">Наблизо (разстояния от входа)</legend>
              <input type="hidden" name="nearbyCount" value={nearby.length} />
              {nearby.map((item, i) => (
                <div key={i} className="space-y-3 border-b border-sand-200 pb-4 last:border-0">
                  <LocalizedField label={i < h.nearby.length ? `Място ${i + 1}` : "Ново място"} name={`nearby.${i}.place`} value={item.place} maxLength={80} />
                  <LocalizedField label="Разстояние (напр. „5 мин пеша“)" name={`nearby.${i}.distance`} value={item.distance} maxLength={40} />
                  {i < h.nearby.length && (
                    <label className="flex items-center gap-2 text-sm text-danger-700"><input type="checkbox" name={`nearby.${i}.remove`} /> Премахни</label>
                  )}
                </div>
              ))}
            </fieldset>
            <LocalizedField label="Локация — заглавие" name="locationTitle" value={h.locationTitle} maxLength={120} />
            <LocalizedField label="Локация — текст" name="locationText" value={h.locationText} multiline maxLength={1000} />
            <LocalizedField label="Призив — заглавие" name="ctaTitle" value={h.ctaTitle} maxLength={120} />
            <LocalizedField label="Призив — текст" name="ctaText" value={h.ctaText} maxLength={300} />
          </AdminForm>
        </Panel>

        <Panel title="Информация за обекта">
          <AdminForm action={saveProperty} submitLabel="Запази информацията">
            <Field label="Име на обекта" name="name" defaultValue={p.name} required maxLength={80} />
            <LocalizedField label="Кратко описание" name="tagline" value={p.tagline} maxLength={200} />
            <LocalizedField label="Описание" name="description" value={p.description} multiline rows={6} maxLength={5000} />
            <LocalizedField label="Град" name="city" value={p.city} maxLength={80} />
            <Field label="Адрес" name="address" defaultValue={p.address} maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Линк към карта (https://)" name="mapUrl" defaultValue={p.mapUrl} maxLength={500} className="sm:col-span-3" />
              <Field label="Географска ширина" name="latitude" defaultValue={p.latitude ?? ""} inputMode="decimal" />
              <Field label="Географска дължина" name="longitude" defaultValue={p.longitude ?? ""} inputMode="decimal" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Field label="Спални" name="bedrooms" type="number" min={0} max={50} defaultValue={p.bedrooms} />
              <Field label="Легла" name="beds" type="number" min={0} max={100} defaultValue={p.beds} />
              <Field label="Бани" name="bathrooms" type="number" min={0} max={50} defaultValue={p.bathrooms} />
              <Field label="Площ (кв.м)" name="areaSqm" type="number" min={1} max={10000} defaultValue={p.areaSqm} />
              <Field label="Настаняване след" name="checkInTime" type="time" defaultValue={p.checkInTime} />
              <Field label="Напускане до" name="checkOutTime" type="time" defaultValue={p.checkOutTime} />
            </div>
            <fieldset>
              <legend className="label">Удобства</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AMENITY_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="amenities" value={key} defaultChecked={p.amenities.includes(key)} className="accent-sea-700" />
                    {bg.amenities[key]}
                  </label>
                ))}
              </div>
            </fieldset>
            <LocalizedField label="Правила на дома (по едно на ред)" name="houseRules" value={p.houseRules} multiline rows={5} maxLength={3000} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Имейл за контакт" name="contactEmail" type="email" defaultValue={p.contactEmail} required />
              <Field label="Телефон за контакт" name="contactPhone" defaultValue={p.contactPhone} maxLength={40} />
            </div>
          </AdminForm>
        </Panel>
      </div>
    </>
  );
}
