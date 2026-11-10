import { priceSheet, type PriceSheet } from "@/config/pricing";
import { getMarket, marketFromZip, type MarketId } from "@/config/markets";

/* ───────────────────────── Tool A — Unit Turnover Cost Estimator ───────────────────────── */

export type Painting = "none" | "touchup" | "full" | "full-ceilings";
export type Flooring = "none" | "repair" | "lvpPartial" | "lvpFull" | "hardwoodRefinish";
export type Level4 = "none" | "refresh" | "upgrade" | "full";
export type Carpentry = "none" | "minor" | "moderate" | "major";
export type Damage = "light" | "moderate" | "heavy";
export type UnitType = keyof PriceSheet["unitTypeMultiplier"];

export interface TurnoverInput {
  zip: string;
  unitType: UnitType;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  painting: Painting;
  flooring: Flooring;
  kitchen: Level4;
  bathroom: Level4;
  carpentry: Carpentry;
  damage: Damage;
  targetMoveIn?: string; // ISO date
  today?: string; // ISO date, injectable for tests
}

export interface LineItem {
  category: string;
  label: string;
  low: number;
  high: number;
}

export interface TurnoverEstimate {
  market: MarketId | null;
  marketNote: string;
  items: LineItem[];
  low: number;
  high: number;
  durationDays: [number, number];
  schedule: string[];
  disclaimer: string;
}

const round50 = (n: number) => Math.round(n / 50) * 50;

export function estimateTurnover(input: TurnoverInput, sheet: PriceSheet = priceSheet): TurnoverEstimate {
  const market = marketFromZip(input.zip);
  const m = market ? getMarket(market)! : null;
  const geo = m?.priceMultiplier ?? 1;
  const dmg = sheet.damageMultiplier[input.damage];
  const ut = sheet.unitTypeMultiplier[input.unitType] ?? 1;
  const mult = geo * dmg * ut;
  const sqft = Math.max(200, Math.min(input.sqft || 0, 6000));
  const beds = Math.max(0, Math.min(input.bedrooms, 10));
  const baths = Math.max(1, Math.min(input.bathrooms, 6));
  const raw: { category: string; label: string; mid: number }[] = [];

  // Painting
  if (input.painting === "touchup") {
    const p = sheet.painting.touchup;
    raw.push({ category: "Painting & drywall", label: "Patch & touch-up paint", mid: p.base + p.perBedroom * beds + p.perBathroom * baths });
  } else if (input.painting === "full" || input.painting === "full-ceilings") {
    const p = sheet.painting.full;
    raw.push({ category: "Painting & drywall", label: "Full unit repaint (walls & trim)", mid: p.perSqft * sqft });
    if (input.painting === "full-ceilings") raw.push({ category: "Painting & drywall", label: "Ceilings", mid: p.ceilingsAddPerSqft * sqft });
  }

  // Flooring
  if (input.flooring === "repair") raw.push({ category: "Flooring", label: "Flooring repairs", mid: sheet.flooring.repair.flat });
  else if (input.flooring !== "none") {
    const f = sheet.flooring[input.flooring];
    const labels: Record<string, string> = { lvpPartial: "LVP — partial unit", lvpFull: "LVP — most of unit", hardwoodRefinish: "Hardwood refinish" };
    raw.push({ category: "Flooring", label: `${labels[input.flooring]} (~${Math.round(f.share * sqft)} sq ft)`, mid: f.share * sqft * f.perSqft });
  }

  if (input.kitchen !== "none") raw.push({ category: "Kitchen", label: `Kitchen ${input.kitchen}`, mid: sheet.kitchen[input.kitchen] });
  if (input.bathroom !== "none")
    raw.push({ category: "Bathroom", label: `Bathroom ${input.bathroom} × ${baths}`, mid: sheet.bathroom[input.bathroom] * baths });
  if (input.carpentry !== "none") raw.push({ category: "Carpentry & repairs", label: `${input.carpentry} repair list`, mid: sheet.carpentry[input.carpentry] });
  raw.push({ category: "Cleaning", label: "Make-ready clean (coordinated)", mid: Math.max(sheet.cleaning.min, sheet.cleaning.perSqft * sqft) });

  const items: LineItem[] = raw.map((r) => ({
    category: r.category,
    label: r.label,
    low: round50(r.mid * mult * sheet.rangeSpread.low),
    high: round50(r.mid * mult * sheet.rangeSpread.high),
  }));
  const low = items.reduce((s, i) => s + i.low, 0);
  const high = items.reduce((s, i) => s + i.high, 0);

  // Intensity drives duration
  const heavyScope = input.kitchen === "full" || input.bathroom === "full" || input.damage === "heavy";
  const modScope = input.kitchen === "upgrade" || input.bathroom === "upgrade" || input.flooring === "lvpFull" || input.painting.startsWith("full");
  const intensity: Damage = heavyScope ? "heavy" : modScope ? "moderate" : "light";
  const durationDays = [...sheet.durationDays[intensity]] as [number, number];

  const schedule: string[] = [];
  schedule.push(`Typical on-site duration for this scope: ${durationDays[0]}–${durationDays[1]} calendar days once work starts.`);
  if (input.targetMoveIn) {
    const today = new Date(input.today ?? new Date().toISOString().slice(0, 10));
    const target = new Date(input.targetMoveIn);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days < 0) schedule.push("Your target move-in date has passed—tell us the new date in your request.");
    else if (days < durationDays[0] + 3) schedule.push(`Your target is ${days} days out, which is tight for this scope. Submit photos now so we can confirm what is achievable.`);
    else if (days < durationDays[1] + 5) schedule.push(`Your target is ${days} days out. Achievable for many scopes if materials are in stock and access is available promptly.`);
    else schedule.push(`Your target is ${days} days out, which leaves room for material lead times and scheduling.`);
  }
  if (input.kitchen === "full" || input.bathroom === "full") schedule.push("Full kitchen/bath work may require permits and inspections, which add time.");
  if (!market) schedule.push("This ZIP is outside our current service markets; we'll confirm coverage when you submit.");
  else if (m!.status !== "launch") schedule.push(`${m!.short} is not yet fully launched; requests are reviewed for availability.`);

  return {
    market,
    marketNote: m ? `${m.short} pricing assumptions applied` : "Default pricing assumptions applied (ZIP outside service markets)",
    items,
    low,
    high,
    durationDays,
    schedule,
    disclaimer:
      "This is an illustrative, preliminary range built from internal pricing assumptions. It is not a quote, bid or contract. Final pricing requires a written scope after review of site conditions, measurements, materials and applicable code or permit requirements.",
  };
}

