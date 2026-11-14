import { createHash } from "node:crypto";
import type { NormalizedCapture } from "../walkthrough/capture";

/**
 * PRIVATE estimating model (staff only). Rates ship blank. A total exists only when every line has a manual quantity
 * AND a manual rate; otherwise the estimate is "incomplete" and no figure is produced. Nothing is ever guessed.
 */
/** Owner-only quote placeholders (spec 04): per-unit labor, trades, paint/material, cleaning, flooring, fixtures, waste, mobilization, access, schedule contingency. */
export const LINE_CATEGORIES = ["labor", "trades", "materials", "cleaning", "flooring", "fixtures", "disposal", "mobilization", "access", "schedule_contingency", "other"] as const;
export type LineCategory = (typeof LINE_CATEGORIES)[number];
export type Line = { id: string; category: LineCategory; description: string; quantity: number | null; unit: string; rate: number | null; rate_source: "manual" | "pricebook" | null; notes?: string };
export type Adjustments = { minimum: number | null; mobilization: number | null; waste_pct: number | null; tax_pct: number | null; margin_pct: number | null };
export type ScopeItem = { id: string; description: string; quantity: number | null; unit: string; source: "customer_tape" | "staff_verified" | "staff_entered"; measurement_ref?: string };

export const EMPTY_ADJ: Adjustments = { minimum: null, mobilization: null, waste_pct: null, tax_pct: null, margin_pct: null };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function compute(lines: Line[], adj: Adjustments) {
  const missing = lines.filter((l) => num(l.quantity) === null || num(l.rate) === null).map((l) => l.id);
  if (!lines.length || missing.length) return { complete: false as const, missing_lines: missing, reason: !lines.length ? "No lines yet" : `${missing.length} line(s) need a manual quantity and rate` };
  const byCat = (c: LineCategory) => lines.filter((l) => l.category === c).reduce((a, l) => a + l.quantity! * l.rate!, 0);
  const lineSum = lines.reduce((a, l) => a + l.quantity! * l.rate!, 0);
  const materials = byCat("materials");
  const waste = num(adj.waste_pct) !== null ? materials * (adj.waste_pct! / 100) : 0;
  const mobilization = num(adj.mobilization) ?? 0;
  const cost = lineSum + waste + mobilization;
  const marginAmt = num(adj.margin_pct) !== null ? cost * (adj.margin_pct! / 100) : 0;
  let beforeTax = cost + marginAmt;
  const minimumApplied = num(adj.minimum) !== null && beforeTax < adj.minimum!;
  if (minimumApplied) beforeTax = adj.minimum!;
  const tax = num(adj.tax_pct) !== null ? beforeTax * (adj.tax_pct! / 100) : 0;
  return {
    complete: true as const, missing_lines: [] as string[],
    line_sum: r2(lineSum), materials: r2(materials), waste: r2(waste), mobilization: r2(mobilization), cost: r2(cost), margin_amount: r2(marginAmt),
    minimum_applied: minimumApplied, before_tax: r2(beforeTax), tax: r2(tax), total: r2(beforeTax + tax),
    unset_adjustments: (Object.keys(adj) as (keyof Adjustments)[]).filter((k) => num(adj[k]) === null),
  };
}
export type Computation = ReturnType<typeof compute>;

/** Snapshot hash of everything an approval covers. Any later edit changes it, so stale approvals can't be exported. */
export function snapshotHash(e: { lines: Line[]; adjustments: Adjustments; scope: ScopeItem[]; customer_scope_text?: string; exclusions?: string; capture_revision_no?: number }) {
  return createHash("sha256").update(JSON.stringify([e.lines, e.adjustments, e.scope, e.customer_scope_text ?? "", e.exclusions ?? "", e.capture_revision_no ?? 0])).digest("hex");
}

let seq = 0;
const lid = () => `ln_${Date.now().toString(36)}${(seq++).toString(36)}`;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Draft scope + BLANK-rate lines from the customer's capture. Quantities are customer-reported until verified on site.
 * Wall area = sum of room perimeters × the typical ceiling height (gross, no openings deducted; the estimator adjusts).
 */
