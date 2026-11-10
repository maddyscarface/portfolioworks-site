/**
 * Pre-estimate qualifiers: what the customer tells us BEFORE the estimate so there is no price
 * shock and the team knows how to shape the offer.
 *
 * Captured per lead: project type + size + add-ons (scope), budget band, start timing,
 * preferred visit date/time, favourite past projects or styles, whether they saw pricing
 * (and how often), and the visit address.
 *
 * Pure module (no React, no server APIs) so the form, the API, the email and tests share it.
 * Each site supplies its own EstimateConfig in src/config/estimate.ts.
 */

export type Option = { id: string; label: string; hint?: string };
export type Range = [number, number];
export type ScopeSize = Option & { typical: Range };
export type ProjectType = Option & { sizes: ScopeSize[]; addOns?: (Option & { typical: Range })[] };
export type BudgetBand = Option & { min: number; max: number | null };
export type TimeWindow = Option & { start: string; end: string }; // "HH:MM" 24h, site time zone

export type EstimateConfig = {
  brand: string;
  /** What the first meeting is called on this site ("estimate visit", "video consultation"…). */
  visitLabel: string;
  timezone: string; // IANA, e.g. America/New_York
  tzLabel: string; // e.g. "Eastern Time"
  projectTypes: ProjectType[];
  budgetBands: BudgetBand[];
  startOptions: Option[];
  timeWindows: TimeWindow[];
  /** Days from today the earliest visit can be booked (1 = tomorrow). */
  minLeadDays: number;
  favorites: { prompt: string; options: Option[] };
  priceGuidePath: string;
  /** Shown under the typical range. */
  rangeNote: string;
  /** false while ranges are placeholders; the team email flags this. */
  rangesConfirmed: boolean;
  addressRequired: boolean;
  addressLabel: string;
};

export type Qualifiers = {
  project_type?: string;
  size?: string;
  add_ons?: string[];
  budget?: string;
  start?: string;
  preferred_date?: string; // YYYY-MM-DD in site TZ
  preferred_window?: string;
  favorites?: string[];
  saw_pricing?: boolean;
  pricing_views?: number;
  address?: string;
};

const str = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const ids = (v: unknown, allowed: Option[], max = 12) => {
  if (!Array.isArray(v)) return undefined;
  const ok = new Set(allowed.map((o) => o.id));
  const out = [...new Set(v.filter((x): x is string => typeof x === "string" && ok.has(x)))].slice(0, max);
  return out.length ? out : undefined;
};
const pick = (v: unknown, allowed: Option[]) => { const s = str(v, 60); return s && allowed.some((o) => o.id === s) ? s : undefined; };

/** Server-side: keep only ids that exist in this site's config. Unknown input is dropped, never stored. */
export function sanitizeQualifiers(cfg: EstimateConfig, raw: unknown): Qualifiers | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const pt = cfg.projectTypes.find((p) => p.id === r.project_type);
  const date = str(r.preferred_date, 10);
  const views = Number(r.pricing_views);
  const q: Qualifiers = {
    project_type: pt?.id,
    size: pt ? pick(r.size, pt.sizes) : undefined,
    add_ons: pt?.addOns ? ids(r.add_ons, pt.addOns) : undefined,
    budget: pick(r.budget, cfg.budgetBands),
    start: pick(r.start, cfg.startOptions),
    preferred_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? date : undefined,
    preferred_window: pick(r.preferred_window, cfg.timeWindows),
    favorites: ids(r.favorites, cfg.favorites.options),
    saw_pricing: typeof r.saw_pricing === "boolean" ? r.saw_pricing : undefined,
    pricing_views: Number.isFinite(views) && views >= 0 ? Math.min(99, Math.trunc(views)) : undefined,
    address: str(r.address, 200),
  };
  for (const k of Object.keys(q) as (keyof Qualifiers)[]) if (q[k] === undefined) delete q[k];
  return Object.keys(q).length ? q : undefined;
}

export const labelOf = (opts: Option[], id?: string) => opts.find((o) => o.id === id)?.label;

export function typicalRange(cfg: EstimateConfig, q: Qualifiers): Range | undefined {
  const pt = cfg.projectTypes.find((p) => p.id === q.project_type);
  const size = pt?.sizes.find((s) => s.id === q.size);
  if (!pt || !size) return undefined;
  let [lo, hi] = size.typical;
  for (const a of pt.addOns ?? []) if (q.add_ons?.includes(a.id)) { lo += a.typical[0]; hi += a.typical[1]; }
  return [lo, hi];
}

