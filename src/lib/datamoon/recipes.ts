import { z } from "zod";
import { MAIN, PROHIBITED_FIELDS } from "./catalog";

/**
 * Audience recipe = a reviewed, owner-approved plan for one DataMoon pull. Topics and criteria start as research
 * HYPOTHESES (no topic id) and must be replaced with ids/fields returned by the vendor's own discovery endpoints
 * before activation. Separate approvals: legal/data-purpose, export (credits), CRM sync.
 */
export const PERSONAS = ["small_multiunit_owner", "property_asset_manager", "value_add_investor", "condo_multifamily_association"] as const;
export const DESTINATIONS = ["internal_review_only", "ghl_email_nurture", "meta_custom_audience", "google_customer_match"] as const;

const topic = z.object({ label: z.string().min(2).max(120), id: z.union([z.number().int(), z.string().max(80)]).nullable(), source: z.enum(["hypothesis", "catalog"]), reviewed_at: z.string().nullable() });
const criterion = z.object({ field: z.string().min(2).max(60), operator: z.string().max(12), value: z.union([z.string().max(200), z.array(z.string().max(80)).max(50)]).nullable(), verified: z.boolean(), discovered_at: z.string().nullable().optional() });

export const recipeSchema = z.object({
  id: z.string().max(60).optional(),
  brand: z.literal("portfolioworks"),
  name: z.string().min(3).max(120),
  market: z.string().max(80),
  persona: z.enum(PERSONAS),
  audience_type: z.enum(["b2c", "b2b"]),
  api_family: z.enum(["main_module", "main_ext", "intent"]),
  topics: z.array(topic).max(10),
  geography: z.object({ states: z.array(z.string().length(2)).max(5), zips: z.array(z.string().regex(/^\d{5}$/)).max(400) }),
  lookback_days: z.number().int().min(1).max(90),
  criteria: z.array(criterion).max(20),
  max_records: z.number().int().min(0).max(1_000_000),
  estimated_credits: z.number().int().min(0).max(1_000_000),
  purpose: z.string().min(10).max(500),
  legal_basis: z.string().max(300),
  consent_basis: z.string().max(300),
  approved_destinations: z.array(z.enum(DESTINATIONS)).max(4),
  owner: z.string().max(80),
  status: z.enum(["draft", "pending_approval", "approved", "paused"]),
  approvals: z.object({ legal: z.string().nullable(), export: z.string().nullable(), crm_sync: z.string().nullable() }),
  last_run_at: z.string().nullable(),
  conversion_cta: z.string().max(80),
});
export type Recipe = z.infer<typeof recipeSchema>;

const MA_CORE_ZIPS: string[] = []; // Intentionally empty: ZIP list is an owner decision (served towns), not invented here.

const base = (o: Partial<Recipe> & Pick<Recipe, "id" | "name" | "persona" | "audience_type" | "api_family" | "topics" | "criteria" | "purpose" | "conversion_cta">): Recipe => ({
  brand: "portfolioworks", market: "Massachusetts only (the single launch market)", geography: { states: ["MA"], zips: MA_CORE_ZIPS }, lookback_days: 14,
  max_records: 0, estimated_credits: 0, legal_basis: "TO BE CONFIRMED by owner/legal review", consent_basis: "None for outbound contact: ads audiences and permissioned first-party follow-up only",
  approved_destinations: ["internal_review_only"], owner: "Justin Spillers (owner)", status: "draft", approvals: { legal: null, export: null, crm_sync: null }, last_run_at: null, ...o,
}) as Recipe;

const hyp = (labels: string[]) => labels.map((label) => ({ label, id: null, source: "hypothesis" as const, reviewed_at: null }));

/**
 * PortfolioWorks starter recipes (spec 04 §DataMoon). All DRAFT, every topic is a HYPOTHESIS (no vendor id), no ZIPs,
 * max_records 0, internal review only. Massachusetts only: Florida and Maine are NOT live markets and get no recipe.
 * Owner/landlord/investor targeting uses only documented, non-sensitive fields; anything else is marked UNVERIFIED.
 */
