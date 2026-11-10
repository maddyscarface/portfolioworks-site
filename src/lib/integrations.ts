/**
 * Integration adapters. Every adapter is a no-op that reports `skipped: "not-configured"`
 * until its credentials are set. NONE of these are connected or validated yet —
 * see docs/18-technical-deployment.md for the credential checklist.
 */
import { qualifierFields, type Qualifiers } from "@/lib/estimate/qualifiers";
import { estimateConfig } from "@/config/estimate";
import crypto from "node:crypto";
import type { Lead, Score } from "@/lib/leads";
import { getMarket } from "@/config/markets";

export type AdapterResult = { ok: boolean; skipped?: "not-configured"; id?: string; error?: string };

const env = (k: string) => process.env[k]?.trim() || undefined;
const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const normPhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `1${d}` : d;
};

export function integrationStatus() {
  return {
    ghl: Boolean(env("GHL_PRIVATE_TOKEN") && env("GHL_LOCATION_ID")),
    metaCapi: Boolean(env("META_PIXEL_ID") && env("META_CAPI_TOKEN")),
    ga4: Boolean(env("GA4_MEASUREMENT_ID") && env("GA4_API_SECRET")),
    upstash: Boolean(env("UPSTASH_REDIS_REST_URL") && env("UPSTASH_REDIS_REST_TOKEN")),
    turnstile: Boolean(env("TURNSTILE_SECRET_KEY")),
    gtm: Boolean(env("NEXT_PUBLIC_GTM_ID")),
  };
}

/* ───── Storage: Upstash Redis REST, with in-memory fallback for local/dev ───── */
const mem = new Map<string, string>();
export const kvConfigured = () => Boolean(env("UPSTASH_REDIS_REST_URL") && env("UPSTASH_REDIS_REST_TOKEN"));
/**
 * Production guard: never keep leads in process memory on a live site (lost on every serverless
 * recycle, not shared between instances). Set LEAD_ALLOW_MEMORY_STORE=1 only for local/sandbox tests.
 */
export const memoryStoreBlocked = () =>
  process.env.NODE_ENV === "production" && !kvConfigured() && process.env.LEAD_ALLOW_MEMORY_STORE !== "1";
async function redis(cmd: (string | number)[]): Promise<unknown> {
  const url = env("UPSTASH_REDIS_REST_URL");
  const token = env("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) {
    const [op, key, val, ...rest] = cmd as string[];
    if (op === "SET") {
      if (rest.includes("NX") && mem.has(key)) return null;
      mem.set(key, String(val));
      return "OK";
    }
    if (op === "GET") return mem.get(key) ?? null;
    if (op === "INCR") {
      const n = Number(mem.get(key) ?? 0) + 1;
      mem.set(key, String(n));
      return n;
    }
    if (op === "LPUSH") {
      const arr = JSON.parse(mem.get(key) ?? "[]");
      arr.unshift(val);
      mem.set(key, JSON.stringify(arr));
      return arr.length;
    }
    if (op === "LRANGE") return JSON.parse(mem.get(key) ?? "[]");
    return null;
  }
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(cmd) });
  const j = (await r.json()) as { result?: unknown; error?: string };
  if (j.error) throw new Error(j.error);
  return j.result;
}

