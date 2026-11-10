import { NextResponse, type NextRequest } from "next/server";
import { leadSchema, scoreLead, pipelineFor } from "@/lib/leads";
import { memoryStoreBlocked, claimEvent, pushToGhl, rateLimit, sendMetaEvent, storeLead, verifyTurnstile } from "@/lib/integrations";
import { sendOpenAiEvent } from "@/lib/openai-ads/server";
import { budgetFit, qualifierScore, sanitizeQualifiers } from "@/lib/estimate/qualifiers";
import { renderLeadBrief, sendLeadBrief } from "@/lib/estimate/lead-brief";
import { briefTheme, estimateConfig } from "@/config/estimate";
import { site } from "@/config/site";

export const runtime = "nodejs";

const MIN_FILL_MS = 2500;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ua = req.headers.get("user-agent") ?? "";

  if (memoryStoreBlocked()) {
    console.error("[lead] Upstash not configured in production — refusing to keep leads in memory");
    return NextResponse.json({ ok: false, error: "Our form is temporarily unavailable. Please call or email us instead." }, { status: 503 });
  }
  if (!(await rateLimit(ip))) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const lead = parsed.data;

  // Silent spam handling: honeypot or implausibly fast submit → pretend success, store nothing.
  if (lead.website || (lead.startedAt && Date.now() - lead.startedAt < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true, eventId: lead.eventId });
  }
  if (!(await verifyTurnstile(lead.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 403 });
  }

  // Idempotency: a retried/double-clicked submit with the same eventId is accepted once.
  if (!(await claimEvent(lead.eventId))) return NextResponse.json({ ok: true, eventId: lead.eventId, duplicate: true });

  const q = sanitizeQualifiers(estimateConfig, lead.qualifiers);
  lead.qualifiers = q;
  const score = scoreLead(lead);
  const qPts = qualifierScore(estimateConfig, q);
  if (qPts) {
    score.score = Math.max(0, Math.min(100, score.score + qPts));
    score.reasons.push(`qualifiers:${qPts > 0 ? "+" : ""}${qPts}`);
    score.tier = score.score >= 60 ? "hot" : score.score >= 35 ? "warm" : "nurture";
  }
  const fit = q ? budgetFit(estimateConfig, q) : undefined;
  if (fit?.fit && fit.fit !== "unknown") score.reasons.push(`budget_fit:${fit.fit}`);
  const pipeline = pipelineFor(lead);
  const { turnstileToken: _t, website: _w, ...clean } = lead;
  void _t;
  void _w;
  const record = { ...clean, score, pipeline, receivedAt: new Date().toISOString(), ip };
  await storeLead(record);

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
  const [ghl, meta, openai, brief] = await Promise.all([
    pushToGhl(lead, score, pipeline),
    sendMetaEvent({
      eventName: "Lead",
      eventId: lead.eventId,
      email: lead.email,
      phone: lead.phone,
      zip: lead.zip,
      fbc: lead.attribution.fbc,
      fbp: lead.attribution.fbp,
      ip,
      ua,
      url: lead.attribution.landing_page,
      custom: { funnel: lead.funnel, customer_type: lead.customerType, market: score.market ?? "out-of-area" },
    }),
    // OpenAI Ads Conversions API (opt-in site: only with ad consent). id = pixel event_id → deduplicated.
    lead.adsConsent
      ? sendOpenAiEvent({
          id: lead.eventId, type: "lead_created", actionSource: "web",
          sourceUrl: req.headers.get("referer") || `${origin}${lead.attribution.landing_page ?? "/"}`,
          oppref: lead.attribution.openai_oppref,
          user: { email: lead.email, phone: lead.phone, firstName: lead.firstName, lastName: lead.lastName, externalId: lead.eventId, obref: lead.attribution.openai_obref, postalCode: lead.zip, country: "US", ip, userAgent: ua },
        })
      : Promise.resolve({ sent: false, skipped: "no ad consent" }),
    lead.funnel === "contact"
      ? Promise.resolve({ sent: false, reason: "contact form" })
      : sendLeadBrief(renderLeadBrief({
          cfg: estimateConfig, theme: briefTheme,
          heading: lead.funnel === "portfolio" ? "New portfolio partnership request" : lead.funnel === "urgent" ? "Urgent turnover request" : "New walkthrough request",
          name: `${lead.firstName} ${lead.lastName}`, phone: lead.phone, email: lead.email,
          location: [lead.propertyAddress, lead.zip].filter(Boolean).join(", "), q,
          details: [
            ["Customer", `${lead.customerType}${lead.company ? ` · ${lead.company}` : ""}${lead.role ? ` (${lead.role})` : ""}`],
            ["Units / properties", `${lead.units} unit(s) · ${lead.properties} property(ies)`],
            ["Services", lead.services.join(", ") || undefined],
            ["Delivery", lead.deliveryMode], ["Engagement", lead.contractType],
            ["Move-out → move-in", lead.moveOutDate || lead.targetMoveIn ? `${lead.moveOutDate || "?"} → ${lead.targetMoveIn || "?"}` : undefined],
            ["Market", score.market ?? "OUT OF AREA"], ["Notes", lead.description || undefined],
          ],
          photoUrls: lead.photoUrls, score: `${score.score} (${score.tier})`,
          source: [lead.attribution.utm_source, lead.attribution.utm_medium, lead.attribution.utm_campaign].filter(Boolean).join(" / ") || "direct",
          adminUrl: `${origin}/admin`,
        }), { to: process.env.LEAD_BRIEF_TO, from: process.env.LEAD_BRIEF_FROM, replyTo: lead.email }),
  ]);

  return NextResponse.json({
    ok: true,
    eventId: lead.eventId,
    tier: score.tier,
    market: score.market,
    integrations: {
      ghl: ghl.skipped ?? (ghl.ok ? "ok" : "error"), meta: meta.skipped ?? (meta.ok ? "ok" : "error"),
      openai: openai.skipped ? "skipped" : openai.sent ? "ok" : "error", brief: brief.sent ? "ok" : "skipped",
    },
  });
}
