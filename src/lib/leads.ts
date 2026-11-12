import { z } from "zod";
import { marketFromZip, type MarketId } from "@/config/markets";
import { scoringWeights } from "@/config/lead-scoring";

export const FUNNELS = ["turnover", "portfolio", "rehab", "trade", "urgent", "walkthrough", "contact"] as const;
export type Funnel = (typeof FUNNELS)[number];

export const CUSTOMER_TYPES = ["landlord", "portfolio-owner", "property-manager", "investor", "broker", "hoa", "homeowner", "other"] as const;

const attribution = z
  .object({
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    gclid: z.string().max(300).optional(),
    gbraid: z.string().max(300).optional(),
    wbraid: z.string().max(300).optional(),
    fbclid: z.string().max(300).optional(),
    fbc: z.string().max(300).optional(),
    fbp: z.string().max(300).optional(),
    landing_page: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
    first_touch_at: z.string().max(40).optional(),
    ga_client_id: z.string().max(80).optional(),
    openai_obref: z.string().max(300).optional(),
    openai_oppref: z.string().max(300).optional(),
    // Phase 2: more click IDs + last-touch (first-touch fields above are never overwritten)
    msclkid: z.string().max(300).optional(),
    ttclid: z.string().max(300).optional(),
    li_fat_id: z.string().max(300).optional(),
    gclid_at: z.string().max(40).optional(),
    last_utm_source: z.string().max(200).optional(),
    last_utm_medium: z.string().max(200).optional(),
    last_utm_campaign: z.string().max(200).optional(),
    last_utm_term: z.string().max(200).optional(),
    last_utm_content: z.string().max(200).optional(),
    last_landing_page: z.string().max(500).optional(),
    last_referrer: z.string().max(500).optional(),
    last_touch_at: z.string().max(40).optional(),
    touches: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .partial()
  .default({});

export const leadSchema = z.object({
  funnel: z.enum(FUNNELS),
  customerType: z.enum(CUSTOMER_TYPES),
  // contact
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  phone: z.string().trim().min(7).max(30),
  company: z.string().trim().max(160).optional().default(""),
  role: z.string().trim().max(120).optional().default(""),
  // property
  propertyAddress: z.string().trim().max(240).optional().default(""),
  zip: z.string().trim().regex(/^\d{5}$/, "5-digit ZIP"),
  units: z.coerce.number().int().min(0).max(100000).optional().default(1),
  properties: z.coerce.number().int().min(0).max(10000).optional().default(1),
  // project
  services: z.array(z.string().max(60)).max(20).default([]),
  deliveryMode: z.enum(["turnkey", "a-la-carte", "unsure"]).default("unsure"),
  timeline: z.enum(["asap", "2-weeks", "30-days", "60-90-days", "planning"]).default("planning"),
  budget: z.enum(["under-5k", "5-15k", "15-50k", "50-150k", "150k-plus", "unknown"]).default("unknown"),
  contractType: z.enum(["single-project", "recurring", "unsure"]).default("unsure"),
  description: z.string().trim().max(4000).optional().default(""),
  moveOutDate: z.string().max(20).optional().default(""),
  targetMoveIn: z.string().max(20).optional().default(""),
  photoUrls: z.array(z.url()).max(20).default([]),
  estimatorSnapshot: z.record(z.string(), z.unknown()).optional(),
  /** Pre-estimate answers. Sanitised against src/config/estimate.ts in the API route. */
  qualifiers: z.record(z.string(), z.unknown()).optional(),
  /** Funnel-specific qualification answers (src/config/funnel-fields.ts). Sanitised in the API route. */
  details: z.record(z.string().max(40), z.union([z.string().max(1500), z.array(z.string().max(60)).max(10)])).optional(),
  /** Advertising consent at submit time. Gates OpenAI Ads server events. */
  adsConsent: z.boolean().optional(),
  // compliance
  consentContact: z.literal(true, { error: "Consent is required" }),
  consentSms: z.boolean().default(false),
  // tracking / anti-spam
  eventId: z.string().min(8).max(80),
  attribution,
  website: z.string().max(0).optional().default(""), // honeypot: must be empty
  startedAt: z.number().optional(),
  turnstileToken: z.string().optional(),
});

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;

/* ───── Scoring: weights live in src/config/lead-scoring.ts (owner-editable) ───── */
export { scoringWeights };

export interface Score {
  score: number;
  tier: "hot" | "warm" | "nurture";
  market: MarketId | null;
  estimatedValue: number;
  reasons: string[];
}

const budgetValue: Record<Lead["budget"], number> = {
  "under-5k": 3500,
  "5-15k": 10000,
  "15-50k": 30000,
  "50-150k": 90000,
  "150k-plus": 200000,
  unknown: 4000,
};

export function scoreLead(l: Lead, w = scoringWeights): Score {
  const reasons: string[] = [];
  let s = 0;
  s += w.customerType[l.customerType];
  reasons.push(`type:${l.customerType}`);
  const u = w.units.find((b) => l.units >= b.min)!;
  s += u.pts;
  reasons.push(`units:${l.units}`);
  s += w.budget[l.budget] + w.timeline[l.timeline] + w.contractType[l.contractType];
  const market = marketFromZip(l.zip);
  if (market) {
    s += w.inMarket;
    reasons.push(`market:${market}`);
  } else reasons.push("out-of-market");
  if (l.photoUrls.length) s += w.photos;
  s = Math.min(100, s);
  const tier = s >= w.thresholds.hot ? "hot" : s >= w.thresholds.warm ? "warm" : "nurture";
  const recurringFactor = l.contractType === "recurring" ? 3 : 1;
  return { score: s, tier, market, estimatedValue: budgetValue[l.budget] * recurringFactor, reasons };
}


/** Pipeline routing (specs/03 §3): homeowners never share a pipeline with landlord / PM opportunities. */
export function pipelineFor(l: Lead): "main" | "residential" | "partnership" {
  if (l.funnel === "portfolio") return "partnership";
  if (l.customerType === "homeowner") return "residential";
  if (["property-manager", "portfolio-owner", "hoa"].includes(l.customerType) && (l.units >= 10 || l.contractType === "recurring")) return "partnership";
  return "main";
}
