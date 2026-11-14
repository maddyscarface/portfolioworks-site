import type { EstimateConfig } from "@/lib/estimate/qualifiers";
import type { BriefTheme } from "@/lib/estimate/lead-brief";
import type { QualifierTheme } from "@/components/estimate/EstimateQualifiers";

/**
 * PortfolioWorks pre-estimate qualifiers: PUBLIC, client-safe config (turnover, urgent, rehab, trade and walkthrough).
 *
 * PHASE 4: customers never see prices, ranges, budget brackets or calculations. This file is bundled into client
 * components, so it carries NO numbers. Internal planning ranges live in ./estimate-internal.ts (server-only).
 * `start` ids equal the existing `timeline` enum; budget stays "unknown" from public forms.
 *
 * favorites: there are no published case studies yet, so customers pick a finish level, the main
 * driver of the offer. Add real projects here when /projects has them.
 */
export const estimateConfig: EstimateConfig = {
  brand: "PortfolioWorks",
  visitLabel: "property walkthrough",
  timezone: "America/New_York",
  tzLabel: "Eastern Time",
  projectTypes: [
    {
      id: "turnover", label: "Unit turnover / make-ready",
      sizes: [
        { id: "light", label: "Light turn", hint: "Touch-up paint, clean, small repairs" },
        { id: "moderate", label: "Moderate turn", hint: "Full paint, some flooring and repairs" },
        { id: "heavy", label: "Heavy turn", hint: "Flooring, kitchen/bath refresh, damage" },
      ],
      addOns: [
        { id: "kitchen_refresh", label: "Kitchen refresh" },
        { id: "bath_refresh", label: "Bathroom refresh" },
        { id: "lvp", label: "New LVP flooring" },
        { id: "cleaning", label: "Turnover cleaning" },
      ],
    },
    {
      id: "painting", label: "Painting & drywall",
      sizes: [
        { id: "rooms", label: "1–2 rooms" },
        { id: "unit_sm", label: "Whole unit, up to 1,000 sq ft" },
        { id: "unit_lg", label: "Whole unit, 1,000–2,000 sq ft" },
        { id: "common", label: "Building common areas" },
      ],
    },
    {
      id: "flooring", label: "Flooring",
      sizes: [
        { id: "repair", label: "Repair a section" },
        { id: "room", label: "LVP, one or two rooms" },
        { id: "unit", label: "LVP, whole unit" },
        { id: "refinish", label: "Refinish hardwood" },
      ],
    },
    {
      id: "bathroom", label: "Bathroom",
      sizes: [
        { id: "refresh", label: "Refresh", hint: "Fixtures, caulk, paint, vanity" },
        { id: "upgrade", label: "Upgrade", hint: "New vanity, toilet, surround" },
        { id: "full", label: "Full remodel" },
      ],
    },
    {
      id: "kitchen", label: "Kitchen",
      sizes: [
        { id: "refresh", label: "Refresh", hint: "Paint, hardware, fixtures" },
        { id: "upgrade", label: "Upgrade", hint: "Counters, sink, some cabinets" },
        { id: "full", label: "Full remodel" },
      ],
    },
    {
      id: "rehab", label: "Full rehab / value-add",
      sizes: [
        { id: "unit", label: "One unit" },
        { id: "bldg_2_4", label: "2–4 unit building" },
        { id: "bldg_5p", label: "5+ unit building" },
      ],
    },
    {
      id: "exterior", label: "Exterior / porches / decks",
      sizes: [
        { id: "small", label: "Small repair" },
        { id: "porch", label: "Porch, deck or stair repair" },
        { id: "large", label: "Larger exterior project" },
      ],
    },
  ],
  budgetBands: [],
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
  rangeNote: "Your written scope and price follow the walkthrough. We don't show prices online.",
  rangesConfirmed: false,
  addressRequired: false,
  addressLabel: "Property address",
};

/** Qualifier budget band → the existing `budget` enum used by scoring and the pw_budget GHL field. */
export const BUDGET_TO_LEGACY: Record<string, "under-5k" | "5-15k" | "15-50k" | "50-150k" | "150k-plus" | "unknown"> = {
  lt2_5k: "under-5k", "2_5_5k": "under-5k", "5_15k": "5-15k", "15_50k": "15-50k", "50_150k": "50-150k", "150kp": "150k-plus", unsure: "unknown",
};

export const briefTheme: BriefTheme = { dark: "#142036", accent: "#c08a52", accentSoft: "#f1e6d8", ink: "#16191d", muted: "#4b5563" };

export const qualifierTheme: QualifierTheme = {
  input: "input",
  label: "label",
  chip: "chip text-left",
  chipOn: "chip text-left",
  box: "border border-bronze bg-bronze-soft p-4",
  muted: "text-slate",
  link: "underline font-medium",
};
