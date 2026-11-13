/**
 * PortfolioWorks — global site configuration.
 *
 * LAUNCH GATE: every field marked `VERIFY` must be confirmed by the owner before
 * it is shown publicly. Unverified credentials render as hidden (null) — the UI
 * never displays a license number, insurance carrier or entity status that is null.
 */
export const site = {
  name: "PortfolioWorks",
  legalName: "PortfolioWorks Contracting & Property Services", // VERIFY: entity / DBA filing
  domain: "portfolioworkscontracting.com", // VERIFY: domain + USPTO trademark search
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolioworkscontracting.com",
  /** Production canonical origin (never a vercel.app staging host). VERIFY domain before go-live. */
  canonicalUrl: process.env.NEXT_PUBLIC_CANONICAL_URL ?? "https://portfolioworkscontracting.com",
  tagline: "One Partner. Every Property. Every Project.",
  altHeadline: "Stop Managing Contractors. Start Managing Your Portfolio.",
  campaignTagline: "We Handle the Hard Part.",
  heroEyebrow: "PortfolioWorks · Contracting & Property Services",
  heroHeadline: "Rental Turnovers and Renovations in Greater Boston",
  heroSecondary: "Your Next Tenant Shouldn't Be Waiting on Five Different Contractors.",
  heroSub:
    "PortfolioWorks coordinates unit make-readies, renovation scopes and recurring property work for landlords, investors and property managers. One team organizes the work, schedule and documented closeout.",
  supporting:
    "From single-unit turnovers to complete residential rehabilitation, PortfolioWorks coordinates the trades, scopes, schedules and project execution landlords need to keep properties performing.",
  /** The three homepage pathways (specs/03 §1). Each opens its own funnel, form and GHL routing. */
  pathways: [
    { label: "Plan a Unit Turnover", href: "/request-a-turnover" },
    { label: "Request Renovation Estimate", href: "/request-a-renovation-estimate" },
    { label: "Discuss a Portfolio Program", href: "/portfolio-programs#consultation" },
  ],
  ctas: {
    primary: { label: "Get a Property Project Plan", href: "/request-a-property-walkthrough" },
    secondary: { label: "Explore Portfolio Services", href: "/services" },
    commercial: { label: "Discuss a Portfolio Program", href: "/portfolio-programs#consultation" },
  },
  phone: process.env.NEXT_PUBLIC_PHONE ?? null, // VERIFY: tracking number per market
  email: "projects@portfolioworkscontracting.com", // VERIFY: mailbox exists
  /** Response-time promises are only shown if staffed. Leave false until coverage exists. */
  urgentTurnoverStaffed: false,
  urgentResponseCopy: "Same-week site walk where crew availability allows",
};

export const founder = {
  name: "Gary Acquah",
  title: "Founder & Managing Director",
  /**
   * LAUNCH GATE: degrees, licences and certifications below are hidden site-wide (and left out of
   * schema.org) until the owner confirms each string and flips this to true.
   */
  credentialsVerified: false,
  // VERIFY each credential string before launch (wording appears exactly as written here).
  credentials: [
    "MBA, Cornell University",
    "MS, Construction Project Management — Worcester Polytechnic Institute",
    "Massachusetts Construction Supervisor / General Contractor license — VERIFY type and number",
    "OSHA 30",
  ],
  bio: [
    "Gary has spent his career on the owner's side of the table: developing, renovating and operating residential property across Greater Boston, with a focus on affordable and workforce housing.",
    "He has managed construction budgets, scopes and contractor teams for both private portfolios and mission-driven developers, including finance and development work with Habitat for Humanity Greater Boston.",
    "PortfolioWorks exists because he has personally made the five phone calls, waited on the bid that never came and walked the punch list that never closed. The company is built to replace that process with one accountable system.",
  ],
};

/**
 * Credentials displayed per market. `null` = not verified → not rendered.
 * Do not imply a Massachusetts license extends to Florida or Maine.
 */
export const credentialsByMarket: Record<
  "massachusetts" | "florida" | "maine",
  { license: string | null; hicRegistration: string | null; insurance: string | null; entity: string | null }
> = {
  massachusetts: { license: null, hicRegistration: null, insurance: null, entity: null },
  florida: { license: null, hicRegistration: null, insurance: null, entity: null },
  maine: { license: null, hicRegistration: null, insurance: null, entity: null },
};

/** Founder credentials safe to display: none until `founder.credentialsVerified` is true, and never a VERIFY string. */
export const verifiedFounderCredentials = () => (founder.credentialsVerified ? founder.credentials.filter((c) => !c.includes("VERIFY")) : []);
