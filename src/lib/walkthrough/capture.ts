import { z } from "zod";
import { parseCount, parseLength, rectanglesAreaSqFt } from "./units";
import { templateFor, type Template } from "./templates";

/** Customer progress payload (validated). Text is length-limited; no HTML is ever rendered from it. */
export const progressSchema = z.object({
  answers: z.record(z.string().max(40), z.union([z.string().max(3000), z.array(z.string().max(40)).max(12)])).default({}),
  footprint: z.array(z.object({ unit: z.string().max(40).optional(), label: z.string().max(60).default(""), width: z.string().max(30).default(""), length: z.string().max(30).default(""), unknown: z.boolean().optional() })).max(80).default([]),
  measures: z.record(z.string().max(40), z.object({ raw: z.string().max(30).default(""), unknown: z.boolean().optional() })).default({}),
  assist_requested: z.boolean().optional(),
  correction_note: z.string().max(2000).optional(),
});
export type Progress = z.infer<typeof progressSchema>;

export type NormalizedMeasure = {
  field: string; label: string; type: "length" | "count"; raw: string; unknown: boolean;
  inches?: number; mm?: number; display?: string; count?: number; assumed_unit?: boolean; invalid?: boolean;
  source: "customer_tape"; confidence: "customer_reported";
};
export type NormalizedRect = { unit?: string; label: string; raw_width: string; raw_length: string; width_in?: number; length_in?: number; unknown: boolean; invalid?: boolean; assumed_unit?: boolean };

/** Normalise one progress payload against the template. Unknown fields are dropped; invalid entries are flagged, never guessed. */
export function normalizeProgress(tpl: Template, p: Progress) {
  const fieldDefs = tpl.steps.flatMap((s) => (s.kind === "measure" ? s.fields : []));
  const measures: NormalizedMeasure[] = fieldDefs.map((f) => {
    const m = p.measures[f.id];
    const raw = (m?.raw ?? "").trim();
    const unknown = Boolean(m?.unknown) || !raw;
    const base = { field: f.id, label: f.label, type: f.type, raw, unknown, source: "customer_tape" as const, confidence: "customer_reported" as const };
    if (unknown) return base;
    if (f.type === "count") { const c = parseCount(raw); return c === null ? { ...base, invalid: true } : { ...base, count: c }; }
    const l = parseLength(raw);
    return l ? { ...base, inches: l.inches, mm: l.mm, display: l.display, assumed_unit: l.assumed_unit } : { ...base, invalid: true };
  });
  const hasFootprint = tpl.steps.some((s) => s.kind === "footprint");
  const footprint: NormalizedRect[] = hasFootprint ? p.footprint.map((r, i) => {
    const w = parseLength(r.width); const l = parseLength(r.length);
    const unknown = Boolean(r.unknown) || (!r.width && !r.length);
    return { ...(r.unit?.trim() ? { unit: r.unit.trim() } : {}), label: r.label || `Room ${i + 1}`, raw_width: r.width, raw_length: r.length, unknown, ...(unknown ? {} : w && l ? { width_in: w.inches, length_in: l.inches, assumed_unit: w.assumed_unit || l.assumed_unit } : { invalid: true }) };
  }) : [];
  const measured = footprint.filter((r) => r.width_in && r.length_in) as { width_in: number; length_in: number }[];
  const answers: Record<string, string | string[]> = {};
  for (const s of tpl.steps) {
    const a = p.answers[s.id];
    if (a === undefined) continue;
    if (s.kind === "choice") {
      const ids = new Set(s.choices.map((c) => c.id));
      const arr = (Array.isArray(a) ? a : [a]).filter((x) => ids.has(x));
      answers[s.id] = s.multi ? arr : arr.slice(0, 1);
    } else if (s.kind === "text" && typeof a === "string") answers[s.id] = a.trim().slice(0, 3000);
    else if (s.kind === "date" && typeof a === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a)) answers[s.id] = a;
  }
  // Per-unit floor area (multi-unit batches). Quantities only; never a price.
  const byUnit: Record<string, number> = {};
  for (const r of footprint) if (r.width_in && r.length_in) { const k = r.unit || "Unit"; byUnit[k] = (byUnit[k] ?? 0) + (r.width_in * r.length_in) / 144; }
  const unit_areas_sqft = Object.fromEntries(Object.entries(byUnit).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  return { measures, footprint, plan_area_sqft: measured.length ? rectanglesAreaSqFt(measured) : null, unit_areas_sqft, answers, assist_requested: Boolean(p.assist_requested) };
}
export type NormalizedCapture = ReturnType<typeof normalizeProgress>;

export const OUTCOMES = ["ready_for_remote_quote", "targeted_follow_up", "live_video_walkthrough", "site_check"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABELS: Record<Outcome, string> = {
  ready_for_remote_quote: "Ready for remote quote", targeted_follow_up: "Targeted follow-up", live_video_walkthrough: "Live video walkthrough", site_check: "Site check",
};

/**
 * INTERNAL readiness rules (staff only; never returned to the customer). Suggests one of four outcomes; the estimator
 * decides. Water, mould, electrical, structural, pest or pre-1978 paint flags always suggest a site check.
 */
export function readiness(service: string, cap: NormalizedCapture, mediaByStep: Record<string, number>) {
  const tpl = templateFor(service);
  if (!tpl) return { outcome: "targeted_follow_up" as Outcome, reasons: ["unknown template"], missing: [] as string[], unknown_required: [] as string[], site_check: [] as string[] };
  const missing = tpl.steps.filter((s) => (s.kind === "photo" || s.kind === "video") && s.required && !(mediaByStep[s.id] > 0)).map((s) => s.id);
  const reqFields = tpl.steps.flatMap((s) => (s.kind === "measure" ? s.fields.filter((f) => f.required).map((f) => f.id) : []));
  const unknownRequired = reqFields.filter((f) => { const m = cap.measures.find((x) => x.field === f); return !m || m.unknown || m.invalid; });
  const fpRequired = tpl.steps.some((s) => s.kind === "footprint" && s.required);
  if (fpRequired && !cap.footprint.some((r) => r.width_in && r.length_in)) unknownRequired.push("footprint");
  const flagged = tpl.steps.flatMap((st) => (st.kind === "choice" ? ((cap.answers[st.id] as string[] | undefined) ?? []).filter((id) => st.choices.find((c) => c.id === id)?.siteCheck) : []));
  const siteCheck = flagged.map((f) => `customer reported: ${f}`);
  const occupancy = (cap.answers.occupancy as string[] | undefined)?.[0];
  if (occupancy === "occupied_not_notified") unknownRequired.push("resident_not_notified");
  const reasons: string[] = [];
  let outcome: Outcome = "ready_for_remote_quote";
  if (siteCheck.length) { outcome = "site_check"; reasons.push("condition flags need an on-site check"); }
  else if (cap.assist_requested || unknownRequired.length >= 2) { outcome = "live_video_walkthrough"; reasons.push(cap.assist_requested ? "customer asked for help" : "several required measurements unknown"); }
  else if (missing.length || unknownRequired.length) { outcome = "targeted_follow_up"; reasons.push("missing required evidence"); }
  if (occupancy === "occupied_not_notified") reasons.push("resident not yet notified: no interior photos accepted; arrange access through the owner");
  const assumed = cap.measures.filter((m) => m.assumed_unit).map((m) => m.field);
  if (assumed.length) reasons.push(`confirm units for: ${assumed.join(", ")}`);
  return { outcome, reasons, missing, unknown_required: unknownRequired, site_check: siteCheck };
}
