import { pick } from "@/i18n";
import { shown } from "@/lib/placeholder";
import type { Locale, PropertyInfo } from "@/lib/types";

/** A quiet introduction to the host. Renders nothing until the host's name is filled in (except in demo). */
export function HostCard({ property, locale, demo, title }: { property: PropertyInfo; locale: Locale; demo: boolean; title: string }) {
  const name = shown(property.hostName, demo);
  if (!name) return null;
  const bio = shown(pick(property.hostBio, locale), demo);
  const reply = shown(pick(property.replyTime, locale), demo);
  const initials = name.replace(/[[\]]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <section aria-labelledby="host-title" className="flex flex-col gap-6 sm:flex-row sm:items-start">
      {property.hostPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage
        <img src={property.hostPhotoUrl} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-sea-100 font-serif text-3xl text-sea-800" aria-hidden>
          {initials}
        </span>
      )}
      <div className="max-w-prose">
        <p className="text-sm text-ink-muted">{title}</p>
        <h2 id="host-title" className="text-3xl">{name}</h2>
        {bio && <p className="mt-3 text-lg leading-relaxed text-ink-muted">{bio}</p>}
        {reply && <p className="mt-3 text-ink">{reply}</p>}
      </div>
    </section>
  );
}
