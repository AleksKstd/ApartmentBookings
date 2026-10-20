import { deleteMediaItem, moveMedia, updateMediaItem, uploadMedia } from "@/app/admin/actions";
import { ActionButton, AdminForm } from "@/components/admin/form-kit";
import { PageHeader, Panel } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export const metadata = { title: "Снимки" };

export default async function MediaPage() {
  const media = await getRepository().listMedia();
  return (
    <>
      <PageHeader title="Снимки" description="Снимките в „Карусел“ се въртят в началото на сайта; „Галерия“ ги показва в галерията. Първата снимка е корица." />
      <Panel title="Качване" className="mb-6">
        <AdminForm action={uploadMedia} submitLabel="Качи" resetOnSuccess>
          <input type="file" name="files" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-sea-50 file:px-4 file:py-2 file:font-semibold file:text-sea-800" aria-label="Снимки" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="alt.bg" className="input" placeholder="Описание (BG) — за достъпност и SEO" maxLength={200} aria-label="Описание BG" />
            <input name="alt.en" className="input" placeholder="Description (EN)" maxLength={200} aria-label="Описание EN" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inCarousel" className="accent-sea-700" /> Добави в карусела</label>
          <p className="text-xs text-ink-muted">JPG, PNG, WebP или AVIF, до 10 MB на снимка, до 20 наведнъж. Препоръчително: хоризонтални, поне 1600 px широки.</p>
        </AdminForm>
      </Panel>

      {media.length === 0 ? (
        <p className="text-ink-muted">Все още няма снимки.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {media.map((m, i) => (
            <li key={m.id} className="card overflow-hidden">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded images */}
                <img src={m.url} alt={m.alt.bg} className="aspect-video w-full object-cover" loading="lazy" />
                <span className="badge absolute left-3 top-3 bg-white/90 text-ink">#{i + 1}</span>
              </div>
              <div className="space-y-3 p-4">
                <AdminForm action={updateMediaItem.bind(null, m.id)}>
                  <input name="alt.bg" defaultValue={m.alt.bg} className="input" placeholder="Описание (BG)" maxLength={200} aria-label="Описание BG" />
                  <input name="alt.en" defaultValue={m.alt.en} className="input" placeholder="Description (EN)" maxLength={200} aria-label="Описание EN" />
                  <div className="flex gap-5 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" name="inCarousel" defaultChecked={m.inCarousel} className="accent-sea-700" /> Карусел</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="inGallery" defaultChecked={m.inGallery} className="accent-sea-700" /> Галерия</label>
                  </div>
                </AdminForm>
                <div className="flex items-center gap-1 border-t border-sand-200 pt-3">
                  <ActionButton action={moveMedia.bind(null, m.id, -1)} className="btn-ghost px-2.5" title="Премести нагоре"><ArrowUp className="h-4 w-4" /></ActionButton>
                  <ActionButton action={moveMedia.bind(null, m.id, 1)} className="btn-ghost px-2.5" title="Премести надолу"><ArrowDown className="h-4 w-4" /></ActionButton>
                  <span className="ml-auto">
                    <ActionButton action={deleteMediaItem.bind(null, m.id)} className="btn-ghost text-red-700" confirm="Да изтрия ли снимката окончателно?" title="Изтрий">
                      <Trash2 className="h-4 w-4" /> Изтрий
                    </ActionButton>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
