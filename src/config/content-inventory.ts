/**
 * Keyword-to-URL map for Phase 3 SEO/GEO/AEO.
 * Query groups are planning topics for Search Console validation, not claimed search-volume data.
 */
export type IntentStage = "informational" | "commercial" | "transactional";

export interface RouteBrief {
  path: string;
  audience: string;
  queryGroup: string;
  stage: IntentStage;
  primaryKeyword: string;
  secondary: string[];
  h1: string;
  indexable: boolean;
  evidence: string;
  cta: { label: string; href: string };
  schema: string[];
  region: string;
}

export const contentInventory: RouteBrief[] = [
  {
    path: "/",
    audience: "Landlords, investors and property managers in Greater Boston",
    queryGroup: "rental turnovers and portfolio renovations Greater Boston",
    stage: "commercial",
    primaryKeyword: "rental turnover contractors Boston",
    secondary: ["apartment make-ready Boston", "landlord renovation contractors Massachusetts", "property portfolio maintenance Boston"],
    h1: "Rental Turnovers and Renovations in Greater Boston",
    indexable: true,
    evidence: "Operational process copy only; no project history or savings claims until owner-approved case studies exist.",
    cta: { label: "Plan a Unit Turnover", href: "/request-a-turnover" },
    schema: ["Organization", "ProfessionalService", "WebSite", "WebPage", "FAQPage", "BreadcrumbList"],
    region: "Greater Boston, MA (launch market only)",
  },
  {
    path: "/rental-turnovers",
    audience: "Landlords and property managers coordinating unit make-readies",
    queryGroup: "unit turnover coordination",
    stage: "commercial",
    primaryKeyword: "rental unit turnovers Boston",
    secondary: ["apartment make-ready Boston", "unit turnover coordination"],
    h1: "Rental Unit Turnovers in Greater Boston",
    indexable: true,
    evidence: "Access, readiness checklist, trade sequence, vacancy handoff and photo documentation. No staffed turnaround promise.",
    cta: { label: "Plan a Unit Turnover", href: "/request-a-turnover" },
    schema: ["Service", "WebPage", "BreadcrumbList", "FAQPage"],
    region: "Greater Boston, MA",
  },
  {
    path: "/rental-renovations",
    audience: "Landlords and investors planning rental rehab",
    queryGroup: "rental property rehab Boston",
    stage: "commercial",
    primaryKeyword: "rental property renovations Boston",
    secondary: ["multifamily renovations Boston", "investment property renovation", "landlord renovation contractors Massachusetts"],
    h1: "Rental Property Renovations in Greater Boston",
    indexable: true,
    evidence: "Scope validation, trades, material specifications, approvals and change-order process. Pricing is planning-only until a written scope is approved.",
    cta: { label: "Request Renovation Estimate", href: "/request-a-renovation-estimate" },
    schema: ["Service", "WebPage", "BreadcrumbList", "FAQPage"],
    region: "Greater Boston, MA",
  },
  {
    path: "/portfolio-programs",
    audience: "Property managers and portfolio owners",
    queryGroup: "property portfolio maintenance Boston",
    stage: "commercial",
    primaryKeyword: "portfolio maintenance programs Boston",
    secondary: ["property portfolio maintenance Boston", "unit turnover coordination"],
    h1: "Portfolio Maintenance Programs for Greater Boston Owners",
    indexable: true,
    evidence: "Service-level expectations, volume, location, reporting and cost governance. No emergency-response or capacity guarantee.",
    cta: { label: "Discuss a Portfolio Program", href: "/portfolio-programs#consultation" },
    schema: ["Service", "WebPage", "BreadcrumbList", "FAQPage"],
    region: "Greater Boston, MA",
  },
  {
    path: "/home-renovations",
    audience: "Residential owner-occupants",
    queryGroup: "home renovations Greater Boston",
    stage: "commercial",
    primaryKeyword: "home renovation contractor Greater Boston",
    secondary: ["kitchen bath renovation Boston"],
    h1: "Owner-occupied home renovations (distinct from rental work)",
    indexable: true,
    evidence: "Residential-only CTAs and services preserved from Phase 2.",
    cta: { label: "Request a Property Walkthrough", href: "/request-a-property-walkthrough" },
    schema: ["WebPage", "BreadcrumbList", "FAQPage"],
    region: "Greater Boston, MA",
  },
  {
    path: "/unit-turn-estimator",
    audience: "Owners planning a single-unit budget",
    queryGroup: "apartment turnover cost Boston",
    stage: "commercial",
    primaryKeyword: "unit turnover cost estimator",
    secondary: ["apartment turnover cost boston"],
    h1: "Unit turnover cost estimator",
    indexable: true,
    evidence: "Shows assumption date and planning-only disclaimer; not a contractual bid.",
    cta: { label: "Request a written scope", href: "/request-a-turnover" },
    schema: ["WebPage", "BreadcrumbList"],
    region: "Greater Boston, MA",
  },
];
