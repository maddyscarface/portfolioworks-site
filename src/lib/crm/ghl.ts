/**
 * GoHighLevel sync for PortfolioWorks (LeadConnector API v2, Private Integration token).
 *
 * Modes (GHL_MODE): "live" sends to GHL; "log" builds the full plan and logs a PII-redacted copy;
 * "off" does nothing. Default = live when GHL_PRIVATE_TOKEN + GHL_LOCATION_ID are set, else log.
 *
 * Duplicate safety:
 *  1. The lead API claims each eventId once (Redis SET NX), so retries never re-sync.
 *  2. Contacts go through /contacts/upsert (GHL matches on email/phone per the location's
 *     duplicate-contact setting) — repeat visitors update one contact.
 *  3. Before creating an opportunity we search for an OPEN one for the same contact in the same
 *     pipeline and update it instead (monetary value never goes down).
 *  4. Tier tags are swapped (old tier tags removed) so score/tier stays a single truth.
 */
import crypto from "node:crypto";
import type { Lead, Score } from "@/lib/leads";
import { ghlContactPayload } from "@/lib/integrations";
import { summarizeTouches } from "@/lib/attribution";
import { getMarket } from "@/config/markets";
import { detailLabel } from "@/config/funnel-fields";
import { entryStageEnv, followUps, ghlPipelines, GHL_COMPANY_TAG, TIER_TAGS, type PipelineKey, type StageKey } from "@/config/ghl";

const API = "https://services.leadconnectorhq.com";
const env = (k: string) => process.env[k]?.trim() || undefined;

export type GhlMode = "live" | "log" | "off";
export function ghlMode(): GhlMode {
  const m = env("GHL_MODE");
  if (m === "off" || m === "log") return m;
  return env("GHL_PRIVATE_TOKEN") && env("GHL_LOCATION_ID") ? "live" : "log";
}

export interface GhlPlan {
  pipeline: PipelineKey;
  pipelineLabel: string;
  pipelineId?: string;
  stageId?: string;
  missingIds: string[];
  contact: ReturnType<typeof ghlContactPayload>;
  opportunity: { name: string; monetaryValue: number; source: string; status: "open" };
  tags: string[];
  removeTags: string[];
  followUps: { id: string; tag: string; workflowId?: string }[];
  note: string;
}

/** Market-specific pipeline (GHL_PIPELINE_MA / _FL / _ME + GHL_STAGE_<MA|FL|ME>_NEW_LEAD) overrides the main one when set. */
function resolvePipeline(pipeline: PipelineKey, s: Score, waitlist = false) {
  const def = ghlPipelines[pipeline];
  void waitlist; // non-launch markets stay in "New inquiry" with the pw-fu:waitlist tag (no waitlist stage in specs/03 §3)
  const m = s.market ? getMarket(s.market) : null;
  if (pipeline === "main" && m && env(m.ghlPipelineEnv)) {
    const code = m.ghlPipelineEnv.replace("GHL_PIPELINE_", "");
    const stageEnv = `GHL_STAGE_${code}_NEW_INQUIRY`;
    return { label: `${def.label} (${m.short})`, pipelineId: env(m.ghlPipelineEnv), stageId: env(stageEnv) || env(`GHL_STAGE_${code}_NEW_LEAD`), envs: [m.ghlPipelineEnv, stageEnv] };
  }
  return { label: def.label, pipelineId: env(def.pipelineEnv), stageId: env(entryStageEnv(pipeline)) || (pipeline === "main" ? env("GHL_STAGE_MAIN_NEW_LEAD") : undefined), envs: [def.pipelineEnv, entryStageEnv(pipeline)] };
}

