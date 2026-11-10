/**
 * GoHighLevel → website webhook for offline conversion events.
 *
 * Configure a GHL workflow ("Opportunity stage changed") to POST here with header
 * `x-pw-webhook-secret: $CRM_WEBHOOK_SECRET` and body:
 *   { "eventId": "...", "stage": "qualified_lead" | "site_walk_booked" | "proposal_sent" | "contract_signed" | "purchase",
 *     "value": 12500, "email": "...", "phone": "...", "gaClientId": "..." }
 *
 * Fires Meta CAPI (system_generated) + GA4 MP. Google Ads offline conversion import
 * uses the gclid stored on the contact — see docs/14-tracking-attribution.md.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getLead, sendGa4Event, sendMetaEvent } from "@/lib/integrations";
import { openAiStageEvent, sendOpenAiEvent } from "@/lib/openai-ads/server";

const STAGE_TO_META: Record<string, string> = {
  qualified_lead: "QualifiedLead",
  site_walk_booked: "Schedule",
  proposal_sent: "ProposalSent",
  contract_signed: "ContractSigned",
  purchase: "Purchase",
};

export async function POST(req: NextRequest) {
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-pw-webhook-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const b = (await req.json()) as { eventId?: string; stage?: string; value?: number; email?: string; phone?: string; gaClientId?: string };
  if (!b.stage || !STAGE_TO_META[b.stage]) return NextResponse.json({ ok: false, error: "unknown stage" }, { status: 400 });
  const lead = b.eventId ? await getLead(b.eventId) : null;
  const stageEventId = `${b.eventId ?? "crm"}:${b.stage}`;
  const oa = openAiStageEvent(b.stage);
  const [meta, ga4, openai] = await Promise.all([
    sendMetaEvent({
      eventName: STAGE_TO_META[b.stage],
      eventId: stageEventId,
      email: b.email ?? lead?.email,
      phone: b.phone ?? lead?.phone,
      zip: lead?.zip,
      fbc: lead?.attribution?.fbc,
      value: b.value,
    }),
    (b.gaClientId ?? lead?.attribution?.ga_client_id) ? sendGa4Event(b.gaClientId ?? lead.attribution.ga_client_id, b.stage, { value: b.value, currency: "USD" }) : Promise.resolve({ ok: false, skipped: "not-configured" as const }),
    // OpenAI Ads: site_walk_booked → appointment_scheduled; other stages → custom events with value.
    oa && (lead?.adsConsent ?? true)
      ? sendOpenAiEvent({
          id: stageEventId, type: oa.type, customEventName: oa.customEventName, actionSource: "offline", value: b.value,
          oppref: lead?.attribution?.openai_oppref, properties: oa.type === "custom" ? { stage: b.stage } : undefined,
          user: { email: b.email ?? lead?.email, phone: b.phone ?? lead?.phone, firstName: lead?.firstName, lastName: lead?.lastName, postalCode: lead?.zip, externalId: b.eventId, obref: lead?.attribution?.openai_obref, country: "US" },
        })
      : Promise.resolve({ sent: false, skipped: oa ? "no ad consent" : "no mapping" }),
  ]);
  return NextResponse.json({ ok: true, meta, ga4, openai });
}
