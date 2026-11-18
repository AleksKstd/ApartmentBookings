import { LoaderCircle } from "lucide-react";

/** Shown while a public page streams in (e.g. a slow database response). */
export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <LoaderCircle className="h-8 w-8 animate-spin text-sea-700" aria-hidden />
      <span className="sr-only">Loading… / Зареждане…</span>
    </div>
  );
}
