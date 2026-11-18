import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary, isLocale } from "@/i18n";

/** Unknown booking reference or wrong access token (HTTP 404). */
export default async function BookingNotFound() {
  const raw = (await headers()).get("x-locale");
  const locale = isLocale(raw) ? raw : "bg";
  const t = getDictionary(locale);
  return (
    <section className="section">
      <div className="container max-w-xl text-center">
        <h1 className="text-3xl">{t.confirmation.notFound}</h1>
        <Link href={`/${locale}/booking`} className="btn-primary mt-8">{t.confirmation.tryAgain}</Link>
      </div>
    </section>
  );
}
