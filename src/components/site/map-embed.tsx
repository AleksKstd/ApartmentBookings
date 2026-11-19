"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * The OpenStreetMap embed loads only when asked: no third-party request on page load, and no empty
 * white box when the map service is unreachable — the address and the map link are always there.
 */
export function MapEmbed({ src, title, address, showLabel, note }: { src: string; title: string; address: string; showLabel: string; note: string }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return <iframe title={title} className="h-80 w-full rounded-2xl border-0 bg-sand-100 shadow-card" loading="lazy" referrerPolicy="no-referrer" src={src} />;
  }
  return (
    <div className="grid h-80 place-items-center rounded-2xl bg-sand-100 p-6 text-center">
      <div>
        <MapPin className="mx-auto h-8 w-8 text-clay-500" aria-hidden />
        <p className="mt-3 text-ink">{address}</p>
        <button type="button" className="btn-outline mt-5" onClick={() => setOpen(true)}>{showLabel}</button>
        <p className="mt-3 text-xs text-ink-muted">{note}</p>
      </div>
    </div>
  );
}