export async function rateLimit(ip: string, limit = 8, windowSec = 600): Promise<boolean> {
  const key = `rl:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = Number(await redis(["INCR", key]));
  if (n === 1 && integrationStatus().upstash) await redis(["EXPIRE", key, windowSec]);
  return n <= limit;
}

/** Returns false if this eventId was already processed (idempotency). */
export async function claimEvent(eventId: string): Promise<boolean> {
  const r = await redis(["SET", `evt:${eventId}`, "1", "NX", "EX", 60 * 60 * 24 * 7]);
  return r === "OK";
}

export async function storeLead(record: Record<string, unknown>) {
  await redis(["LPUSH", "leads", JSON.stringify(record)]);
  await redis(["SET", `lead:${record.eventId}`, JSON.stringify(record)]);
}

export async function listLeads(): Promise<Record<string, unknown>[]> {
  const raw = (await redis(["LRANGE", "leads", 0, 199])) as string[];
  return (raw ?? []).map((s) => JSON.parse(s));
}

export async function getLead(eventId: string) {
  const raw = (await redis(["GET", `lead:${eventId}`])) as string | null;
  return raw ? JSON.parse(raw) : null;
}

/* ───── Cloudflare Turnstile ───── */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not configured → rely on honeypot + timing + rate limit
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  return ((await r.json()) as { success: boolean }).success;
}

/* ───── GoHighLevel (API v2, Private Integration token) ───── */
const GHL = "https://services.leadconnectorhq.com";
const ghlHeaders = () => ({
  Authorization: `Bearer ${env("GHL_PRIVATE_TOKEN")}`,
  Version: "2021-07-28",
  "Content-Type": "application/json",
  Accept: "application/json",
});

/** Custom field keys must match the fields created in docs/11-gohighlevel-crm.md */
export function ghlContactPayload(l: Lead, s: Score) {
  const m = s.market ? getMarket(s.market) : null;
  return {
    locationId: env("GHL_LOCATION_ID"),
    firstName: l.firstName,
    lastName: l.lastName,
    email: l.email,
    phone: l.phone,
    companyName: l.company || undefined,
    postalCode: l.zip,
    address1: l.propertyAddress || undefined,
    source: l.attribution.utm_source ? `${l.attribution.utm_source}/${l.attribution.utm_medium ?? ""}` : "website",
    tags: [
      `funnel:${l.funnel}`,
      `type:${l.customerType}`,
      `tier:${s.tier}`,
      s.market ? `market:${s.market}` : "market:out-of-area",
      ...l.services.map((x) => `svc:${x}`),
      ...(l.consentSms ? ["sms-consent"] : []),
    ],
    customFields: [
      { key: "pw_customer_type", field_value: l.customerType },
      { key: "pw_contact_role", field_value: l.role },
      { key: "pw_units", field_value: l.units },
      { key: "pw_properties", field_value: l.properties },
      { key: "pw_trade_needs", field_value: l.services.join(", ") },
      { key: "pw_delivery_mode", field_value: l.deliveryMode },
      { key: "pw_priority", field_value: s.tier },
      { key: "pw_lead_score", field_value: s.score },
      { key: "pw_budget", field_value: l.budget },
      { key: "pw_timeline", field_value: l.timeline },
      { key: "pw_contract_type", field_value: l.contractType },
      { key: "pw_est_project_value", field_value: s.estimatedValue },
      { key: "pw_market", field_value: s.market ?? "out-of-area" },
      { key: "pw_sales_territory", field_value: m?.salesTerritory ?? "" },
      { key: "pw_move_out", field_value: l.moveOutDate },
      { key: "pw_target_move_in", field_value: l.targetMoveIn },
      { key: "pw_photo_urls", field_value: l.photoUrls.join("\n") },
      { key: "pw_event_id", field_value: l.eventId },
      { key: "pw_gclid", field_value: l.attribution.gclid ?? "" },
      { key: "pw_fbclid", field_value: l.attribution.fbclid ?? "" },
      { key: "pw_utm_campaign", field_value: l.attribution.utm_campaign ?? "" },
      { key: "pw_landing_page", field_value: l.attribution.landing_page ?? "" },
      { key: "pw_ga_client_id", field_value: l.attribution.ga_client_id ?? "" },
      { key: "pw_description", field_value: l.description },
      { key: "pw_openai_obref", field_value: l.attribution.openai_obref ?? "" },
      { key: "pw_openai_oppref", field_value: l.attribution.openai_oppref ?? "" },
      // Pre-estimate answers (budget fit, typical range, offer guidance, visit time…) → pw_est_* fields.
      ...Object.entries(qualifierFields(estimateConfig, l.qualifiers as Qualifiers | undefined)).map(([k, v]) => ({ key: `pw_${k}`, field_value: v ?? "" })),
    ],
  };
}

export async function pushToGhl(l: Lead, s: Score, pipeline: "main" | "partnership"): Promise<AdapterResult> {
  if (!integrationStatus().ghl) return { ok: false, skipped: "not-configured" };
  try {
    const c = await fetch(`${GHL}/contacts/upsert`, { method: "POST", headers: ghlHeaders(), body: JSON.stringify(ghlContactPayload(l, s)) });
    if (!c.ok) return { ok: false, error: `contact ${c.status}: ${await c.text()}` };
    const contactId = ((await c.json()) as { contact?: { id: string } }).contact?.id;
    const pipelineId = pipeline === "partnership" ? env("GHL_PIPELINE_PARTNERSHIP") : env("GHL_PIPELINE_MAIN");
    const stageId = pipeline === "partnership" ? env("GHL_STAGE_PARTNERSHIP_PROSPECT") : env("GHL_STAGE_MAIN_NEW_LEAD");
    if (contactId && pipelineId && stageId) {
      const o = await fetch(`${GHL}/opportunities/`, {
        method: "POST",
        headers: ghlHeaders(),
        body: JSON.stringify({
          locationId: env("GHL_LOCATION_ID"),
          pipelineId,
          pipelineStageId: stageId,
          contactId,
          name: `${l.company || `${l.firstName} ${l.lastName}`} — ${l.funnel}${l.propertyAddress ? ` — ${l.propertyAddress}` : ""}`,
          status: "open",
          monetaryValue: s.estimatedValue,
          source: l.attribution.utm_source ?? "website",
        }),
      });
      if (!o.ok) return { ok: false, id: contactId, error: `opportunity ${o.status}` };
    }
    return { ok: true, id: contactId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ───── Meta Conversions API ───── */
export async function sendMetaEvent(opts: {
  eventName: "Lead" | "Schedule" | "CompleteRegistration" | "Purchase" | string;
  eventId: string;
  email?: string;
  phone?: string;
  zip?: string;
  fbc?: string;
  fbp?: string;
  ip?: string;
  ua?: string;
  url?: string;
  value?: number;
  custom?: Record<string, unknown>;
}): Promise<AdapterResult> {
  if (!integrationStatus().metaCapi) return { ok: false, skipped: "not-configured" };
  const user_data: Record<string, unknown> = {
    em: opts.email ? [sha256(opts.email)] : undefined,
    ph: opts.phone ? [sha256(normPhone(opts.phone))] : undefined,
    zp: opts.zip ? [sha256(opts.zip)] : undefined,
    fbc: opts.fbc,
    fbp: opts.fbp,
    client_ip_address: opts.ip,
    client_user_agent: opts.ua,
  };
  const body = {
    data: [
      {
        event_name: opts.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId, // same id as browser pixel → deduplication
        action_source: opts.url ? "website" : "system_generated",
        event_source_url: opts.url,
        user_data,
        custom_data: { currency: "USD", value: opts.value, ...opts.custom },
      },
    ],
    ...(env("META_TEST_EVENT_CODE") ? { test_event_code: env("META_TEST_EVENT_CODE") } : {}),
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${env("META_PIXEL_ID")}/events?access_token=${env("META_CAPI_TOKEN")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok ? { ok: true } : { ok: false, error: `meta ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ───── GA4 Measurement Protocol (server-side stage events) ───── */
export async function sendGa4Event(clientId: string, name: string, params: Record<string, unknown>): Promise<AdapterResult> {
  if (!integrationStatus().ga4) return { ok: false, skipped: "not-configured" };
  try {
    const r = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${env("GA4_MEASUREMENT_ID")}&api_secret=${env("GA4_API_SECRET")}`,
      { method: "POST", body: JSON.stringify({ client_id: clientId, events: [{ name, params }] }) },
    );
    return r.ok ? { ok: true } : { ok: false, error: `ga4 ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
