import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { getRepository, isDemoMode } from "@/lib/data";

/** Everything the public pages render, loaded once per request. Always dynamic (admin-editable). */
export const getSiteData = cache(async () => {
  await connection();
  const repo = getRepository();
  const [settings, media, seasons] = await Promise.all([repo.getSettings(), repo.listMedia(), repo.listSeasonalRates()]);
  const p = settings.pricing;
  const lowestNightly = Math.min(
    p.baseNightly,
    p.weekendNightly ?? Number.POSITIVE_INFINITY,
    ...seasons.map((s) => s.nightly),
  );
  return {
    ...settings,
    media,
    seasons,
    carousel: media.filter((m) => m.inCarousel),
    gallery: media.filter((m) => m.inGallery),
    lowestNightly,
    demo: isDemoMode(),
  };
});
