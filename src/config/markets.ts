export type MarketId = "massachusetts" | "florida" | "maine";

/**
 * launch            → pages indexed, ads allowed, booking open
 * licensing-pending → pages live but noindex, ads OFF, leads go to waitlist review
 * evaluation        → pages live but noindex, ads OFF, leads go to waitlist review
 */
export type MarketStatus = "launch" | "licensing-pending" | "evaluation";

export interface Town {
  slug: string;
  name: string;
  /** Only towns with served=true get a town page. Flip after crew coverage is confirmed. */
  served: boolean;
  tier: "core" | "extended";
  notes?: string;
}

export interface Market {
  id: MarketId;
  name: string;
  short: string;
  state: string;
  status: MarketStatus;
  headline: string;
  intro: string;
  housingContext: string;
  licensingNotes: string[];
  /** Applied to the base price sheet in the estimator. Owner-editable. */
  priceMultiplier: number;
  calendarEnv: string;
  ghlPipelineEnv: string;
  salesTerritory: string;
  zipPrefixes: string[];
  towns: Town[];
}

const t = (name: string, served: boolean, tier: Town["tier"] = "core", notes?: string): Town => ({
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name,
  served,
  tier,
  notes,
});

export const markets: Market[] = [
  {
    id: "massachusetts",
    name: "Greater Boston, Massachusetts",
    short: "Greater Boston",
    state: "MA",
    status: "launch",
    headline: "Rental turnovers and renovations across Greater Boston",
    intro:
      "Boston-area rentals are older, denser and more regulated than most markets. Triple-deckers, brick walk-ups and converted condos each bring their own turnover realities: plaster walls, lead-safe requirements on pre-1978 housing, tight access and limited parking. PortfolioWorks scopes for those conditions up front.",
    housingContext:
      "Much of the housing stock in Boston, Cambridge, Somerville and Quincy predates 1978, so lead-safe renovation practices and documentation are part of normal turnover planning, not an exception.",
    licensingNotes: [
      "Residential contracting on 1–4 unit owner-occupied homes generally requires Home Improvement Contractor (HIC) registration; structural work generally requires a Construction Supervisor License. Confirm what applies to each job.",
      "Plumbing, gas and electrical work is performed by appropriately licensed trades.",
      "Pre-1978 housing: EPA RRP / Massachusetts lead-safe renovation rules apply to work that disturbs painted surfaces.",
      "Permits are pulled by the party required to pull them under local building department rules.",
    ],
    priceMultiplier: 1.0,
    calendarEnv: "GHL_CALENDAR_MA",
    ghlPipelineEnv: "GHL_PIPELINE_MA",
    salesTerritory: "MA-01 Greater Boston",
    zipPrefixes: ["010", "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021", "022", "023", "024", "025", "026", "027"],
    towns: [
      t("Boston", true),
      t("Cambridge", true),
      t("Somerville", true),
      t("Brookline", true),
      t("Newton", true),
      t("Quincy", true),
      t("Braintree", true),
      t("Milton", true),
      t("Medford", true),
      t("Arlington", true),
      t("Watertown", true),
      t("Waltham", true),
      t("Needham", true),
      t("Wellesley", true),
      t("Dedham", true),
      t("Framingham", false, "extended", "MetroWest — confirm crew coverage"),
      t("Natick", false, "extended", "MetroWest — confirm crew coverage"),
      t("Weymouth", false, "extended", "South Shore — confirm crew coverage"),
      t("Hingham", false, "extended", "South Shore — confirm crew coverage"),
    ],
  },
  {
    id: "florida",
    name: "Southeast Florida",
    short: "Southeast Florida",
    state: "FL",
    status: "licensing-pending",
    headline: "Rental turnovers and condo renovations in Palm Beach and Broward",
    intro:
      "Southeast Florida rentals turn on a different calendar: seasonal leases, condo association rules, hurricane-season scheduling and humidity that punishes the wrong materials. PortfolioWorks plans turns around association approvals, elevator bookings and moisture-appropriate finishes.",
    housingContext:
      "Many rental units sit inside condo associations, so work windows, insurance certificates and contractor registration with management are part of the scope before a crew arrives.",
    licensingNotes: [
      "Florida requires state certification or local registration for many contracting scopes (DBPR / county licensing). A Massachusetts license does NOT carry over.",
      "Palm Beach and Broward counties have their own competency-card and permitting rules; confirm per scope.",
      "Condo associations commonly require a certificate of insurance naming the association before work begins.",
      "Until Florida licensing and insurance are verified, this market is shown as coming soon and paid ads remain off.",
    ],
    priceMultiplier: 0.95,
    calendarEnv: "GHL_CALENDAR_FL",
    ghlPipelineEnv: "GHL_PIPELINE_FL",
    salesTerritory: "FL-01 Palm Beach / Broward",
    zipPrefixes: ["330", "331", "333", "334"],
    towns: [
      t("Boca Raton", true),
      t("Delray Beach", true),
      t("West Palm Beach", true),
      t("Palm Beach", true),
      t("Fort Lauderdale", true),
      t("Palm Beach Gardens", false, "extended", "Add when crew capacity is confirmed"),
      t("Boynton Beach", false, "extended", "Add when crew capacity is confirmed"),
      t("Pompano Beach", false, "extended", "Add when crew capacity is confirmed"),
      t("Deerfield Beach", false, "extended", "Add when crew capacity is confirmed"),
      t("Plantation", false, "extended", "Add when crew capacity is confirmed"),
      t("Weston", false, "extended", "Add when crew capacity is confirmed"),
      t("Coral Springs", false, "extended", "Add when crew capacity is confirmed"),
    ],
  },
  {
    id: "maine",
    name: "Southern Maine",
    short: "Southern Maine",
    state: "ME",
    status: "evaluation",
    headline: "Rental and seasonal property work in the Kennebunks",
    intro:
      "Kennebunk and Kennebunkport rentals include year-round units and seasonal homes with tight off-season work windows. PortfolioWorks is evaluating this market and accepts project inquiries for review.",
    housingContext:
      "Seasonal properties need work completed in the shoulder months, with exterior and weather-sensitive scopes scheduled around Maine's construction season.",
    licensingNotes: [
      "Maine has no statewide general contractor license, but electrical, plumbing and some other trades are state-licensed, and municipalities enforce their own permits.",
      "Maine's Home Construction Contracts Act requires written contracts with specific terms for residential jobs over $3,000.",
      "Nearby coverage beyond Kennebunk/Kennebunkport is verified before it is advertised.",
    ],
    priceMultiplier: 1.0,
    calendarEnv: "GHL_CALENDAR_ME",
    ghlPipelineEnv: "GHL_PIPELINE_ME",
    salesTerritory: "ME-01 York County",
    zipPrefixes: ["039", "040"],
    towns: [t("Kennebunk", true), t("Kennebunkport", true), t("Wells", false, "extended"), t("Biddeford", false, "extended")],
  },
];

