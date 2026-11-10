/**
 * OpenAI Ads (ChatGPT ads) Conversions API — server side only.
 *
 * Endpoint: POST https://bzr.openai.com/v1/events?pid=<PIXEL-ID>, Bearer <API-KEY>.
 * Never import this file from client components: it reads the API key.
 *
 * Dedup with the browser pixel: the event `id` here must equal the pixel's `event_id`, the same
 * Pixel ID must be used on both sides, and the event type must match. OpenAI keeps the first copy.
 *
 * Env:
 *   OPENAI_ADS_PIXEL_ID (falls back to NEXT_PUBLIC_OPENAI_PIXEL_ID; must be the same pixel)
 *   OPENAI_ADS_API_KEY          Conversions API key from Ads Manager → Conversions
 *   OPENAI_ADS_VALIDATE_ONLY    "true" → OpenAI validates events but does not store them (use while testing)
 *   OPENAI_ADS_INTEGRATION_SOURCE  optional label, 1–64 ASCII chars
 *
 * Hashing rules follow developers.openai.com/ads/conversions-api (normalise, then SHA-256 lowercase hex).
 */
import { createHash } from "node:crypto";
import { isIP } from "node:net";

export const OPENAI_EVENTS_URL = "https://bzr.openai.com/v1/events";

export const STANDARD_EVENT_TYPES = [
  "appointment_scheduled", "checkout_started", "contents_viewed", "items_added", "lead_created",
  "order_created", "page_viewed", "registration_completed", "subscription_created", "trial_started",
] as const;
export type StandardEventType = (typeof STANDARD_EVENT_TYPES)[number];
export type OpenAiEventType = StandardEventType | "custom";
export type ActionSource = "web" | "mobile_app" | "offline" | "physical_store" | "phone_call" | "email" | "other";

