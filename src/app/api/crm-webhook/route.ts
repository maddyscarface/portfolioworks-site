/**
 * GoHighLevel → website webhook for offline conversion events + revenue attribution.
 *
 * Configure a GHL workflow ("Opportunity stage changed") to POST here with header
 * `x-pw-webhook-secret: $CRM_WEBHOOK_SECRET` and body:
 *   { "eventId": "...", "stage": "qualified_lead" | "site_walk_booked" | "proposal_sent" | "contract_signed" | "purchase" | "lost",
 *     "value": 12500, "email": "...", "phone": "...", "gaClientId": "...", "gclid": "..." }
 *
 * Phase 2: each (eventId, stage) is processed ONCE (GHL retries are acknowledged, not re-sent), and
 * won/paid stages are written to the revenue ledger with first/last-touch attribution
 * (/api/attribution/summary, Google Ads offline CSV at /api/attribution/google-ads-offline).
 */
import { NextResponse, type NextRequest } from "next/server";
import { claimEvent, getLead, sendGa4Event, sendMetaEvent } from "@/lib/integrations";
import { openAiStageEvent, sendOpenAiEvent } from "@/lib/openai-ads/server";
import { buildRevenueRecord, recordRevenue, REVENUE_STAGES } from "@/lib/attribution/revenue";

export const runtime = "nodejs";

const STAGE_TO_META: Record<string, string> = {
  qualified_lead: "QualifiedLead",
  site_walk_booked: "Schedule",
  proposal_sent: "ProposalSent",
  contract_signed: "ContractSigned",
  purchase: "Purchase",
  lost: "",
};

export async function POST(req: NextRequest) {
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-pw-webhook-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let b: { eventId?: string; stage?: string; value?: number | string; email?: string; phone?: string; gaClientId?: string; gclid?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!b.stage || !(b.stage in STAGE_TO_META)) return NextResponse.json({ ok: false, error: "unknown stage" }, { status: 400 });
  const value = b.value != null && b.value !== "" ? Number(b.value) : undefined;
  if (value != null && (!Number.isFinite(value) || value < 0)) return NextResponse.json({ ok: false, error: "invalid value" }, { status: 400 });

  const stageEventId = `${b.eventId ?? "crm"}:${b.stage}`;
  // Duplicate-safe: GHL can re-fire a workflow. Only the first delivery sends conversions.
  if (b.eventId && !(await claimEvent(`stage:${stageEventId}`))) return NextResponse.json({ ok: true, duplicate: true });
  if (b.stage === "lost") return NextResponse.json({ ok: true, recorded: "lost" });

  const lead = b.eventId ? await getLead(b.eventId) : null;
  const attribution = { ...(lead?.attribution ?? {}), ...(b.gclid ? { gclid: b.gclid } : {}) };
  const revenue = REVENUE_STAGES.has(b.stage) && b.eventId && value ? buildRevenueRecord(b.eventId, b.stage, value, attribution) : null;
  const oa = openAiStageEvent(b.stage);
  const [meta, ga4, openai, ledger] = await Promise.all([
    sendMetaEvent({
      eventName: STAGE_TO_META[b.stage],
      eventId: stageEventId,
      email: b.email ?? lead?.email,
      phone: b.phone ?? lead?.phone,
      zip: lead?.zip,
      fbc: lead?.attribution?.fbc,
      value,
    }),
    (b.gaClientId ?? lead?.attribution?.ga_client_id)
      ? sendGa4Event(b.gaClientId ?? lead.attribution.ga_client_id, b.stage === "purchase" || b.stage === "contract_signed" ? "purchase" : b.stage, { value, currency: "USD", transaction_id: stageEventId, crm_stage: b.stage })
      : Promise.resolve({ ok: false, skipped: "not-configured" as const }),
    // OpenAI Ads: site_walk_booked → appointment_scheduled; other stages → custom events with value.
    oa && (lead?.adsConsent ?? true)
      ? sendOpenAiEvent({
          id: stageEventId, type: oa.type, customEventName: oa.customEventName, actionSource: "offline", value,
          oppref: lead?.attribution?.openai_oppref, properties: oa.type === "custom" ? { stage: b.stage } : undefined,
          user: { email: b.email ?? lead?.email, phone: b.phone ?? lead?.phone, firstName: lead?.firstName, lastName: lead?.lastName, postalCode: lead?.zip, externalId: b.eventId, obref: lead?.attribution?.openai_obref, country: "US" },
        })
      : Promise.resolve({ sent: false, skipped: oa ? "no ad consent" : "no mapping" }),
    revenue ? recordRevenue(revenue) : Promise.resolve(false),
  ]);
  return NextResponse.json({ ok: true, meta, ga4, openai, revenue: revenue ? { recorded: ledger, firstChannel: revenue.firstChannel, lastChannel: revenue.lastChannel } : null });
}