export function draftFromCapture(service: string, cap: NormalizedCapture | null) {
  const m = (f: string) => cap?.measures.find((x) => x.field === f);
  const a = (id: string) => ((cap?.answers[id] as string[] | undefined) ?? []);
  const floor = cap?.plan_area_sqft ?? null;
  const ceilingFt = m("ceiling_height")?.inches ? m("ceiling_height")!.inches! / 12 : null;
  const rooms = (cap?.footprint ?? []).filter((r) => r.width_in && r.length_in);
  const perimeterFt = rooms.length ? rooms.reduce((t, r) => t + (2 * (r.width_in! + r.length_in!)) / 12, 0) : null;
  const wall = perimeterFt !== null && ceilingFt !== null ? r1(perimeterFt * ceilingFt) : null;
  const unitKeys = Object.keys(cap?.unit_areas_sqft ?? {});
  const units = m("units_in_batch")?.count ?? (unitKeys.length > 1 ? unitKeys.length : 1);
  const baths = m("bathrooms")?.count ?? null;
  const doors = m("doors")?.count ?? null;
  const scope: ScopeItem[] = [];
  const lines: Line[] = [];
  const add = (category: LineCategory, description: string, quantity: number | null, unit: string) => lines.push({ id: lid(), category, description, quantity, unit, rate: null, rate_source: null });
  if (floor !== null) scope.push({ id: "floor", description: "Floor area of rooms in scope (customer tape measurement)", quantity: floor, unit: "sq ft", source: "customer_tape", measurement_ref: "rooms" });
  if (wall !== null) scope.push({ id: "wall", description: "Gross wall area (room perimeters × ceiling height)", quantity: wall, unit: "sq ft", source: "customer_tape", measurement_ref: "rooms+ceiling_height" });
  for (const [u, sq] of Object.entries(cap?.unit_areas_sqft ?? {})) if (unitKeys.length > 1) scope.push({ id: `unit_${u}`.slice(0, 40), description: `Unit ${u}: floor area`, quantity: sq, unit: "sq ft", source: "customer_tape", measurement_ref: "rooms" });
  if (baths !== null) scope.push({ id: "baths", description: "Bathrooms", quantity: baths, unit: "each", source: "customer_tape", measurement_ref: "bathrooms" });
  if (doors !== null) scope.push({ id: "doors", description: "Interior doors needing work", quantity: doors, unit: "each", source: "customer_tape", measurement_ref: "doors" });

  const interior = () => {
    add("labor", "Per-unit labor (make-ready / repair)", units, "units");
    if (a("paint_drywall").length) { add("materials", "Paint and drywall materials", wall, "sq ft wall"); add("trades", "Painting and drywall labor", wall, "sq ft wall"); }
    if (a("flooring").some((x) => x !== "clean_only")) add("flooring", "Flooring (materials + install)", floor, "sq ft");
    if (a("kitchen").length) add("fixtures", "Kitchen fixtures / finishes", null, "lot");
    if (a("bath").length) add("fixtures", "Bathroom fixtures / finishes", baths, "baths");
    if (a("other_trades").includes("cleaning") || service === "turnover") add("cleaning", "Turnover cleaning", units, "units");
    if (a("other_trades").some((x) => x === "electrical_minor" || x === "plumbing_minor")) add("trades", "Licensed trade coordination (electrical / plumbing)", null, "lot");
  };
  switch (service) {
    case "turnover": interior(); break;
    case "unit_rehab": interior(); add("trades", "Rehab trades (demo, carpentry, finishes)", null, "lot"); break;
    case "recurring_program": interior(); add("labor", "Program coordination / scheduling", null, "month"); break;
    case "capital_improvement":
      add("trades", "Capital improvement scope (per owner specification)", null, "lot"); add("materials", "Materials", null, "lot"); add("labor", "Labor", null, "lot"); break;
    default: add("labor", "Labor", null, "hours"); add("materials", "Materials", null, "lot");
  }
  add("disposal", "Waste and debris removal", null, "loads");
  add("mobilization", "Mobilization", 1, "each");
  add("access", "Access cost (occupied-unit coordination, lockbox, parking, escort)", null, "visits");
  add("schedule_contingency", "Schedule contingency (resident access, vacancy date changes)", null, "allowance");
  return { scope, lines };
}
