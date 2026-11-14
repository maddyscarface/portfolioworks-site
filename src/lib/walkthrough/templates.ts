/**
 * PortfolioWorks guided walkthrough templates (revisioned). One short camera prompt per step.
 *
 * Photos, video and plans are EVIDENCE; quantities come from tape or plan measurements typed by the customer.
 * A phone camera overlay cannot measure real space, so we never derive quantities from images.
 *
 * Tenant privacy (spec §3): every template starts with an occupancy + privacy step. Uploads are refused server-side
 * until the person capturing confirms the privacy rules, and are refused for occupied units where the occupant has
 * not been told (src/lib/walkthrough/privacy.ts). We never assume unescorted access to an occupied unit.
 */
export const WALKTHROUGH_SERVICES = ["turnover", "unit_rehab", "capital_improvement", "recurring_program"] as const;
export type WalkthroughService = (typeof WALKTHROUGH_SERVICES)[number];

export type MeasureField = { id: string; label: string; type: "length" | "count"; hint: string; required: boolean };
export type Choice = { id: string; label: string; siteCheck?: boolean };
export type Step =
  | { id: string; kind: "photo" | "video"; title: string; prompt: string; tip?: string; safety?: string; required: boolean; max: number }
  | { id: string; kind: "document"; title: string; prompt: string; tip?: string; required: boolean; max: number }
  | { id: string; kind: "footprint"; title: string; prompt: string; tip?: string; required: boolean }
  | { id: string; kind: "measure"; title: string; prompt: string; tip?: string; fields: MeasureField[] }
  | { id: string; kind: "choice"; title: string; prompt: string; multi: boolean; choices: Choice[]; required: boolean }
  | { id: string; kind: "date"; title: string; prompt: string; required: boolean }
  | { id: string; kind: "text"; title: string; prompt: string; required: boolean };

export type Template = { id: WalkthroughService; revision: number; label: string; short: string; intro: string; multiUnit: boolean; steps: Step[] };

export const PRIVACY_TIP = "Photograph the work, not the people or their things. No faces, mail, IDs, bills, medication, screens or family photos. If something personal is in frame, move it out of the shot or skip that photo.";
const OVERLAY = "Your camera can't measure distances by itself, so we ask for tape or plan measurements separately. Rough is fine; mark anything you can't measure as unknown.";
const SAFETY = "Don't climb ladders, roofs or porches to get a photo, and don't touch exposed wiring, mould or damaged ceilings.";

/** First step of every template. Answers gate uploads (see privacy.ts). */
export const occupancyStep: Step = {
  id: "occupancy", kind: "choice", title: "Who is in the unit?", prompt: "This tells us how we can photograph and visit. We never enter an occupied unit without an arrangement made through you.", multi: false, required: true,
  choices: [
    { id: "vacant", label: "Vacant" },
    { id: "occupied_notified", label: "Occupied: the resident knows and agreed to photos of the work areas" },
    { id: "occupied_not_notified", label: "Occupied: the resident hasn't been told yet" },
    { id: "common_area", label: "Common areas or exterior only" },
  ],
};
export const privacyStep: Step = {
  id: "privacy", kind: "choice", title: "Privacy promise", prompt: "Please confirm all three before adding photos or video.", multi: true, required: true,
  choices: [
    { id: "no_people", label: "I won't photograph or record people (residents, neighbours, children)." },
    { id: "no_personal", label: "I won't capture personal documents, mail, screens, medication, photos or valuables. I'll move them out of frame or skip the shot." },
    { id: "work_areas_only", label: "I'll capture only the rooms and items that need work." },
  ],
};
export const PRIVACY_ACKS = ["no_people", "no_personal", "work_areas_only"] as const;

