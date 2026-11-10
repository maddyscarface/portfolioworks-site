/**
 * EDITABLE INTERNAL PRICE SHEET — PLACEHOLDER VALUES.
 *
 * These numbers are starting assumptions for Greater Boston so the estimator works
 * end to end. Replace them with your actual crew and subcontractor costs + target
 * margin before the estimator goes live. Market multipliers live in markets.ts.
 *
 * Every output from this sheet is a PRELIMINARY RANGE, never a quote.
 */
export const priceSheet = {
  version: "2026-11-draft",
  currency: "USD",
  /** Low/high spread applied around the midpoint to express uncertainty. */
  rangeSpread: { low: 0.85, high: 1.2 },
  painting: {
    none: 0,
    touchup: { perBedroom: 175, perBathroom: 125, base: 250 },
    full: { perSqft: 2.6, ceilingsAddPerSqft: 0.9 },
  },
  flooring: {
    none: 0,
    repair: { flat: 650 },
    lvpPartial: { share: 0.45, perSqft: 7.5 },
    lvpFull: { share: 0.85, perSqft: 7.5 },
    hardwoodRefinish: { share: 0.7, perSqft: 4.75 },
  },
  kitchen: { none: 0, refresh: 1400, upgrade: 7500, full: 22000 },
  bathroom: { none: 0, refresh: 900, upgrade: 4800, full: 14500 }, // per bathroom
  carpentry: { none: 0, minor: 450, moderate: 1300, major: 3200 },
  cleaning: { perSqft: 0.35, min: 275 },
  coordination: { pct: 0.0 }, // coordination is embedded in line pricing by default
  damageMultiplier: { light: 0.9, moderate: 1.0, heavy: 1.3 },
  /** Typical calendar days by turn intensity (crew availability not included). */
  durationDays: { light: [3, 5], moderate: [5, 10], heavy: [10, 21] },
  unitTypeMultiplier: { apartment: 1.0, condo: 1.05, "single-family": 1.1, townhouse: 1.05, "multi-family-unit": 1.0 },
} as const;

export type PriceSheet = typeof priceSheet;
