import { getMarket, marketFromZip, type MarketId } from "@/config/markets";

/**
 * CLIENT-SAFE planning tools (Phase 4). No prices, rates, ranges or cost assumptions live here: customers never see
 * our pricing. The internal price-sheet estimator stays server-side in ./calculators.ts (not used by any public page).
 */

/* ───────────────────────── Tool A — Unit Turnover Scope Planner (no prices) ───────────────────────── */
export type Painting = "none" | "touchup" | "full" | "full-ceilings";
export type Flooring = "none" | "repair" | "lvpPartial" | "lvpFull" | "hardwoodRefinish";
export type Level4 = "none" | "refresh" | "upgrade" | "full";
export type Carpentry = "none" | "minor" | "moderate" | "major";
export type Damage = "light" | "moderate" | "heavy";
export type UnitType = "apartment" | "condo" | "single-family" | "townhouse" | "multi-family-unit";
export interface ScopeInput {
  zip: string; unitType: UnitType; bedrooms: number; bathrooms: number; sqft: number;
  painting: Painting; flooring: Flooring; kitchen: Level4; bathroom: Level4; carpentry: Carpentry; damage: Damage;
  occupied?: boolean; targetMoveIn?: string; today?: string;
}
export interface ScopePlan {
  market: MarketId | null; served: boolean; marketNote: string;
  items: { category: string; label: string }[]; trades: string[]; intensity: Damage;
  schedule: string[]; bring: string[]; disclaimer: string;
}

export function planScope(input: ScopeInput): ScopePlan {
  const market = marketFromZip(input.zip);
  const m = market ? getMarket(market)! : null;
  const served = m?.status === "launch";
  const baths = Math.max(1, Math.min(input.bathrooms || 1, 6));
  const items: { category: string; label: string }[] = [];
  if (input.painting === "touchup") items.push({ category: "Painting & drywall", label: "Patch and touch-up paint" });
  else if (input.painting !== "none") items.push({ category: "Painting & drywall", label: input.painting === "full-ceilings" ? "Full repaint: walls, trim and ceilings" : "Full repaint: walls and trim" });
  const fl: Record<Flooring, string> = { none: "", repair: "Flooring repairs", lvpPartial: "LVP in some rooms", lvpFull: "LVP across most of the unit", hardwoodRefinish: "Refinish hardwood" };
  if (input.flooring !== "none") items.push({ category: "Flooring", label: fl[input.flooring] });
  if (input.kitchen !== "none") items.push({ category: "Kitchen", label: `Kitchen ${input.kitchen === "full" ? "renovation" : input.kitchen}` });
  if (input.bathroom !== "none") items.push({ category: "Bathroom", label: `Bathroom ${input.bathroom === "full" ? "renovation" : input.bathroom}${baths > 1 ? ` × ${baths}` : ""}` });
  if (input.carpentry !== "none") items.push({ category: "Carpentry & repairs", label: `${input.carpentry[0].toUpperCase()}${input.carpentry.slice(1)} repair list` });
  items.push({ category: "Cleaning", label: "Make-ready clean" });
  const trades = Array.from(new Set(items.map((i) => i.category)));
  if (input.kitchen === "full" || input.bathroom === "full") trades.push("Licensed plumbing / electrical (coordinated)");
  const heavy = input.kitchen === "full" || input.bathroom === "full" || input.damage === "heavy";
  const moderate = input.kitchen === "upgrade" || input.bathroom === "upgrade" || input.flooring === "lvpFull" || input.painting.startsWith("full");
  const intensity: Damage = heavy ? "heavy" : moderate ? "moderate" : "light";
  const schedule: string[] = [];
  schedule.push(intensity === "heavy" ? "Heavy scope: expect a site visit before a written scope, and possible permit time." : intensity === "moderate" ? "Moderate scope: photos and room measurements usually let us scope remotely, with a short visit to confirm." : "Light scope: photos are often enough to prepare a written scope.");
  if (input.targetMoveIn) {
    const today = new Date(input.today ?? new Date().toISOString().slice(0, 10));
    const days = Math.round((new Date(input.targetMoveIn).getTime() - today.getTime()) / 86400000);
    if (days < 0) schedule.push("Your target move-in date has passed. Tell us the new date in your request.");
    else if (days < 14) schedule.push(`Your target is ${days} days out, which is tight. Send photos now so we can confirm what's achievable.`);
    else schedule.push(`Your target is ${days} days out, which leaves room for material lead times and scheduling.`);
  }
  if (input.occupied) schedule.push("The unit is occupied: access is arranged through you, with notice to the resident. We don't enter occupied units unescorted unless you've arranged it.");
  if (input.kitchen === "full" || input.bathroom === "full") schedule.push("Full kitchen or bath work may need permits and inspections, which add time.");
  if (!market && /^\d{5}$/.test(String(input.zip ?? "").trim())) schedule.push("This ZIP is outside our service area. We'll let you know if that changes.");
  else if (m && !served) schedule.push(`We don't serve ${m.short} yet. You can still send the request and we'll note your interest; we won't schedule work there until we're licensed and launched.`);
  return {
    market, served, marketNote: served ? `${m!.short}: in our service area` : m ? `${m.short}: not served yet` : "Outside our service area",
    items, trades, intensity, schedule,
    bring: ["Photos of each room that needs work (no people or personal items)", "Rough room sizes", "Move-out and target move-in dates", "How access works (lockbox, on-site contact, resident schedule)"],
    disclaimer: "This planner lists scope only. It is not a quote, bid or contract, and we don't show prices online. Any price comes in a written proposal after we review photos, measurements and site conditions.",
  };
}

