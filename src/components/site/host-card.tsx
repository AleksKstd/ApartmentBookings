import { pick } from "@/i18n";
import { shown } from "@/lib/placeholder";
import type { Locale, PropertyInfo } from "@/lib/types";

/** The host, introduced by a name plate. Renders nothing until the host's name is filled in (except in demo). */
export function HostCard({ property, locale, demo }: { property: PropertyInfo; locale: Locale; demo: boolean }) {
  const name = shown(property.hostName, demo);
  if (!name) return null;
  const bio = shown(pick(property.hostBio, locale), demo);
  const reply = shown(pick(property.replyTime, locale), demo);
  return (
    <section aria-labelledby="host-title" className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
      {property.hostPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage
        <img src={property.hostPhotoUrl} alt="" className="h-32 w-32 shrink-0 rounded-[10px] object-cover shadow-plate" />
      )}
      <div className="max-w-prose">
        <h2 id="host-title" className="plate inline-block text-white">
          <span className="plate-face block px-5 py-2.5 text-3xl sm:text-4xl">{name}</span>
        </h2>
        {bio && <p className="mt-5 text-xl leading-relaxed text-ink">{bio}</p>}
        {reply && <p className="mt-3 text-ink-muted">{reply}</p>}
      </div>
    </section>
  );
}
