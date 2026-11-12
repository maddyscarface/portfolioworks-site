/**
 * Revenue attribution. When GHL reports a won/paid stage (via /api/crm-webhook) we store one
 * revenue record per (eventId, stage) with the lead's first- and last-touch attribution and click IDs.
 * Used for: the attribution summary endpoint, and the Google Ads offline-conversion CSV that Google
 * Ads can fetch on a schedule (Tools → Conversions → Uploads → Schedule → HTTPS).
 */
import { redis } from "@/lib/integrations";
import { summarizeTouches, type Attribution, type Channel } from "@/lib/attribution";

export const REVENUE_STAGES = new Set(["contract_signed", "purchase"]);
/** docs/11 event map: stages that go to Google Ads as offline conversions (value only on contract_signed / purchase). */
export const OFFLINE_STAGES = new Set(["qualified_lead", "site_walk_booked", "contract_signed", "purchase"]);
const DEFAULT_CONVERSION_NAMES: Record<string, string> = {
  qualified_lead: "PortfolioWorks - Qualified Lead",
  site_walk_booked: "PortfolioWorks - Site Walk Booked",
  contract_signed: "PortfolioWorks - Contract Signed",
  purchase: "PortfolioWorks - Paid",
};
/** Conversion action name per stage. Override with GOOGLE_ADS_CONV_<STAGE> (e.g. GOOGLE_ADS_CONV_QUALIFIED_LEAD). */
export function conversionNameFor(stage: string) {
  const override = process.env[`GOOGLE_ADS_CONV_${stage.toUpperCase()}`] || (stage === "contract_signed" ? process.env.GOOGLE_ADS_OFFLINE_CONVERSION_NAME : undefined);
  return override || DEFAULT_CONVERSION_NAMES[stage] || `PortfolioWorks - ${stage}`;
}

export interface RevenueRecord {
  id: string; // `${eventId}:${stage}`
  eventId: string;
  stage: string;
  value: number;
  currency: "USD";
  at: string; // ISO
  firstChannel: Channel;
  lastChannel: Channel;
  firstSource: string;
  lastSource: string;
  campaign: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
}

export function buildRevenueRecord(eventId: string, stage: string, value: number, attribution: Attribution = {}, at = new Date()): RevenueRecord {
  const t = summarizeTouches(attribution);
  return {
    id: `${eventId}:${stage}`, eventId, stage, value: Math.max(0, Math.round(value * 100) / 100), currency: "USD", at: at.toISOString(),
    firstChannel: t.firstChannel, lastChannel: t.lastChannel, firstSource: t.firstSource, lastSource: t.lastSource, campaign: t.lastCampaign || t.firstCampaign,
    ...t.clickIds,
  };
}

/** Revenue stages with a value go to the "revenue" ledger; other offline stages to "conversions". Idempotent per id. */
export async function recordRevenue(r: RevenueRecord) {
  const fresh = await redis(["SET", `rev:${r.id}`, JSON.stringify(r), "NX"]);
  if (fresh !== "OK") return false; // already recorded (webhook retry)
  await redis(["LPUSH", REVENUE_STAGES.has(r.stage) && r.value > 0 ? "revenue" : "conversions", JSON.stringify(r)]);
  return true;
}

/** Non-revenue offline conversions (qualified_lead, site_walk_booked, or won stages reported without a value). */
export async function listConversions(limit = 1000): Promise<RevenueRecord[]> {
  const raw = (await redis(["LRANGE", "conversions", 0, limit - 1])) as string[] | null;
  return (raw ?? []).map((x) => JSON.parse(x));
}

export async function listRevenue(limit = 1000): Promise<RevenueRecord[]> {
  const raw = (await redis(["LRANGE", "revenue", 0, limit - 1])) as string[] | null;
  return (raw ?? []).map((x) => JSON.parse(x));
}

export function summarize(records: RevenueRecord[]) {
  const by = (k: "firstChannel" | "lastChannel" | "campaign") =>
    Object.entries(records.reduce<Record<string, { revenue: number; deals: number }>>((acc, r) => {
      const key = String(r[k] || "(none)");
      acc[key] ??= { revenue: 0, deals: 0 };
      acc[key].revenue += r.value;
      acc[key].deals += 1;
      return acc;
    }, {})).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue);
  return { total: records.reduce((s, r) => s + r.value, 0), deals: records.length, byFirstTouch: by("firstChannel"), byLastTouch: by("lastChannel"), byCampaign: by("campaign") };
}

/** Google Ads offline conversion import CSV (click-based). Conversion name must match the action created in Google Ads. */
export function googleAdsOfflineCsv(records: RevenueRecord[], conversionName?: string) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+0000`;
  };
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = records.filter((r) => (r.gclid || r.gbraid || r.wbraid) && OFFLINE_STAGES.has(r.stage));
  return [
    "Parameters:TimeZone=+0000",
    "Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID",
    ...rows.map((r) => [r.gclid ?? "", r.gbraid ?? "", r.wbraid ?? "", conversionName ?? conversionNameFor(r.stage), fmt(r.at), r.value > 0 ? String(r.value) : "", r.currency, r.id].map(esc).join(",")),
  ].join("\n");
}