const vacancyStep: Step = { id: "vacancy_date", kind: "date", title: "Vacancy or move-out date", prompt: "When is (or was) the unit empty? Leave blank if it stays occupied or you're not sure.", required: false };
const targetStep: Step = { id: "target_date", kind: "date", title: "Target ready date", prompt: "When would you like the work finished? This is your target, not a promise from us.", required: false };
const accessStep: Step = {
  id: "access", kind: "choice", title: "Access", prompt: "How would our team get in? Pick all that apply.", multi: true, required: true,
  choices: [
    { id: "lockbox", label: "Lockbox or key pickup (vacant)" },
    { id: "meet_on_site", label: "Owner or manager meets us on site" },
    { id: "resident_schedule", label: "Visits must be scheduled with the resident through you" },
    { id: "restricted_areas", label: "Some areas are off-limits (tell us in notes)" },
    { id: "parking_limited", label: "Limited parking or loading" },
  ],
};
const restrictedStep: Step = { id: "restrictions", kind: "text", title: "Occupied-area restrictions", prompt: "Rooms we must not enter or photograph, quiet hours, pets, alarm or building rules.", required: false };
const floorPlanStep: Step = { id: "floor_plan", kind: "document", title: "Floor plan (optional)", prompt: "If you have a floor plan or listing plan you're allowed to share, add it as a PDF or photo.", tip: "Only share plans you have permission to share. Remove any names or unit-holder details first.", required: false, max: 3 };
const roomsStep = (multi: boolean): Step => ({
  id: "rooms", kind: "footprint", title: multi ? "Units and rooms" : "Rooms",
  prompt: multi ? "Add each room that needs work. Put the unit number or name on every row so we can keep units separate." : "Add each room that needs work with its length and width. Use one row per room.",
  tip: OVERLAY, required: true,
});
const heightStep: Step = {
  id: "heights", kind: "measure", title: "Ceiling height and counts", prompt: "Measure one typical ceiling height and count what applies.", tip: OVERLAY,
  fields: [
    { id: "ceiling_height", label: "Typical ceiling height", type: "length", hint: "e.g. 8'", required: true },
    { id: "bedrooms", label: "Bedrooms", type: "count", hint: "e.g. 2", required: false },
    { id: "bathrooms", label: "Bathrooms", type: "count", hint: "e.g. 1", required: false },
    { id: "doors", label: "Interior doors needing work", type: "count", hint: "e.g. 3", required: false },
    { id: "windows", label: "Windows needing work", type: "count", hint: "e.g. 2", required: false },
  ],
};
const finishStep: Step = {
  id: "finish", kind: "choice", title: "Finish level", prompt: "Pick the closest. You don't have to decide now.", multi: false, required: false,
  choices: [{ id: "rental_grade", label: "Durable rental-grade" }, { id: "match_existing", label: "Match what's there" }, { id: "mid_grade", label: "Mid-grade refresh" }, { id: "owner_spec", label: "Owner specification (attach in notes)" }],
};
const conditionStep: Step = {
  id: "condition", kind: "choice", title: "Anything that needs a closer look?", prompt: "Tick anything you've noticed. These usually mean we check on site before scoping.", multi: true, required: true,
  choices: [
    { id: "water_damage", label: "Water stains, leaks or soft floors", siteCheck: true },
    { id: "mould", label: "Visible mould or musty smell", siteCheck: true },
    { id: "electrical", label: "Electrical problems (sparking, warm outlets, flickering)", siteCheck: true },
    { id: "structural", label: "Sagging ceilings, cracked framing or uneven floors", siteCheck: true },
    { id: "pests", label: "Signs of pests", siteCheck: true },
    { id: "older_paint", label: "Building built before 1978 (lead-safe practices may apply)", siteCheck: true },
    { id: "none", label: "Nothing in particular" },
  ],
};
const videoStep: Step = { id: "walkaround", kind: "video", title: "Optional: a short walk-through video", prompt: "Walk slowly through the work areas for 1–2 minutes and describe what you want done.", tip: PRIVACY_TIP, safety: SAFETY, required: false, max: 1 };
const notesStep: Step = { id: "notes", kind: "text", title: "Anything else?", prompt: "Describe the work in your own words: scope, timing, materials you already have, and anything we should know.", required: false };
const photo = (id: string, title: string, prompt: string, required: boolean, max: number, extra: Partial<Step> = {}): Step => ({ id, kind: "photo", title, prompt, tip: PRIVACY_TIP, required, max, ...extra } as Step);
const scopeChoice = (id: string, title: string, choices: [string, string][]): Step => ({ id, kind: "choice", title, prompt: "Tick everything that applies.", multi: true, required: false, choices: choices.map(([cid, label]) => ({ id: cid, label })) });