/* ───────────────────────── Tool B — Vacancy Cost Calculator (customer's own rent figures) ───────────────────────── */

export interface VacancyInput {
  monthlyRent: number;
  estimatedDaysVacant: number; // current/expected vacancy with today's process
  renovationDays: number; // expected renovation duration inside that window
  acceleratedRenovationDays: number; // proposed accelerated renovation duration
}

export interface VacancyResult {
  dailyRent: number;
  currentExposure: number;
  acceleratedDaysVacant: number;
  acceleratedExposure: number;
  difference: number;
  daysDifference: number;
  note: string;
}

export function vacancyCost(i: VacancyInput): VacancyResult {
  const rent = Math.max(0, i.monthlyRent);
  const dailyRent = (rent * 12) / 365;
  const currentDays = Math.max(0, i.estimatedDaysVacant);
  const saved = Math.max(0, i.renovationDays - i.acceleratedRenovationDays);
  const acceleratedDaysVacant = Math.max(0, currentDays - saved);
  const currentExposure = dailyRent * currentDays;
  const acceleratedExposure = dailyRent * acceleratedDaysVacant;
  return {
    dailyRent: Math.round(dailyRent * 100) / 100,
    currentExposure: Math.round(currentExposure),
    acceleratedDaysVacant,
    acceleratedExposure: Math.round(acceleratedExposure),
    difference: Math.round(currentExposure - acceleratedExposure),
    daysDifference: currentDays - acceleratedDaysVacant,
    note:
      "Gross rent equivalent only. A shorter renovation reduces the time a unit is unavailable; it does not guarantee a tenant, a lease date or recovered rent. Leasing time, concessions and market conditions are outside this calculation.",
  };
}

/* ───────────────────────── Tool C — Portfolio Improvement Planner ───────────────────────── */

export interface PlannerInput {
  units: number;
  annualTurnoverRate: number; // percent, e.g. 35
  locations: MarketId[];
  typicalScope: "light" | "standard" | "heavy";
  annualMaintenanceBudget?: number;
  challenges: string[];
}

export interface PlannerResult {
  annualTurns: number;
  monthlyTurns: number;
  peakMonths: string[];
  /** The customer's own maintenance budget divided by units (their figure, not our price). Not displayed publicly. */
  budgetPerUnit: number;
  categories: string[];
  schedule: { quarter: string; turns: number; focus: string }[];
  assumptions: string[];
  nextStep: string;
}

/** Configurable planning assumptions (no cost figures; customers never see pricing). */
export const plannerAssumptions = {
  /** Share of annual turns by quarter. Many US rental markets skew toward summer moves; Greater Boston peaks around Sept 1. */
  seasonality: { Q1: 0.18, Q2: 0.27, Q3: 0.37, Q4: 0.18 },
};

export function planPortfolio(i: PlannerInput): PlannerResult {
  const units = Math.max(0, Math.round(i.units));
  const rate = Math.max(0, Math.min(i.annualTurnoverRate, 100)) / 100;
  const annualTurns = Math.round(units * rate);
  const s = plannerAssumptions.seasonality;
  const qs = (Object.keys(s) as (keyof typeof s)[]).map((q) => ({ q, n: Math.round(annualTurns * s[q]) }));
  const focus: Record<string, string> = {
    Q1: "Interior capex and deferred repairs while volume is low",
    Q2: "Pre-book crews and stock standard materials for summer turns",
    Q3: "Peak turnover execution",
    Q4: "Exterior/weather-sensitive work before winter; annual inspections",
  };
  const peakMonths = i.locations.includes("massachusetts") ? ["June", "July", "August", "September"] : ["May", "June", "July", "August"];
  const categories = new Set<string>(["Unit turnovers"]);
  if (i.typicalScope !== "light") categories.add("Flooring replacement").add("Bathroom and kitchen refresh");
  if (i.typicalScope === "heavy") categories.add("Unit renovation / repositioning");
  if (units >= 20) categories.add("Common-area maintenance").add("Annual inspections");
  if (i.challenges.some((c) => /respon|schedul|slow/i.test(c))) categories.add("Priority scheduling agreement");
  if (i.challenges.some((c) => /pric|cost|bid/i.test(c))) categories.add("Fixed rate card");
  return {
    annualTurns,
    monthlyTurns: Math.round((annualTurns / 12) * 10) / 10,
    peakMonths,
    budgetPerUnit: units ? Math.round((i.annualMaintenanceBudget ?? 0) / units) : 0,
    categories: [...categories],
    schedule: qs.map(({ q, n }) => ({ quarter: q, turns: n, focus: focus[q] })),
    assumptions: [
      "Quarterly seasonality: Q1 18%, Q2 27%, Q3 37%, Q4 18% — placeholder assumption",
      "Turnover count = units × annual turnover rate, rounded",
    ],
    nextStep:
      annualTurns >= 10
        ? "Your volume supports a portfolio rate card. Request a partnership consultation and start with one pilot unit."
        : "Start with a single-unit turnover to see the process, then set standard packages for future turns.",
  };
}
