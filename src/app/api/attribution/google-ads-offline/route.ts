import { NextResponse, type NextRequest } from "next/server";
import { googleAdsOfflineCsv, listConversions, listRevenue } from "@/lib/attribution/revenue";
import { reportAuth } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Google Ads scheduled upload source (HTTPS). Qualified lead, site walk, contract signed and paid conversions from the last 90 days with a Google click ID (one conversion action per stage, see conversionNameFor). */
export async function GET(req: NextRequest) {
  const a = reportAuth(req);
  if (a !== "ok") return NextResponse.json({ ok: false }, { status: a === "disabled" ? 404 : 401 });
  const cutoff = Date.now() - 90 * 864e5;
  const [rev, conv] = await Promise.all([listRevenue(), listConversions()]);
  const csv = googleAdsOfflineCsv([...rev, ...conv].filter((r) => Date.parse(r.at) >= cutoff).sort((a, b) => a.at.localeCompare(b.at)));
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" } });
}