const interiorTrades = [
  scopeChoice("paint_drywall", "Paint and drywall", [["patch", "Patch and touch-up"], ["full_paint", "Full repaint (walls)"], ["ceilings", "Ceilings"], ["trim_doors", "Trim and doors"], ["drywall_repair", "Drywall repairs"]]),
  scopeChoice("flooring", "Flooring", [["clean_only", "Clean only"], ["repair", "Repairs"], ["lvp", "New LVP / vinyl plank"], ["carpet", "Carpet"], ["refinish", "Refinish hardwood"], ["tile", "Tile"]]),
  scopeChoice("kitchen", "Kitchen", [["fixtures", "Fixtures and hardware"], ["appliances", "Appliances"], ["counters", "Counters"], ["cabinets", "Cabinets"], ["full", "Full kitchen renovation"]]),
  scopeChoice("bath", "Bathroom(s)", [["fixtures", "Fixtures, caulk and hardware"], ["vanity_toilet", "Vanity or toilet"], ["surround", "Tub/shower surround"], ["full", "Full bathroom renovation"]]),
  scopeChoice("other_trades", "Other work", [["cleaning", "Turnover cleaning"], ["junk", "Debris or junk removal"], ["locks", "Lock change"], ["electrical_minor", "Light fixtures / outlets"], ["plumbing_minor", "Minor plumbing"], ["smoke_co", "Smoke / CO detectors"]]),
];