export const PW_RECIPES: Recipe[] = [
  base({ id: "pw-small-multiunit-owners", name: "Small multi-unit owners / investor landlords", persona: "small_multiunit_owner", audience_type: "b2c", api_family: "main_module",
    topics: hyp(["rental property maintenance", "apartment turnover", "landlord repairs", "rental unit renovation"]),
    criteria: [{ field: "homeowner", operator: "in", value: ["y"], verified: true }, { field: "personal_state", operator: "in", value: ["ma"], verified: true },
      { field: "owns_rental_property", operator: "in", value: "UNVERIFIED", verified: false }, { field: "units_owned", operator: ">=", value: "UNVERIFIED", verified: false }],
    purpose: "Ad audience and permissioned first-party nurture for owners of 2–10 unit rentals in served Massachusetts towns who need turnover or repair help.", conversion_cta: "Request a property walkthrough" }),
  base({ id: "pw-property-managers", name: "Property managers / asset managers (B2B)", persona: "property_asset_manager", audience_type: "b2b", api_family: "main_module",
    topics: hyp(["property management", "make-ready services", "multifamily maintenance", "vendor management"]),
    criteria: [{ field: "job_title", operator: "contains", value: "property manager", verified: true }, { field: "seniority_level", operator: "in", value: ["manager", "director"], verified: true }, { field: "company_state", operator: "in", value: ["ma"], verified: true },
      { field: "primary_industry", operator: "in", value: "UNVERIFIED (real estate / property management value list)", verified: false }],
    purpose: "B2B awareness for property and asset managers running residential portfolios who need a turnover / make-ready vendor.", conversion_cta: "Portfolio program consultation" }),
  base({ id: "pw-value-add-investors", name: "Renovation / value-add investors", persona: "value_add_investor", audience_type: "b2b", api_family: "intent",
    topics: hyp(["value-add multifamily", "rental property renovation", "BRRRR investing", "unit rehab"]),
    criteria: [], purpose: "Awareness for investors renovating rental units or small multifamily buildings in Massachusetts; unit rehab and capital improvement scoping.", conversion_cta: "Renovation scope review" }),
  base({ id: "pw-condo-associations", name: "Condo / multifamily associations (B2B)", persona: "condo_multifamily_association", audience_type: "b2b", api_family: "main_module",
    topics: hyp(["condominium association management", "HOA maintenance", "common area repairs", "capital improvement planning"]),
    criteria: [{ field: "job_title", operator: "contains", value: "community association manager", verified: true }, { field: "company_state", operator: "in", value: ["ma"], verified: true },
      { field: "board_role", operator: "in", value: "UNVERIFIED", verified: false }],
    purpose: "B2B awareness for condo / multifamily association managers and boards planning common-area or capital work.", conversion_cta: "Capital improvement walkthrough" }),
];
/** @deprecated name kept for the shared DataMoon module shape. */
export const RECIPES = PW_RECIPES;

/** Validation for activation. Returns blocking issues; an empty list means the recipe is technically eligible. */
export function activationIssues(r: Recipe): string[] {
  const issues: string[] = [];
  const p = recipeSchema.safeParse(r);
  if (!p.success) return [`schema: ${p.error.issues.map((i) => i.path.join(".")).join(", ")}`];
  if (r.api_family !== "intent") {
    if (r.topics.length > MAIN.constraints.maxTopicIds) issues.push(`main API allows at most ${MAIN.constraints.maxTopicIds} topic ids`);
    if (r.lookback_days > MAIN.constraints.eventDateMaxDays) issues.push(`main API event_date must be within ${MAIN.constraints.eventDateMaxDays} days`);
  }
  const hyp = r.topics.filter((t) => t.source !== "catalog" || t.id === null);
  if (hyp.length) issues.push(`${hyp.length} topic(s) are hypotheses without a vendor-returned id`);
  for (const c of r.criteria) {
    if ((PROHIBITED_FIELDS as readonly string[]).includes(c.field)) issues.push(`criterion "${c.field}" is prohibited (sensitive / financial eligibility)`);
    else if (!c.verified) issues.push(`criterion "${c.field}" is UNVERIFIED`);
    else if (r.api_family === "intent" && !c.discovered_at) issues.push(`intent filter "${c.field}" must come from /filters/*/fields discovery`);
    else if (r.api_family !== "intent" && !(MAIN.documentedFields as readonly string[]).includes(c.field)) issues.push(`criterion "${c.field}" is not in the documented filter list`);
  }
  if (r.max_records <= 0) issues.push("max_records is 0 (owner must set a ceiling)");
  if (!r.approvals.legal) issues.push("legal / data-purpose approval missing");
  if (!r.approvals.export) issues.push("owner export (credit) approval missing");
  if (r.approved_destinations.some((d) => d !== "internal_review_only") && !r.approvals.crm_sync) issues.push("CRM/ads destination needs a separate approval");
  if (/TO BE CONFIRMED/i.test(r.legal_basis)) issues.push("legal basis not recorded");
  return issues;
}

/** Translate a recipe to a documented main-API BuildAudienceRequest (only verified, allowed criteria). */
export function toBuildRequest(r: Recipe) {
  const ids = r.topics.filter((t) => t.source === "catalog" && typeof t.id === "number").map((t) => t.id as number).slice(0, MAIN.constraints.maxTopicIds);
  const since = new Date(Date.now() - Math.min(r.lookback_days, 14) * 86400_000).toISOString().slice(0, 10);
  const filters = r.criteria.filter((c) => c.verified && !(PROHIBITED_FIELDS as readonly string[]).includes(c.field) && (MAIN.documentedFields as readonly string[]).includes(c.field)).map((c) => ({ field: c.field, operator: c.operator, value: c.value }));
  if (r.geography.zips.length) filters.push({ field: "personal_zip", operator: "in", value: r.geography.zips });
  return { name: `portfolioworks:${r.id}`, type: r.audience_type, limit: r.max_records, topic_ids: ids, filters: [{ field: "event_date", operator: ">=", value: since }, ...filters] };
}
