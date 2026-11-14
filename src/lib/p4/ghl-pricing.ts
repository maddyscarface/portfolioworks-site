import { flags, type Env } from "./flags";

/**
 * Internal pricing fields (typical range, budget fit, offer guidance, budget band) are NOT sent to GoHighLevel by
 * default: GHL workflows can template contact fields into customer emails/SMS, which would leak internal pricing.
 * Set GHL_SEND_INTERNAL_PRICING=true only after confirming no customer-facing template references them.
 */
export const INTERNAL_PRICING_FIELDS = ["est_budget", "est_typical_range", "est_budget_fit", "est_offer_guidance"] as const;

export function publicSafeQualifierFields<T extends Record<string, unknown>>(fields: T, e: Env = process.env): T {
  if (flags(e).ghlInternalPricingFields) return fields;
  const out = { ...fields } as Record<string, unknown>;
  for (const k of INTERNAL_PRICING_FIELDS) delete out[k];
  return out as T;
}
