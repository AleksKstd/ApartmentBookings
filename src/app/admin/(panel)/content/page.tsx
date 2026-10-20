import { saveHomepage, saveProperty } from "@/app/admin/actions";
import { AdminForm, Field, LocalizedField } from "@/components/admin/form-kit";
import { PageHeader, Panel } from "@/components/admin/ui";
import bg from "@/i18n/bg";
import { getRepository } from "@/lib/data";
import { AMENITY_KEYS } from "@/lib/data/defaults";

export const metadata = { title: "Съдържание" };

const EMPTY = { bg: "", en: "" };

export default async function ContentPage() {
  const { homepage: h, property: p } = await getRepository().getSettings();
  // Two blank rows so new highlights can be added without client-side code.
  const highlights = [...h.highlights, { title: EMPTY, text: EMPTY }, { title: EMPTY, text: EMPTY }];

  return (
    <>
      <PageHeader title="Съдържание" description="Текстовете се показват на двата езика. Ако английският превод липсва, се показва българският." />
      <div className="space-y-6">
        <Panel title="Начална страница">
          <AdminForm action={saveHomepage} submitLabel="Запази началната страница">
            <LocalizedField label="Заглавие (върху карусела)" name="heroTitle" value={h.heroTitle} maxLength={120} />
            <LocalizedField label="Подзаглавие" name="heroSubtitle" value={h.heroSubtitle} maxLength={300} />
            <LocalizedField label="Въведение — заглавие" name="introTitle" value={h.introTitle} maxLength={120} />
            <LocalizedField label="Въведение — текст" name="introText" value={h.introText} multiline rows={5} maxLength={3000} />
            <fieldset className="space-y-4 rounded-2xl border border-sand-200 p-4">
              <legend className="px-2 font-semibold">Предимства</legend>
              <input type="hidden" name="highlightCount" value={highlights.length} />
              {highlights.map((item, i) => (
                <div key={i} className="space-y-3 border-b border-sand-200 pb-4 last:border-0">
                  <LocalizedField label={i < h.highlights.length ? `Предимство ${i + 1} — заглавие` : "Ново предимство — заглавие"} name={`highlights.${i}.title`} value={item.title} maxLength={120} />
                  <LocalizedField label="Текст" name={`highlights.${i}.text`} value={item.text} maxLength={400} />
                  {i < h.highlights.length && (
                    <label className="flex items-center gap-2 text-sm text-red-700"><input type="checkbox" name={`highlights.${i}.remove`} /> Премахни</label>
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
