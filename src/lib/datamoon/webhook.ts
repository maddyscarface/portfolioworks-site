import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * DataMoon intent export-ready webhook verification (docs: intentdocs.datamoon.com/webhooks).
 * HMAC-SHA256 over `${Webhook-Timestamp}.${rawBody}` with the complete whsec_ secret (UTF-8), header
 * `Webhook-Signature: v1=<hex>`, constant-time compare, ±300 s tolerance. Verify BEFORE parsing the body.
 */
export const TOLERANCE_S = 300;

export function sign(secret: string, timestamp: string, raw: string) {
  return `v1=${createHmac("sha256", Buffer.from(secret, "utf8")).update(`${timestamp}.${raw}`).digest("hex")}`;
}

export function verifyDataMoonSignature(raw: string, headers: { get(n: string): string | null }, secret: string | null, nowMs = Date.now()): { ok: true } | { ok: false; reason: string } {
  if (!secret) return { ok: false, reason: "no secret configured" };
  const ts = headers.get("webhook-timestamp") ?? "";
  const got = headers.get("webhook-signature") ?? "";
  if (!/^\d{9,11}$/.test(ts)) return { ok: false, reason: "missing or malformed timestamp" };
  if (Math.abs(nowMs / 1000 - Number(ts)) > TOLERANCE_S) return { ok: false, reason: "timestamp outside tolerance" };
  if (!got) return { ok: false, reason: "missing signature" };
  const expected = sign(secret, ts, raw);
  // The header may carry several space-separated signatures (secret rotation); accept any v1 match.
  const candidates = got.split(/\s+/).filter(Boolean);
  const ok = candidates.some((c) => { const a = Buffer.from(c); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); });
  return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

/** Unsigned `test: true` deliveries are connectivity checks only. Detect without trusting anything else in them. */
export function isUnsignedTest(raw: string, headers: { get(n: string): string | null }) {
  if (headers.get("webhook-signature")) return false;
  try { return JSON.parse(raw)?.test === true; } catch { return false; }
}
