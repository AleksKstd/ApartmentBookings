import "server-only";
import { getRepository } from "@/lib/data";
import { todayAtProperty } from "@/lib/dates";
import { parseIcal } from "@/lib/ical";
import type { CalendarFeed } from "@/lib/types";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

export function validateFeedUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Feed URL must use https://");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\])/i.test(url.hostname)) {
    throw new Error("Feed URL must point to a public host");
  }
  return url;
}

async function fetchFeed(url: URL): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "ApartmentBookings-CalendarSync/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_FEED_BYTES) throw new Error("Feed is too large");
  const body = await res.text();
  if (body.length > MAX_FEED_BYTES) throw new Error("Feed is too large");
  if (!body.includes("BEGIN:VCALENDAR")) throw new Error("Response is not an iCalendar feed");
  return body;
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
    const message = error instanceof Error ? error.message : String(error);
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