export const getMarket = (id: string) => markets.find((m) => m.id === id);

export function marketFromZip(zip: string | undefined | null): MarketId | null {
  if (!zip) return null;
  const p = zip.trim().slice(0, 3);
  for (const m of markets) if (m.zipPrefixes.includes(p)) return m.id;
  return null;
}

export const servedTowns = () =>
  markets.flatMap((m) => m.towns.filter((tw) => tw.served).map((tw) => ({ market: m, town: tw })));

export const isIndexable = (m: Market) => m.status === "launch";

const MARKET_DESCRIPTIONS: Record<string, string> = {
  massachusetts:
    "Rental turnovers, repairs and renovations for landlords and managers across Greater Boston, scoped for older housing, access limits and documented closeout.",
  florida:
    "Southeast Florida rental turnovers and condo renovations are forthcoming. This market is not active until Florida licensing and insurance are verified.",
  maine:
    "PortfolioWorks is evaluating rental and seasonal property work in Southern Maine and accepts inquiries for review. This is not an active service market.",
};

export function marketPageTitle(m: Market): string {
  return `${m.short} Rental Contractor | PortfolioWorks`;
}

export function marketPageDescription(m: Market): string {
  return MARKET_DESCRIPTIONS[m.id] ?? m.intro;
}

export function townPageTitle(t: Town): string {
  return `${t.name} Rental Turnovers | PortfolioWorks`;
}

export function townPageDescription(t: Town, m: Market): string {
  return `Turnovers, repairs and renovations for landlords and property managers in ${t.name}, ${m.state}. One scope, one schedule, one accountable contractor.`;
}
