"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createUploadTarget, finalizeUpload, uploadMedia, type ActionResult } from "@/app/admin/actions";
import { AdminForm, ResultMessage } from "./form-kit";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

function Fields() {
  return (
    <>
      <input type="file" name="files" accept={ACCEPT} multiple required className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-sea-50 file:px-4 file:py-2 file:font-semibold file:text-sea-800" aria-label="Снимки" />
      <div className="grid gap-3 md:grid-cols-2">
        <input name="alt.bg" className="input" placeholder="Описание (BG) — за достъпност и SEO" maxLength={200} aria-label="Описание BG" />
        <input name="alt.en" className="input" placeholder="Description (EN)" maxLength={200} aria-label="Описание EN" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inCarousel" className="accent-sea-700" /> Добави в карусела</label>
      <p className="text-xs text-ink-muted">JPG, PNG, WebP или AVIF, до 10 MB на снимка, до 20 наведнъж. Препоръчително: хоризонтални, поне 1600 px широки.</p>
    </>
  );
}

/**
 * Demo mode posts the files to a server action. With Supabase, each file goes straight from the
 * browser to Storage via a signed URL and is then verified and registered by the server.
 */
export function MediaUploader({ direct }: { direct: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  if (!direct) {
    return (
      <AdminForm action={uploadMedia} submitLabel="Качи" resetOnSuccess>
        <Fields />
      </AdminForm>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
    if (!files.length) return;
    const alt = { bg: String(fd.get("alt.bg") ?? ""), en: String(fd.get("alt.en") ?? "") };
    const inCarousel = fd.get("inCarousel") === "on";
    setBusy(true);
    setResult(null);
    const failed: string[] = [];
    for (const file of files) {
      try {
        const target = await createUploadTarget(file.type, file.size);
        if (!target.ok || !target.signedUrl || !target.storagePath) throw new Error(target.message);
        const put = await fetch(target.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type, "x-upsert": "false", "cache-control": "max-age=31536000" },
          body: file,
        });
        if (!put.ok) throw new Error(`Storage HTTP ${put.status}`);
        const done = await finalizeUpload(target.storagePath, alt, inCarousel);
        if (!done.ok) throw new Error(done.message);
      } catch (error) {
        failed.push(`${file.name} (${error instanceof Error ? error.message : "грешка"})`);
      }
    }
    setBusy(false);
    const uploaded = files.length - failed.length;
    setResult({ ok: failed.length === 0, message: `Качени снимки: ${uploaded}.${failed.length ? ` Неуспешни: ${failed.join(", ")}` : ""}` });
    if (uploaded) {
      form.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Fields />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-secondary" disabled={busy}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Качи
        </button>
        <ResultMessage result={result} />
      </div>
    </form>
  );
}
