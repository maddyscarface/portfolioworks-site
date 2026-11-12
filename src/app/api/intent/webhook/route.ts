/**
 * Intent provider → site webhook. 404 while the intent adapter is disabled (default).
 * When enabled: requires header x-intent-secret = INTENT_WEBHOOK_SECRET, normalizes signals and
 * tags MATCHING existing GHL contacts only (never creates contacts from purchased data).
 */
import { NextResponse, type NextRequest } from "next/server";
import { adapters, intentConfig, intentTags } from "@/lib/intent";
import { ghlMode } from "@/lib/crm/ghl";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const c = intentConfig();
  if (!c.enabled || !c.provider) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const secret = process.env.INTENT_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-intent-secret") !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const signals = adapters[c.provider].parseWebhook(body).slice(0, 500);
  let tagged = 0;
  if (ghlMode() === "live") {
    const h = { Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" };
    for (const sig of signals) {
      if (!sig.email) continue;
      const q = new URLSearchParams({ locationId: process.env.GHL_LOCATION_ID ?? "", email: sig.email });
      const r = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?${q}`, { headers: h }).catch(() => undefined);
      const id = r?.ok ? ((await r.json()) as { contact?: { id: string } }).contact?.id : undefined;
      if (!id) continue;
      const t = await fetch(`https://services.leadconnectorhq.com/contacts/${id}/tags`, { method: "POST", headers: h, body: JSON.stringify({ tags: intentTags(sig) }) }).catch(() => undefined);
      if (t?.ok) tagged++;
    }
  } else {
    console.info(`[intent:log-mode] ${signals.length} signal(s) from ${c.provider}; GHL not live, nothing tagged`);
  }
  return NextResponse.json({ ok: true, received: signals.length, tagged });
}
