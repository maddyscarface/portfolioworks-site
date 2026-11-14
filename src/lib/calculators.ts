import "server-only";
import { priceSheet, type PriceSheet } from "@/config/pricing";
import { getMarket, marketFromZip, type MarketId } from "@/config/markets";

/**
 * INTERNAL (server-only) price-sheet estimator from Phase 2/3. Phase 4: NOT used by any public page; customers never see
 * prices. Kept for staff tooling / tests. Public tools live in ./planning-tools.ts (no numbers).
 */
export { vacancyCost, planPortfolio, plannerAssumptions } from "./planning-tools";
export type { VacancyInput, VacancyResult, PlannerInput, PlannerResult } from "./planning-tools";

/* ───────────────────────── Tool A — Unit Turnover Cost Estimator (internal) ───────────────────────── */

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