export function buildGhlPlan(l: Lead, s: Score, pipeline: PipelineKey): GhlPlan {
  const base = ghlContactPayload(l, s);
  const t = summarizeTouches(l.attribution);
  const tierTag = `pw-tier:${s.tier}`;
  const m = s.market ? getMarket(s.market) : null;
  const inMarket = m?.status === "launch";
  const waitlist = Boolean(m) && !inMarket;
  const fuCtx = { tier: s.tier, pipeline, funnel: l.funnel, inMarket, waitlist, hasPhotos: l.photoUrls.length > 0, smsConsent: l.consentSms };
  const fus = followUps.filter((f) => f.when(fuCtx)).map((f) => ({ id: f.id, tag: f.tag, workflowId: env(f.workflowEnv) }));
  const tags = Array.from(new Set([...(base.tags ?? []), GHL_COMPANY_TAG, tierTag, `pw-pipeline:${pipeline}`, `ch:${t.lastChannel}`, ...fus.map((f) => f.tag)]));
  const contact = {
    ...base,
    tags,
    customFields: [
      ...base.customFields,
      { key: "pw_property_addresses", field_value: l.propertyAddress },
      { key: "pw_score_reasons", field_value: s.reasons.join(", ") },
      { key: "pw_pipeline", field_value: pipeline },
      { key: "pw_first_channel", field_value: t.firstChannel },
      { key: "pw_last_channel", field_value: t.lastChannel },
      { key: "pw_first_source", field_value: t.firstSource },
      { key: "pw_last_source", field_value: t.lastSource },
      { key: "pw_last_utm_campaign", field_value: t.lastCampaign },
      { key: "pw_msclkid", field_value: t.clickIds.msclkid ?? "" },
      { key: "pw_gbraid", field_value: t.clickIds.gbraid ?? "" },
      { key: "pw_wbraid", field_value: t.clickIds.wbraid ?? "" },
      { key: "pw_first_touch_at", field_value: String(l.attribution.first_touch_at ?? "") },
      { key: "pw_sms_consent", field_value: l.consentSms ? "yes" : "no" },
      // specs/03 §3 associations: buyer role + operational urgency (company, portfolio, location, counts, source above)
      { key: "pw_buyer_role", field_value: [l.customerType, l.role].filter(Boolean).join(" · ") },
      { key: "pw_urgency", field_value: urgencyOf(l) },
      // specs/03 §2 funnel answers — CRM only (never forwarded to ad or intent platforms)
      ...Object.entries(l.details ?? {}).map(([k, v]) => ({ key: `pw_d_${k}`, field_value: String(v) })),
    ],
  };
  const p = resolvePipeline(pipeline, s, waitlist);
  const missingIds = env("GHL_LOCATION_ID") ? [] : ["GHL_LOCATION_ID"];
  if (!p.pipelineId) missingIds.push(p.envs[0]);
  if (!p.stageId) missingIds.push(p.envs[1]);
  const who = l.company || `${l.firstName} ${l.lastName}`;
  return {
    pipeline,
    pipelineLabel: p.label,
    pipelineId: p.pipelineId,
    stageId: p.stageId,
    missingIds,
    contact,
    opportunity: { name: `${who} — ${l.funnel}${l.propertyAddress ? ` — ${l.propertyAddress}` : ""}`.slice(0, 250), monetaryValue: s.estimatedValue, source: t.lastSource || "website", status: "open" },
    tags,
    removeTags: TIER_TAGS.filter((x) => x !== tierTag),
    followUps: fus,
    note: [
      `Website lead (${l.funnel}) · score ${s.score} (${s.tier}) · ${s.market ?? "out of area"}`,
      `Reasons: ${s.reasons.join(", ")}`,
      `First touch: ${t.firstChannel} (${t.firstSource}) · Last touch: ${t.lastChannel} (${t.lastSource})`,
      `Services: ${l.services.join(", ") || "—"} · Units ${l.units} · Timeline ${l.timeline} · Budget ${l.budget}`,
      ...Object.entries(l.details ?? {}).map(([k, v]) => detailLabel(l.funnel, k, String(v))),
      l.description ? `Notes: ${l.description.slice(0, 1500)}` : "",
      `Event ID: ${l.eventId}`,
    ].filter(Boolean).join("\n"),
  };
}

/** Operational urgency for the coordinator: urgent turnover / ASAP → high. */
export function urgencyOf(l: Lead): "high" | "normal" | "low" {
  if (l.funnel === "urgent" || l.timeline === "asap" || l.timeline === "2-weeks") return "high";
  if (l.timeline === "planning") return "low";
  return "normal";
}

const mask = (v?: string) => (v ? `${v.slice(0, 2)}***#${crypto.createHash("sha256").update(v).digest("hex").slice(0, 8)}` : v);
/** Log-safe copy: names, email, phone and address masked. */
export function redactPlan(p: GhlPlan) {
  const c = p.contact;
  return { ...p, contact: { ...c, firstName: mask(c.firstName), lastName: mask(c.lastName), email: mask(c.email), phone: mask(c.phone), address1: mask(c.address1), customFields: `${c.customFields.length} fields` }, note: `${p.note.split("\n")[0]} …` };
}