/* ───────────────────────── Tool B — Vacancy Cost Calculator ───────────────────────── */

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
  annualMaintenanceBudget: number;
  challenges: string[];
}

export interface PlannerResult {
  annualTurns: number;
  monthlyTurns: number;
  peakMonths: string[];
  plannedTurnBudget: [number, number];
  budgetPerUnit: number;
  categories: string[];
  schedule: { quarter: string; turns: number; focus: string }[];
  assumptions: string[];
  nextStep: string;
}

/** Configurable assumptions — clearly labeled in UI. */
export const plannerAssumptions = {
  turnCostPerUnit: { light: [1200, 2500], standard: [2500, 6000], heavy: [6000, 15000] } as Record<string, [number, number]>,
  /** Share of annual turns by quarter. Many US rental markets skew toward summer moves; Greater Boston peaks around Sept 1. */
  seasonality: { Q1: 0.18, Q2: 0.27, Q3: 0.37, Q4: 0.18 },
};

export function planPortfolio(i: PlannerInput): PlannerResult {
  const units = Math.max(0, Math.round(i.units));
  const rate = Math.max(0, Math.min(i.annualTurnoverRate, 100)) / 100;
  const annualTurns = Math.round(units * rate);
  const [lo, hi] = plannerAssumptions.turnCostPerUnit[i.typicalScope];
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
    plannedTurnBudget: [annualTurns * lo, annualTurns * hi],
    budgetPerUnit: units ? Math.round(i.annualMaintenanceBudget / units) : 0,
    categories: [...categories],
    schedule: qs.map(({ q, n }) => ({ quarter: q, turns: n, focus: focus[q] })),
    assumptions: [
      `Turn cost per unit (${i.typicalScope}): $${lo.toLocaleString()}–$${hi.toLocaleString()} — placeholder assumption, edit in calculators.ts`,
      "Quarterly seasonality: Q1 18%, Q2 27%, Q3 37%, Q4 18% — placeholder assumption",
      "Turnover count = units × annual turnover rate, rounded",
    ],
    nextStep:
      annualTurns >= 10
        ? "Your volume supports a portfolio rate card. Request a partnership consultation and start with one pilot unit."
        : "Start with a single-unit turnover to see the process, then set standard packages for future turns.",
  };
}
