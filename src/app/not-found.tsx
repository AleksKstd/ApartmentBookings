import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary, isLocale } from "@/i18n";

export default async function NotFound() {
  const raw = (await headers()).get("x-locale");
  const locale = isLocale(raw) ? raw : "bg";
  const t = getDictionary(locale);
  return (
    <main className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <p className="font-serif text-7xl text-sea-200">404</p>
        <h1 className="mt-4 text-3xl">{t.notFound.title}</h1>
        <Link href={`/${locale}`} className="btn-primary mt-8">
          {t.notFound.back}
        </Link>
      </div>
    </main>
  );
}
