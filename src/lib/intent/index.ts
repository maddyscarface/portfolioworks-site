/**
 * Intent-data / visitor-identification adapter (DataMoon or AudienceLab). DISABLED BY DEFAULT.
 *
 * Turn on only after the owner has (1) signed with a provider, (2) reviewed privacy-law exposure for
 * MA/FL/ME visitors and updated the privacy policy, and (3) set:
 *   INTENT_PROVIDER=datamoon | audiencelab
 *   INTENT_ENABLED=true                     (kill switch — anything else = off)
 *   INTENT_API_KEY=...                      (server only)
 *   INTENT_API_URL=...                      (provider ingest endpoint from their onboarding docs)
 *   INTENT_WEBHOOK_SECRET=...               (shared secret the provider sends to /api/intent/webhook)
 *   NEXT_PUBLIC_INTENT_PIXEL_SRC=...        (optional browser pixel; loads only after ad consent, never with GPC)
 *
 * Endpoints/payload shapes differ per provider and contract, so each adapter keeps its mapping in
 * one place; nothing is sent anywhere while disabled. Contact lists from these providers must never
 * be texted (no SMS consent) — signals only tag existing GHL contacts.
 */
import crypto from "node:crypto";

export type IntentProviderId = "datamoon" | "audiencelab";

export interface IntentSignal {
  provider: IntentProviderId;
  email?: string;
  emailSha256?: string;
  company?: string;
  domain?: string;
  topics: string[];
  score?: number;
  pageUrl?: string;
  seenAt?: string;
}

export interface LeadForIntent {
  eventId: string;
  email: string;
  phone?: string;
  zip?: string;
  adsConsent: boolean;
  tier: string;
  customerType: string;
}

export interface IntentAdapter {
  id: IntentProviderId;
  /** Shape a converted lead for the provider (hashed identifiers only). */
  leadPayload(l: LeadForIntent): Record<string, unknown>;
  /** Normalize a provider webhook body into signals. */
  parseWebhook(body: unknown): IntentSignal[];
}

const env = (k: string) => process.env[k]?.trim() || undefined;
export const sha256 = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : v && typeof v === "object" ? [v as Record<string, unknown>] : []);
const s = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const topicsOf = (v: unknown) => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[,;|]/).map((x) => x.trim()).filter(Boolean) : []);

/** Field names follow each provider's common export columns; confirm against the signed contract's docs. */
export const adapters: Record<IntentProviderId, IntentAdapter> = {
  datamoon: {
    id: "datamoon",
    leadPayload: (l) => ({ external_id: l.eventId, email_sha256: sha256(l.email), ...(l.phone ? { phone_sha256: sha256(l.phone.replace(/\D/g, "")) } : {}), postal_code: l.zip, segment: `pw-${l.customerType}`, lead_tier: l.tier }),
    parseWebhook: (body) =>
      arr((body as { records?: unknown })?.records ?? body).map((r) => ({
        provider: "datamoon" as const,
        email: s(r.email), emailSha256: s(r.email_sha256), company: s(r.company_name ?? r.company), domain: s(r.company_domain ?? r.domain),
        topics: topicsOf(r.topics ?? r.intent_topics), score: typeof r.score === "number" ? r.score : undefined, pageUrl: s(r.page_url), seenAt: s(r.timestamp ?? r.seen_at),
      })),
  },
  audiencelab: {
    id: "audiencelab",
    leadPayload: (l) => ({ externalId: l.eventId, hashedEmail: sha256(l.email), ...(l.phone ? { hashedPhone: sha256(l.phone.replace(/\D/g, "")) } : {}), zip: l.zip, audience: `pw-${l.customerType}`, tier: l.tier }),
    parseWebhook: (body) =>
      arr((body as { data?: unknown })?.data ?? body).map((r) => ({
        provider: "audiencelab" as const,
        email: s(r.EMAIL ?? r.email), emailSha256: s(r.SHA256_PERSONAL_EMAIL ?? r.hashedEmail), company: s(r.COMPANY_NAME ?? r.company), domain: s(r.COMPANY_DOMAIN ?? r.domain),
        topics: topicsOf(r.SEGMENT ?? r.segments ?? r.topics), score: typeof r.score === "number" ? r.score : undefined, pageUrl: s(r.URL ?? r.pageUrl), seenAt: s(r.EVENT_DATE ?? r.timestamp),
      })),
  },
};

export function intentConfig() {
  const provider = env("INTENT_PROVIDER") as IntentProviderId | undefined;
  const valid = provider === "datamoon" || provider === "audiencelab";
  const enabled = valid && env("INTENT_ENABLED") === "true";
  return {
    provider: valid ? provider : undefined,
    enabled,
    canSend: enabled && Boolean(env("INTENT_API_KEY") && env("INTENT_API_URL")),
    webhook: enabled && Boolean(env("INTENT_WEBHOOK_SECRET")),
    pixel: Boolean(process.env.NEXT_PUBLIC_INTENT_PIXEL_SRC) && enabled,
  };
}

export async function forwardLeadToIntent(l: LeadForIntent): Promise<{ ok: boolean; skipped?: "disabled" | "no-consent" | "not-configured"; error?: string }> {
  const c = intentConfig();
  if (!c.enabled || !c.provider) return { ok: false, skipped: "disabled" };
  if (!l.adsConsent) return { ok: false, skipped: "no-consent" };
  if (!c.canSend) return { ok: false, skipped: "not-configured" };
  try {
    const r = await fetch(env("INTENT_API_URL")!, { method: "POST", headers: { Authorization: `Bearer ${env("INTENT_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify(adapters[c.provider].leadPayload(l)) });
    return r.ok ? { ok: true } : { ok: false, error: `intent ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Intent topic → GHL tag. Tags only; no messaging is triggered from purchased data. */
export const intentTags = (sig: IntentSignal) => ["intent:signal", `intent:${sig.provider}`, ...sig.topics.slice(0, 5).map((t) => `intent-topic:${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`)];
