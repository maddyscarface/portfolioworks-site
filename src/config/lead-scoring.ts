/**
 * Lead scoring weights (owner-editable). Score = sum of points, capped at 100; qualifier answers add
 * or subtract points in the API route; tiers drive GHL tags (pw-tier:*) and follow-up workflows
 * (src/config/ghl.ts). Change numbers here, run `npm test`, redeploy.
 */
export const scoringWeights = {
  customerType: { "property-manager": 25, "portfolio-owner": 25, investor: 20, hoa: 15, landlord: 10, broker: 10, homeowner: 8, other: 0 },
  units: [
    { min: 100, pts: 25 },
    { min: 25, pts: 20 },
    { min: 10, pts: 15 },
    { min: 3, pts: 8 },
    { min: 0, pts: 3 },
  ],
  budget: { "150k-plus": 20, "50-150k": 16, "15-50k": 12, "5-15k": 8, "under-5k": 4, unknown: 2 },
  timeline: { asap: 12, "2-weeks": 12, "30-days": 9, "60-90-days": 5, planning: 2 },
  contractType: { recurring: 10, "single-project": 3, unsure: 2 },
  inMarket: 8,
  photos: 3,
  thresholds: { hot: 60, warm: 35 },
};
