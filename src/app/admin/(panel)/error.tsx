"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";
  return (
    <div className="card mx-auto max-w-xl p-8 text-center" role="alert">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700">
        <TriangleAlert className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl">Нещо се обърка</h1>
      <p className="mt-2 text-ink-muted">
        Страницата не можа да се зареди. Проверете връзката с базата данни (Supabase) и опитайте отново.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-ink-muted">Код за дневника: {digest}</p>}
      <button type="button" className="btn-primary mt-6" onClick={() => retry()}>Опитай отново</button>
    </div>
  );
}
