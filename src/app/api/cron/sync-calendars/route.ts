import { NextResponse, type NextRequest } from "next/server";
import { syncAllFeeds } from "@/lib/calendar-sync";
import { getRepository } from "@/lib/data";
import { tokenMatches } from "@/lib/tokens";

/**
 * Scheduled job: imports every active iCal feed and releases expired payment holds.
 * Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !tokenMatches(auth, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expired = await getRepository().expireStaleHolds();
  const feeds = await syncAllFeeds();
  return NextResponse.json({ expiredHolds: expired, feeds });
}