const headers = () => ({ Authorization: `Bearer ${env("GHL_PRIVATE_TOKEN")}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" });

/** fetch with retry on 429/5xx (2 retries, exponential backoff). */
async function ghlFetch(path: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  let last: Response | undefined;
  for (let i = 0; i < tries; i++) {
    last = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
    if (last.status !== 429 && last.status < 500) return last;
    await new Promise((r) => setTimeout(r, 400 * 2 ** i));
  }
  return last!;
}

export interface GhlSyncResult {
  ok: boolean;
  mode: GhlMode;
  skipped?: "not-configured" | "off";
  contactId?: string;
  opportunityId?: string;
  opportunity?: "created" | "updated" | "skipped-missing-ids";
  followUps?: string[];
  error?: string;
}

export async function syncLeadToGhl(l: Lead, s: Score, pipeline: PipelineKey): Promise<GhlSyncResult> {
  const mode = ghlMode();
  if (mode === "off") return { ok: false, mode, skipped: "off" };
  const plan = buildGhlPlan(l, s, pipeline);
  if (mode === "log") {
    console.info("[ghl:log-mode] would sync", JSON.stringify(redactPlan(plan)));
    return { ok: false, mode, skipped: "not-configured", followUps: plan.followUps.map((f) => f.id) };
  }
  try {
    // 1. contact upsert (dedup by email/phone in GHL)
    const c = await ghlFetch("/contacts/upsert", { method: "POST", body: JSON.stringify(plan.contact) });
    if (!c.ok) return { ok: false, mode, error: `contact ${c.status}: ${(await c.text()).slice(0, 300)}` };
    const contactId = ((await c.json()) as { contact?: { id: string } }).contact?.id;
    if (!contactId) return { ok: false, mode, error: "contact upsert returned no id" };

    // 2. score/tier: drop stale tier tags (upsert already added the current ones)
    if (plan.removeTags.length) await ghlFetch(`/contacts/${contactId}/tags`, { method: "DELETE", body: JSON.stringify({ tags: plan.removeTags }) }).catch(() => undefined);

    // 3. opportunity: update the open one in this pipeline, else create
    let opportunityId: string | undefined;
    let opportunity: GhlSyncResult["opportunity"] = "skipped-missing-ids";
    if (plan.pipelineId && plan.stageId) {
      const q = new URLSearchParams({ location_id: env("GHL_LOCATION_ID")!, contact_id: contactId, pipeline_id: plan.pipelineId, status: "open" });
      const sr = await ghlFetch(`/opportunities/search?${q}`, { method: "GET" });
      const existing = sr.ok ? (((await sr.json()) as { opportunities?: { id: string; monetaryValue?: number }[] }).opportunities ?? [])[0] : undefined;
      if (existing) {
        const u = await ghlFetch(`/opportunities/${existing.id}`, { method: "PUT", body: JSON.stringify({ name: plan.opportunity.name, monetaryValue: Math.max(existing.monetaryValue ?? 0, plan.opportunity.monetaryValue) }) });
        if (!u.ok) return { ok: false, mode, contactId, error: `opportunity update ${u.status}` };
        opportunityId = existing.id;
        opportunity = "updated";
      } else {
        const o = await ghlFetch("/opportunities/", { method: "POST", body: JSON.stringify({ locationId: env("GHL_LOCATION_ID"), pipelineId: plan.pipelineId, pipelineStageId: plan.stageId, contactId, ...plan.opportunity }) });
        if (!o.ok) return { ok: false, mode, contactId, error: `opportunity ${o.status}` };
        opportunityId = ((await o.json()) as { opportunity?: { id: string } }).opportunity?.id;
        opportunity = "created";
      }
    } else {
      console.warn("[ghl] opportunity skipped; missing", plan.missingIds.join(", "));
    }

    // 4. sales note + 5. follow-up workflows (tag triggers are already on the contact)
    await ghlFetch(`/contacts/${contactId}/notes`, { method: "POST", body: JSON.stringify({ body: plan.note }) }).catch(() => undefined);
    const enrolled: string[] = [];
    for (const f of plan.followUps) {
      if (!f.workflowId) continue;
      const w = await ghlFetch(`/contacts/${contactId}/workflow/${f.workflowId}`, { method: "POST", body: JSON.stringify({}) }).catch(() => undefined);
      if (w?.ok) enrolled.push(f.id);
    }
    return { ok: true, mode, contactId, opportunityId, opportunity, followUps: plan.followUps.map((f) => f.id + (enrolled.includes(f.id) ? ":enrolled" : ":tagged")) };
  } catch (e) {
    return { ok: false, mode, error: (e as Error).message };
  }
}

/** Move an opportunity to a stage (used by CRM webhooks / internal tools). */
export async function moveOpportunityStage(opportunityId: string, pipeline: PipelineKey, stage: StageKey, monetaryValue?: number) {
  if (ghlMode() !== "live") return { ok: false, skipped: "not-configured" as const };
  const stageEnv = ghlPipelines[pipeline].stages[stage];
  if (!stageEnv) return { ok: false, error: `stage ${stage} does not exist in the ${pipeline} pipeline` };
  const stageId = env(stageEnv);
  if (!stageId) return { ok: false, error: `missing ${stageEnv}` };
  const status = stage === "awarded" || stage === "approved_vendor" ? "won" : undefined;
  const r = await ghlFetch(`/opportunities/${opportunityId}`, { method: "PUT", body: JSON.stringify({ pipelineStageId: stageId, ...(status ? { status } : {}), ...(monetaryValue != null ? { monetaryValue } : {}) }) });
  return { ok: r.ok, error: r.ok ? undefined : `stage ${r.status}` };
}

/** Status for /api/health (booleans only). */
export function ghlStatus() {
  const all = Object.values(ghlPipelines).flatMap((p) => [p.pipelineEnv, ...Object.values(p.stages)]) as string[];
  return {
    mode: ghlMode(),
    pipelines: Object.fromEntries(Object.entries(ghlPipelines).map(([k, p]) => [k, Boolean(env(p.pipelineEnv) && env(p.stages[p.entry]!))])),
    stage_ids_set: `${all.filter((k) => env(k)).length}/${all.length}`,
    workflows_set: `${followUps.filter((f) => env(f.workflowEnv)).length}/${followUps.length}`,
  };
}
