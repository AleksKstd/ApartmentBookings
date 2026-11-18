"use server";

import { getRepository } from "@/lib/data";
import { MAX_UPLOAD_BYTES, extensionFor, sniffImageType } from "@/lib/image-sniff";
import { type ActionResult, ok, fail, refreshEverything, str, localized, guarded } from "./shared";

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export async function uploadMedia(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return fail("Изберете поне една снимка.");
    if (files.length > 20) return fail("Най-много 20 снимки наведнъж.");
    const repo = getRepository();
    const inCarousel = formData.get("inCarousel") === "on";
    let uploaded = 0;
    const rejected: string[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniffImageType(bytes);
      if (!type || file.size > MAX_UPLOAD_BYTES) {
        rejected.push(file.name);
        continue;
      }
      const stored = await repo.uploadMediaFile({ fileName: `photo.${extensionFor(type)}`, contentType: type, bytes });
      await repo.createMedia({
        url: stored.url,
        storagePath: stored.storagePath,
        alt: { bg: str(formData, "alt.bg", 200), en: str(formData, "alt.en", 200) },
        inCarousel,
        inGallery: true,
      });
      uploaded++;
    }
    refreshEverything();
    const note = rejected.length ? ` Отхвърлени (позволени са JPG, PNG, WebP, AVIF до 10 MB): ${rejected.join(", ")}` : "";
    return uploaded ? ok(`Качени снимки: ${uploaded}.${note}`) : fail(`Няма качени снимки.${note}`);
  });
}

/**
 * Production (Supabase) uploads go straight from the browser to Storage through a short-lived
 * signed URL, so photo size is not limited by the hosting platform's request body limit.
 */
export async function createUploadTarget(contentType: string, size: number): Promise<ActionResult & { signedUrl?: string; storagePath?: string }> {
  return guarded(async () => {
    const ext = extensionFor(contentType);
    if (!ext || size <= 0 || size > MAX_UPLOAD_BYTES) return fail("Позволени са JPG, PNG, WebP и AVIF до 10 MB.");
    const repo = getRepository();
    if (!repo.createUploadTarget) return fail("Директното качване не се поддържа в демо режим.");
    const target = await repo.createUploadTarget(ext);
    return { ok: true, message: "", ...target };
  });
}

export async function finalizeUpload(storagePath: string, alt: { bg: string; en: string }, inCarousel: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    if (!repo.readUploadedFile || !/^photos\/[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(storagePath)) return fail("Невалиден файл.");
    const bytes = await repo.readUploadedFile(storagePath);
    if (!bytes || bytes.length > MAX_UPLOAD_BYTES || sniffImageType(bytes) !== `image/${storagePath.endsWith(".jpg") ? "jpeg" : storagePath.split(".").pop()}`) {
      await repo.deleteMediaFile(storagePath).catch(() => undefined);
      return fail("Файлът не е валидна снимка и беше изтрит.");
    }
    await repo.createMedia({
      url: repo.publicMediaUrl!(storagePath),
      storagePath,
      alt: { bg: alt.bg.slice(0, 200), en: alt.en.slice(0, 200) },
      inCarousel,
      inGallery: true,
    });
    refreshEverything();
    return ok("Качено.");
  });
}

export async function updateMediaItem(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await getRepository().updateMedia(id, {
      alt: localized(formData, "alt", 200),
      inCarousel: formData.get("inCarousel") === "on",
      inGallery: formData.get("inGallery") === "on",
    });
    refreshEverything();
    return ok("Запазено.");
  });
}

export async function moveMedia(id: string, direction: -1 | 1): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const ids = (await repo.listMedia()).map((m) => m.id);
    const i = ids.indexOf(id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ids.length) return ok("");
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await repo.reorderMedia(ids);
    refreshEverything();
    return ok("Подредбата е запазена.");
  });
}

export async function deleteMediaItem(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const repo = getRepository();
    const removed = await repo.deleteMedia(id);
    if (removed?.storagePath) await repo.deleteMediaFile(removed.storagePath).catch((e) => console.error("[media] file delete failed", e));
    refreshEverything();
    return ok("Снимката е изтрита.");
  });
}