export const money = (n: number) => (n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${n.toLocaleString("en-US")}`);
export const rangeText = ([lo, hi]: Range) => `${money(lo)}–${money(hi)}`;
export const bandText = (b: BudgetBand) => b.label;

export type BudgetFit = {
  fit: "within" | "above" | "low_end" | "below" | "unknown";
  typical?: Range;
  band?: BudgetBand;
  /** One line for the team: how to shape the offer. */
  guidance: string;
};

/**
 * Compares the customer's budget band with the typical range for the scope they chose.
 * - within: band overlaps the typical range and covers its midpoint
 * - low_end: band overlaps only the bottom of the range
 * - below: band tops out under the typical minimum (price-shock risk)
 * - above: band starts above the typical maximum
 */
export function budgetFit(cfg: EstimateConfig, q: Qualifiers): BudgetFit {
  const typical = typicalRange(cfg, q);
  const band = cfg.budgetBands.find((b) => b.id === q.budget);
  if (!band || band.min === 0 && band.max === null) {
    return { fit: "unknown", typical, band, guidance: typical
      ? `No budget given. Share the typical ${rangeText(typical)} range on the confirmation call before the visit.`
      : "No budget or scope given. Qualify on the first call before booking a visit." };
  }
  if (!typical) return { fit: "unknown", band, guidance: `Budget ${band.label}. Scope not specified; confirm size on the first call.` };
  const [lo, hi] = typical;
  const bMax = band.max ?? Number.POSITIVE_INFINITY;
  const mid = (lo + hi) / 2;
  if (bMax < lo) return { fit: "below", typical, band, guidance: `Budget is under the typical ${rangeText(typical)} for this scope. Call before the visit to reset expectations, then lead with a phased or essentials option.` };
  if (band.min > hi) return { fit: "above", typical, band, guidance: `Budget is above the typical ${rangeText(typical)}. Present a premium tier with upgrades next to the standard scope.` };
  if (bMax < mid) return { fit: "low_end", typical, band, guidance: `Budget sits at the low end of ${rangeText(typical)}. Lead with a good/better option and show what moves the price.` };
  return { fit: "within", typical, band, guidance: `Budget fits the typical ${rangeText(typical)}. Quote the standard scope and offer one upgrade.` };
}

/** Lead-score adjustment (added to each site's own score). */
export function qualifierScore(cfg: EstimateConfig, q?: Qualifiers): number {
  if (!q) return 0;
  let s = 0;
  const fit = budgetFit(cfg, q).fit;
  if (fit === "within" || fit === "above") s += 10;
  else if (fit === "low_end") s += 4;
  else if (fit === "below") s -= 8;
  if (q.saw_pricing) s += 5;
  if (q.preferred_date) s += 5;
  if (q.start && /^(asap|now|30|within_30|2weeks|month|this_month)/.test(q.start)) s += 5;
  if (q.address) s += 3;
  return s;
}

/* ---------------------------- visit time helpers ---------------------------- */

export function formatVisitDate(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

const compact = (date: string, hhmm: string) => `${date.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;

/** Google Calendar "add event" link in the site time zone. */
export function calendarLink(cfg: EstimateConfig, q: Qualifiers, title: string, details: string) {
  if (!q.preferred_date) return undefined;
  const w = cfg.timeWindows.find((t) => t.id === q.preferred_window) ?? { start: "09:00", end: "10:00" };
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compact(q.preferred_date, w.start)}/${compact(q.preferred_date, w.end)}`,
    ctz: cfg.timezone,
    details: details.slice(0, 1500),
  });
  if (q.address) p.set("location", q.address);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Earliest and latest selectable dates (YYYY-MM-DD) for the date input, in the site time zone. */
export function dateBounds(cfg: EstimateConfig, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: cfg.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const add = (n: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  return { min: add(cfg.minLeadDays), max: add(60) };
}

/** Flat key/values for CRM custom fields (GoHighLevel). */
export function qualifierFields(cfg: EstimateConfig, q?: Qualifiers): Record<string, string | number | undefined> {
  if (!q) return {};
  const pt = cfg.projectTypes.find((p) => p.id === q.project_type);
  const fit = budgetFit(cfg, q);
  const win = cfg.timeWindows.find((t) => t.id === q.preferred_window);
  return {
    est_project_type: pt?.label,
    est_size: pt ? labelOf(pt.sizes, q.size) : undefined,
    est_add_ons: q.add_ons?.map((a) => labelOf(pt?.addOns ?? [], a)).filter(Boolean).join(", ") || undefined,
    est_budget: labelOf(cfg.budgetBands, q.budget),
    est_typical_range: fit.typical ? rangeText(fit.typical) : undefined,
    est_budget_fit: fit.fit,
    est_offer_guidance: fit.guidance,
    est_start: labelOf(cfg.startOptions, q.start),
    est_preferred_date: q.preferred_date,
    est_preferred_time: win ? `${win.label} (${cfg.tzLabel})` : undefined,
    est_favorites: q.favorites?.map((f) => labelOf(cfg.favorites.options, f)).filter(Boolean).join(", ") || undefined,
    est_saw_pricing: q.saw_pricing === undefined ? undefined : q.saw_pricing ? `yes (${q.pricing_views ?? 1}x)` : "no",
    est_address: q.address,
  };
}
