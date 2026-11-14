import "server-only";
import type { EstimateConfig } from "@/lib/estimate/qualifiers";

/**
 * INTERNAL (server-only) copy of the Phase 3 qualifier config WITH planning ranges and budget bands. Used only by the
 * lead API (scoring / internal brief) and the GHL payload behind GHL_SEND_INTERNAL_PRICING. Never import from a client
 * component; the public, number-free config is ./estimate.ts.
 *
 * PortfolioWorks pre-estimate qualifiers (turnover, urgent, rehab, trade and walkthrough funnels).
 * The portfolio-partnership and contact forms skip this step.
 *
 * [OWNER TO CONFIRM] Ranges are derived from the PLACEHOLDER internal sheet in src/config/pricing.ts
 * (× the 0.85–1.2 spread) for Greater Boston. Replace with real costs + margin, then set
 * rangesConfirmed: true. FL/ME are non-launch markets.
 *
 * `start` ids equal the existing `timeline` enum, and every budget band maps onto the existing
 * `budget` enum (see BUDGET_TO_LEGACY) so scoring and GHL fields keep working.
 *
 * favorites: there are no published case studies yet, so customers pick a finish level, the main
 * driver of the offer. Add real projects here when /projects has them.
 */
export const internalEstimateConfig: EstimateConfig = {
  brand: "PortfolioWorks",
  visitLabel: "property walkthrough",
  timezone: "America/New_York",
  tzLabel: "Eastern Time",
  projectTypes: [
    {
      id: "turnover", label: "Unit turnover / make-ready",
      sizes: [
        { id: "light", label: "Light turn", hint: "Touch-up paint, clean, small repairs", typical: [900, 2500] },
        { id: "moderate", label: "Moderate turn", hint: "Full paint, some flooring and repairs", typical: [3000, 8000] },
        { id: "heavy", label: "Heavy turn", hint: "Flooring, kitchen/bath refresh, damage", typical: [8000, 20000] },
      ],
      addOns: [
        { id: "kitchen_refresh", label: "Kitchen refresh", typical: [1200, 1700] },
        { id: "bath_refresh", label: "Bathroom refresh", typical: [750, 1100] },
        { id: "lvp", label: "New LVP flooring", typical: [3000, 6000] },
        { id: "cleaning", label: "Turnover cleaning", typical: [275, 500] },
      ],
    },
    {
      id: "painting", label: "Painting & drywall",
      sizes: [
        { id: "rooms", label: "1–2 rooms", typical: [600, 1800] },
        { id: "unit_sm", label: "Whole unit, up to 1,000 sq ft", typical: [2200, 3800] },
        { id: "unit_lg", label: "Whole unit, 1,000–2,000 sq ft", typical: [3800, 7000] },
        { id: "common", label: "Building common areas", typical: [3000, 12000] },
      ],
    },
    {
      id: "flooring", label: "Flooring",
      sizes: [
        { id: "repair", label: "Repair a section", typical: [550, 800] },
        { id: "room", label: "LVP, one or two rooms", typical: [1000, 2500] },
        { id: "unit", label: "LVP, whole unit", typical: [5000, 9000] },
        { id: "refinish", label: "Refinish hardwood", typical: [2500, 5000] },
      ],
    },
    {
      id: "bathroom", label: "Bathroom",
      sizes: [
        { id: "refresh", label: "Refresh", hint: "Fixtures, caulk, paint, vanity", typical: [750, 1100] },
        { id: "upgrade", label: "Upgrade", hint: "New vanity, toilet, surround", typical: [4000, 5800] },
        { id: "full", label: "Full remodel", typical: [12000, 17500] },
      ],
    },
    {
      id: "kitchen", label: "Kitchen",
      sizes: [
        { id: "refresh", label: "Refresh", hint: "Paint, hardware, fixtures", typical: [1200, 1700] },
        { id: "upgrade", label: "Upgrade", hint: "Counters, sink, some cabinets", typical: [6400, 9000] },
        { id: "full", label: "Full remodel", typical: [18500, 26500] },
      ],
    },
    {
      id: "rehab", label: "Full rehab / value-add",
      sizes: [
        { id: "unit", label: "One unit", typical: [35000, 80000] },
        { id: "bldg_2_4", label: "2–4 unit building", typical: [100000, 300000] },
        { id: "bldg_5p", label: "5+ unit building", typical: [300000, 1000000] },
      ],
    },
    {
      id: "exterior", label: "Exterior / porches / decks",
      sizes: [
        { id: "small", label: "Small repair", typical: [500, 2500] },
        { id: "porch", label: "Porch, deck or stair repair", typical: [2500, 12000] },
        { id: "large", label: "Larger exterior project", typical: [10000, 40000] },
      ],
    },
  ],
  budgetBands: [
    { id: "lt2_5k", label: "Under $2.5k", min: 0, max: 2500 },
    { id: "2_5_5k", label: "$2.5–5k", min: 2500, max: 5000 },
    { id: "5_15k", label: "$5–15k", min: 5000, max: 15000 },
    { id: "15_50k", label: "$15–50k", min: 15000, max: 50000 },
    { id: "50_150k", label: "$50–150k", min: 50000, max: 150000 },
    { id: "150kp", label: "$150k+", min: 150000, max: null },
    { id: "unsure", label: "Not sure yet", min: 0, max: null },
  ],
  startOptions: [
    { id: "asap", label: "As soon as possible" },
    { id: "2-weeks", label: "Within 2 weeks" },
    { id: "30-days", label: "Within 30 days" },
    { id: "60-90-days", label: "60–90 days" },
    { id: "planning", label: "Planning / budgeting" },
  ],
  timeWindows: [
    { id: "0800", label: "8:00 AM", start: "08:00", end: "09:00" },
    { id: "1000", label: "10:00 AM", start: "10:00", end: "11:00" },
    { id: "1200", label: "12:00 PM", start: "12:00", end: "13:00" },
    { id: "1400", label: "2:00 PM", start: "14:00", end: "15:00" },
    { id: "1600", label: "4:00 PM", start: "16:00", end: "17:00" },
  ],
  minLeadDays: 1,
  favorites: {
    prompt: "What finish level fits this property?",
    options: [
      { id: "rental_grade", label: "Durable rental-grade" },
      { id: "mid_grade", label: "Mid-grade refresh" },
      { id: "premium", label: "Premium / owner-occupied" },
      { id: "match_existing", label: "Match what's there" },
    ],
  },
  priceGuidePath: "/unit-turn-estimator",
  rangeNote: "Greater Boston planning range, not a quote. Your written scope and price follow the walkthrough.",
  rangesConfirmed: false,
  addressRequired: false,
  addressLabel: "Property address",
};
