/**
 * Case-study template (specs/03 §1): challenge, scope, trades, scheduling, before/after, closeout,
 * and anonymized results ONLY when real. Add entries only for completed PortfolioWorks projects with
 * owner permission. Never use stock photography here.
 */
export interface CaseStudy {
  slug: string;
  title: string;
  /** City / submarket only — no street addresses or tenant details. */
  location: string;
  propertyType: string;
  challenge: string;
  scope: string[];
  trades: string[];
  scheduling: { planned: string; actual: string; variance?: string };
  /** Real job-file photos only (public/photos/projects/...). */
  beforeAfter: { before: string; after: string; caption: string }[];
  closeout: string;
  /** Anonymized, verified results. Leave undefined unless the numbers are real and approved. */
  results?: string[];
  ownerPermission: true;
}

export const CASE_STUDY_SECTIONS: [string, string][] = [
  ["Challenge", "Property type, unit count, starting condition and what had to happen by when."],
  ["Scope", "The approved line-item scope, allowances and exclusions."],
  ["Trades", "Which trades were involved and how licensed work was handled."],
  ["Scheduling", "Planned vs. actual dates, with the reason for any variance."],
  ["Before / after", "Photography from the job file, never stock imagery."],
  ["Closeout", "Punch walk, completion record, change orders and invoice matched to scope."],
  ["Results", "Anonymized outcomes, published only when the numbers are real and approved."],
];

export const caseStudies: CaseStudy[] = [];
