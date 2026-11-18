"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { getDictionary, isLocale } from "@/i18n";

export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params?.locale) ? params.locale : "bg";
  const t = getDictionary(locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="section">
      <div className="container max-w-xl text-center" role="alert">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700">
          <TriangleAlert className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-3xl">{t.errorPage.title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{t.errorPage.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => retry()}>{t.errorPage.retry}</button>
          <Link href={`/${locale}`} className="btn-outline">{t.notFound.back}</Link>
        </div>
      </div>
    </section>
  );
}
