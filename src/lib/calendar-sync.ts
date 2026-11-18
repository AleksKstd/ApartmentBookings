import "server-only";
import { getRepository } from "@/lib/data";
import { todayAtProperty } from "@/lib/dates";
import { parseIcal } from "@/lib/ical";
import { assertPublicHttpsUrl, safeFetchText } from "@/lib/net-guard";
import type { CalendarFeed } from "@/lib/types";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** Synchronous URL check used when a feed is saved (DNS is checked again on every fetch). */
export function validateFeedUrl(raw: string): URL {
  return assertPublicHttpsUrl(raw);
}

async function fetchFeed(url: URL): Promise<string> {
  const body = await safeFetchText(url.toString(), {
    maxBytes: MAX_FEED_BYTES,
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "ApartmentBookings-CalendarSync/1.0" },
  });
  if (!body.includes("BEGIN:VCALENDAR")) throw new Error("Отговорът не е iCal календар.");
  return body;
}

/** Turns low-level fetch failures into a message the (Bulgarian-speaking) owner can act on. */
function describeSyncError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") return "Сървърът на календара не отговори навреме.";
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Адресът на календара не може да бъде намерен.";
    if (error.message === "fetch failed") return "Календарът не може да бъде изтеглен.";
    return error.message;
  }
  return String(error);
}

export async function syncFeed(feed: CalendarFeed): Promise<{ ok: boolean; count: number; error?: string }> {
  const repo = getRepository();
  const now = new Date().toISOString();
  try {
    const text = await fetchFeed(validateFeedUrl(feed.url));
    const today = todayAtProperty();
    const events = parseIcal(text).filter((e) => e.end > today);
    await repo.replaceFeedRanges(
      feed.id,
      events.map((e) => ({
        startDate: e.start,
        endDate: e.end,
        reason: `${feed.name}${e.summary ? `: ${e.summary}` : ""}`.slice(0, 200),
        source: "ical" as const,
        feedId: feed.id,
        externalUid: e.uid.slice(0, 255),
      })),
    );
    await repo.updateFeedStatus(feed.id, { lastSyncedAt: now, lastError: null, lastEventCount: events.length });
    return { ok: true, count: events.length };
  } catch (error) {
    // Keep the previously imported ranges on failure: stale blocks are safer than none.
    const message = describeSyncError(error);
    await repo.updateFeedStatus(feed.id, { lastSyncedAt: now, lastError: message.slice(0, 500), lastEventCount: feed.lastEventCount });
    return { ok: false, count: 0, error: message };
  }
}

export async function syncAllFeeds() {
  const feeds = (await getRepository().listFeeds()).filter((f) => f.isActive);
  const results = [];
  for (const feed of feeds) results.push({ feed: feed.name, ...(await syncFeed(feed)) });
  return results;
}
