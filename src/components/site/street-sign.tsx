import type { HomepageContent } from "@/lib/types";

/** The enamel street plaque: Cyrillic name, Latin line beneath, a note under the sign. */
export function StreetSign({ sign, note }: { sign: HomepageContent["streetSign"]; note: string }) {
  if (!sign.name.trim()) return null;
  return (
    <figure className="w-full max-w-[19rem]">
      <div className="plate -rotate-[1.5deg]" lang="bg">
        <div className="plate-face px-5 pb-4 pt-3.5 text-center">
          <p className="font-display text-[2.5rem] font-extrabold leading-none">{sign.name}</p>
          {sign.latin && (
            <p lang="en" className="mt-1.5 font-display text-base font-bold uppercase tracking-[0.16em] text-sea-100">{sign.latin}</p>
          )}
        </div>
      </div>
      {note && <figcaption className="mt-3 text-center text-sm text-ink-muted">{note}</figcaption>}
    </figure>
  );
}