export const TEMPLATES: Record<WalkthroughService, Template> = {
  turnover: {
    id: "turnover", revision: 1, label: "Unit turnover / make-ready", short: "Get a unit rent-ready", multiUnit: false,
    intro: "Show us the unit room by room. About 10–15 minutes. Prices are never shown here: our estimator reviews it and follows up.",
    steps: [
      occupancyStep, privacyStep, vacancyStep, targetStep, accessStep,
      photo("entry", "Entry and living area", "Stand in the doorway and photograph the main living space.", true, 3),
      photo("kitchen_photo", "Kitchen", "Photograph the kitchen from the doorway, then any damaged items close up.", true, 4),
      photo("bath_photo", "Bathroom(s)", "Photograph each bathroom from the doorway, then any damaged items.", true, 4),
      photo("bedrooms_photo", "Bedrooms", "One photo per bedroom from the doorway. Skip any room the resident hasn't agreed to.", false, 6),
      photo("damage", "Damage close-ups", "Close-ups of holes, stains, broken fixtures or worn flooring.", false, 8),
      roomsStep(false), heightStep, ...interiorTrades, finishStep, conditionStep, restrictedStep, floorPlanStep, videoStep, notesStep,
    ],
  },
  unit_rehab: {
    id: "unit_rehab", revision: 1, label: "Unit rehab / renovation", short: "Renovate a unit", multiUnit: false,
    intro: "Show us the unit and what you want changed. About 15 minutes. Prices are never shown here.",
    steps: [
      occupancyStep, privacyStep, vacancyStep, targetStep, accessStep,
      photo("overview", "Each room", "One wide photo of every room in the scope, from the doorway.", true, 10),
      photo("kitchen_photo", "Kitchen", "Wide photo, then cabinets, counters and appliances.", false, 5),
      photo("bath_photo", "Bathroom(s)", "Wide photo, then tub/shower, vanity and toilet.", false, 5),
      photo("systems", "Panels and fixtures", "Electrical panel, water heater and any fixtures being replaced (only if safe to reach).", false, 4, { safety: SAFETY }),
      roomsStep(false), heightStep, ...interiorTrades, finishStep, conditionStep, restrictedStep, floorPlanStep, videoStep, notesStep,
    ],
  },
  capital_improvement: {
    id: "capital_improvement", revision: 1, label: "Capital improvement", short: "Building systems, exterior or common areas", multiUnit: false,
    intro: "For larger building work: exterior, common areas, porches, systems. About 10 minutes.",
    steps: [
      occupancyStep, privacyStep, targetStep, accessStep,
      photo("building", "The building", "Photograph the building or area from the street or a safe spot.", true, 4, { safety: SAFETY }),
      photo("work_area", "The work areas", "Photograph each area that needs work.", true, 8, { safety: SAFETY }),
      { id: "cap_scope", kind: "choice", title: "Type of work", prompt: "Tick everything that applies.", multi: true, required: true,
        choices: [{ id: "common_areas", label: "Hallways and common areas" }, { id: "exterior_paint", label: "Exterior paint or siding" }, { id: "porch_stairs", label: "Porches, decks or stairs", siteCheck: true }, { id: "roof_gutters", label: "Roof or gutters", siteCheck: true }, { id: "windows_doors", label: "Windows or entry doors" }, { id: "systems", label: "Heating, plumbing or electrical systems", siteCheck: true }, { id: "other", label: "Something else (describe in notes)" }] },
      roomsStep(false),
      { id: "cap_counts", kind: "measure", title: "Size and counts", prompt: "Whatever applies; mark unknown if you can't measure safely.", tip: OVERLAY,
        fields: [
          { id: "units_in_building", label: "Units in the building", type: "count", hint: "e.g. 6", required: false },
          { id: "floors", label: "Floors / storeys", type: "count", hint: "e.g. 3", required: false },
          { id: "stair_flights", label: "Stair flights", type: "count", hint: "e.g. 2", required: false },
          { id: "frontage", label: "Building frontage", type: "length", hint: "e.g. 40'", required: false },
        ] },
      conditionStep, restrictedStep, floorPlanStep, videoStep, notesStep,
    ],
  },
  recurring_program: {
    id: "recurring_program", revision: 1, label: "Multi-unit batch / recurring program", short: "Several units or a recurring program", multiUnit: true,
    intro: "For property managers and owners with several units. Add each unit's rooms with the unit label. You can stop and come back.",
    steps: [
      occupancyStep, privacyStep, targetStep, accessStep,
      { id: "batch", kind: "measure", title: "Batch size", prompt: "How many units are in this batch, and roughly how many turns a year across the portfolio?",
        fields: [
          { id: "units_in_batch", label: "Units in this batch", type: "count", hint: "e.g. 4", required: true },
          { id: "turns_per_year", label: "Turns per year (portfolio, if known)", type: "count", hint: "e.g. 20", required: false },
        ] },
      photo("unit_photos", "Unit photos", "For each unit: one wide photo per room in scope. Start the file name or note with the unit label if you can.", true, 20),
      photo("damage", "Damage close-ups", "Close-ups of anything unusual in any unit.", false, 12),
      roomsStep(true), heightStep, ...interiorTrades, finishStep, conditionStep, restrictedStep, floorPlanStep, notesStep,
    ],
  },
};

export function templateFor(service: string): Template | null {
  return (TEMPLATES as Record<string, Template>)[service] ?? null;
}

/** Map existing lead-form funnels to a walkthrough template. */
export function serviceFromFunnel(funnel?: string, contractType?: string): WalkthroughService {
  if (contractType === "recurring" || funnel === "portfolio") return "recurring_program";
  if (funnel === "rehab") return "unit_rehab";
  if (funnel === "trade") return "capital_improvement";
  return "turnover";
}