export type OpenAiUserInput = {
  email?: string | null;
  phone?: string | null;
  /** Used only when the phone has no country code (10 digits for US). */
  defaultCountryCallingCode?: string;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null;
  /** Raw value of the pixel's first-party __obref cookie. Only present when ad consent was granted. */
  obref?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type OpenAiEventInput = {
  id: string;
  type: OpenAiEventType;
  customEventName?: string;
  timestampMs?: number;
  actionSource: ActionSource;
  sourceUrl?: string;
  /** Raw value of the __oppref cookie / ?oppref= landing param. Pass unchanged. */
  oppref?: string | null;
  user?: OpenAiUserInput;
  /** Amount in dollars (converted to cents). */
  value?: number;
  currency?: string;
  /** Extra properties. Only allowed for custom events (data.type = "custom"). */
  properties?: Record<string, string | number | boolean | null>;
};

/* ------------------------------ normalisation ------------------------------ */

export const sha256 = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");

export function normEmail(v?: string | null) {
  const s = v?.trim().toLowerCase();
  return s && s.includes("@") ? s : undefined;
}

/** Country code included; strip spaces ( ) . - then a leading + and leading zeros. Must be 8–15 digits. */
export function normPhone(v?: string | null, defaultCc = "1") {
  if (!v) return undefined;
  let s = v.trim().replace(/[\s().-]/g, "");
  const hadPlus = s.startsWith("+");
  s = s.replace(/^\+/, "").replace(/\D/g, "");
  if (!hadPlus && s.length === 10 && defaultCc === "1") s = `1${s}`;
  else if (!hadPlus && defaultCc !== "1" && s.startsWith("0")) s = `${defaultCc}${s.replace(/^0+/, "")}`;
  s = s.replace(/^0+/, "");
  return s.length >= 8 && s.length <= 15 ? s : undefined;
}

/** Lowercase, drop whitespace and ASCII punctuation, keep accents and non-ASCII letters. */
export function normName(v?: string | null) {
  const s = v?.toLowerCase().replace(/[\s\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g, "");
  return s || undefined;
}

const one = <T,>(v: T | undefined): T[] | undefined => (v === undefined || v === "" ? undefined : [v]);

export function buildUser(u: OpenAiUserInput = {}) {
  const email = normEmail(u.email);
  const phone = normPhone(u.phone, u.defaultCountryCallingCode ?? "1");
  const fn = normName(u.firstName);
  const ln = normName(u.lastName);
  const ext = u.externalId?.trim() || undefined;
  const ip = u.ip && isIP(u.ip.trim()) ? u.ip.trim() : undefined;
  const country = u.country?.trim().toUpperCase();
  const user: Record<string, unknown> = {
    emails_sha256: one(email && sha256(email)),
    phone_numbers_sha256: one(phone && sha256(phone)),
    first_names_sha256: one(fn && sha256(fn)),
    last_names_sha256: one(ln && sha256(ln)),
    external_ids_sha256: one(ext && sha256(ext)),
    obref: u.obref?.trim() || undefined,
    cities: one(u.city?.trim() || undefined),
    regions: one(u.region?.trim() || undefined),
    postal_codes: one(u.postalCode?.trim() || undefined),
    countries: one(country && /^[A-Z]{2}$/.test(country) ? country : undefined),
    ip_address: ip,
    user_agent: u.userAgent?.slice(0, 512) || undefined,
  };
  for (const k of Object.keys(user)) if (user[k] === undefined) delete user[k];
  return Object.keys(user).length ? user : undefined;
}

const CUSTOM_NAME = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

/** Builds one Conversions API event. Throws on inputs OpenAI would reject (so tests catch them). */
export function buildOpenAiEvent(e: OpenAiEventInput, now = Date.now()) {
  if (!e.id) throw new Error("event id required");
  const ts = e.timestampMs ?? now;
  if (ts < now - 7 * 864e5 || ts > now + 10 * 6e4) throw new Error("timestamp_ms must be within the last 7 days");
  if (e.actionSource === "web" && !e.sourceUrl) throw new Error("source_url required for web events");
  let customName: string | undefined;
  if (e.type === "custom") {
    customName = e.customEventName?.toLowerCase();
    if (!customName || !CUSTOM_NAME.test(customName) || (STANDARD_EVENT_TYPES as readonly string[]).includes(customName))
      throw new Error(`invalid custom_event_name: ${e.customEventName}`);
  }
  const cents = e.value !== undefined && Number.isFinite(e.value) && e.value > 0 ? Math.round(e.value * 100) : undefined;
  const data: Record<string, unknown> = { type: e.type === "custom" ? "custom" : "customer_action" };
  if (cents !== undefined) { data.amount = cents; data.currency = (e.currency ?? "USD").toUpperCase(); }
  if (e.type === "custom" && e.properties) {
    for (const [k, v] of Object.entries(e.properties)) if (v !== undefined && !(k in data)) data[k] = v;
  }
  const ev: Record<string, unknown> = {
    id: e.id.slice(0, 200),
    type: e.type,
    timestamp_ms: Math.trunc(ts),
    action_source: e.actionSource,
    data,
  };
  if (customName) ev.custom_event_name = customName;
  if (e.sourceUrl) ev.source_url = e.sourceUrl;
  if (e.oppref) ev.oppref = e.oppref;
  const user = buildUser(e.user);
  if (user) ev.user = user;
  return ev;
}

export function openAiAdsConfig() {
  return {
    pixelId: process.env.OPENAI_ADS_PIXEL_ID || process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID || "",
    apiKey: process.env.OPENAI_ADS_API_KEY || "",
    validateOnly: process.env.OPENAI_ADS_VALIDATE_ONLY === "true",
    integrationSource: (process.env.OPENAI_ADS_INTEGRATION_SOURCE || "").replace(/[^\x20-\x7e]/g, "").slice(0, 64) || undefined,
  };
}

export type OpenAiSendResult = { sent: boolean; skipped?: string; status?: number; error?: string; validateOnly?: boolean };

/** Sends events (≤1000). Never throws: tracking must not break lead capture. */
export async function sendOpenAiEvents(events: OpenAiEventInput[], fetchImpl: typeof fetch = fetch): Promise<OpenAiSendResult> {
  const cfg = openAiAdsConfig();
  if (!cfg.pixelId || !cfg.apiKey) return { sent: false, skipped: "OPENAI_ADS_PIXEL_ID / OPENAI_ADS_API_KEY not set" };
  let built: Record<string, unknown>[];
  try { built = events.slice(0, 1000).map((e) => buildOpenAiEvent(e)); }
  catch (err) { return { sent: false, error: String(err).slice(0, 300) }; }
  const body: Record<string, unknown> = { validate_only: cfg.validateOnly, events: built };
  if (cfg.integrationSource) body.integration_source = cfg.integrationSource;
  try {
    // OPENAI_ADS_ENDPOINT is for local end-to-end tests only (points at a mock). Leave unset in production.
    const endpoint = process.env.OPENAI_ADS_ENDPOINT || OPENAI_EVENTS_URL;
    const r = await fetchImpl(`${endpoint}?pid=${encodeURIComponent(cfg.pixelId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { sent: r.ok, status: r.status, validateOnly: cfg.validateOnly, error: r.ok ? undefined : (await r.text().catch(() => "")).slice(0, 300) };
  } catch (err) {
    return { sent: false, error: String(err).slice(0, 300) };
  }
}

export const sendOpenAiEvent = (e: OpenAiEventInput, f?: typeof fetch) => sendOpenAiEvents([e], f);

/**
 * CRM pipeline stage → OpenAI event. Booked visits use the standard appointment_scheduled
 * event so OpenAI can optimise toward it; later stages are custom events with value.
 */
export function openAiStageEvent(stage: string): { type: OpenAiEventType; customEventName?: string } | null {
  const s = stage.toLowerCase();
  if (/(book|schedul|appointment|walk|consult)/.test(s)) return { type: "appointment_scheduled" };
  if (/qualif/.test(s)) return { type: "custom", customEventName: "qualified_lead" };
  if (/(estimate|proposal|quote)_?sent|sent/.test(s)) return { type: "custom", customEventName: "estimate_sent" };
  if (/(won|signed|contract|closed_won)/.test(s)) return { type: "custom", customEventName: "job_won" };
  if (/(paid|purchase|invoice|complete)/.test(s)) return { type: "custom", customEventName: "job_paid" };
  return null;
}
