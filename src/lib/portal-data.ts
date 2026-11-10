/**
 * Portal / field-ops data model + DEMO DATA.
 *
 * Demo records below are fictional and exist only to render the portal and admin
 * prototypes. In production these entities live in Postgres (schema: docs/db/schema.sql)
 * and every customer-facing query MUST be scoped by accountId from the authenticated
 * session — never from a URL or request body.
 */
export type ContractType = "fixed-price" | "time-and-materials" | "cost-plus-gmp";
export type ProjectStage = "requested" | "estimating" | "proposal" | "approved" | "scheduled" | "in-progress" | "punch-list" | "complete" | "invoiced" | "paid";

export interface Account { id: string; name: string; type: "property-manager" | "portfolio-owner" | "landlord" | "investor" | "hoa"; market: string }
export interface Owner { id: string; accountId: string; name: string }
export interface Property { id: string; accountId: string; ownerId: string; address: string; city: string; units: number; yearBuilt: number }
export interface ChangeOrder { id: string; description: string; amount: number; status: "pending" | "approved" | "rejected"; requestedAt: string }
export interface PunchItem { id: string; text: string; done: boolean }
export interface Project {
  id: string;
  propertyId: string;
  unit: string;
  title: string;
  service: string;
  stage: ProjectStage;
  contractType: ContractType;
  pm: string;
  subs: string[];
  estimate: number;
  contractValue: number;
  costToDate: number;
  forecastCost: number;
  start: string;
  due: string;
  changeOrders: ChangeOrder[];
  punch: PunchItem[];
  photos: { before: number; progress: number; after: number };
  invoices: { id: string; amount: number; status: "draft" | "sent" | "paid"; date: string }[];
}
export interface Subcontractor { id: string; name: string; trade: string; markets: string[]; licenseOnFile: boolean; coiExpires: string; onTimeRate: number; callbackRate: number; activeJobs: number }

export const demoData = {
  accounts: [
    { id: "acct_harbor", name: "Harborline Property Management (demo)", type: "property-manager", market: "massachusetts" },
    { id: "acct_ridge", name: "Ridgeway Residential (demo)", type: "portfolio-owner", market: "massachusetts" },
  ] as Account[],
  owners: [
    { id: "own_1", accountId: "acct_harbor", name: "Dorchester Holdings LLC (demo)" },
    { id: "own_2", accountId: "acct_harbor", name: "Pond Street Trust (demo)" },
    { id: "own_3", accountId: "acct_ridge", name: "Ridgeway Residential (demo)" },
  ] as Owner[],
  properties: [
    { id: "prop_1", accountId: "acct_harbor", ownerId: "own_1", address: "14 Example Ave", city: "Dorchester", units: 6, yearBuilt: 1915 },
    { id: "prop_2", accountId: "acct_harbor", ownerId: "own_2", address: "220 Sample St", city: "Jamaica Plain", units: 3, yearBuilt: 1905 },
    { id: "prop_3", accountId: "acct_harbor", ownerId: "own_1", address: "9 Demo Terrace", city: "Quincy", units: 12, yearBuilt: 1968 },
    { id: "prop_4", accountId: "acct_ridge", ownerId: "own_3", address: "77 Placeholder Rd", city: "Medford", units: 24, yearBuilt: 1972 },
  ] as Property[],
  projects: [
    {
      id: "PW-1041", propertyId: "prop_1", unit: "Unit 2", title: "2BR turnover — paint, LVP, bath refresh", service: "rental-turnovers", stage: "in-progress", contractType: "fixed-price",
      pm: "Coordinator A", subs: ["sub_paint", "sub_floor"], estimate: 8450, contractValue: 8900, costToDate: 3900, forecastCost: 6250, start: "2026-10-27", due: "2026-11-06",
      changeOrders: [{ id: "CO-1", description: "Replace water-damaged subfloor under kitchen sink (8 sq ft)", amount: 450, status: "approved", requestedAt: "2026-10-29" }],
      punch: [{ id: "p1", text: "Touch up hallway trim", done: false }, { id: "p2", text: "Replace bath outlet cover", done: true }],
      photos: { before: 18, progress: 9, after: 0 }, invoices: [{ id: "INV-311", amount: 4450, status: "sent", date: "2026-10-27" }],
    },
    {
      id: "PW-1038", propertyId: "prop_2", unit: "Unit 1", title: "Bathroom remodel — tier 2", service: "bathroom-remodeling", stage: "punch-list", contractType: "fixed-price",
      pm: "Coordinator A", subs: ["sub_plumb", "sub_tile"], estimate: 13800, contractValue: 13800, costToDate: 9600, forecastCost: 9900, start: "2026-10-12", due: "2026-11-03",
      changeOrders: [], punch: [{ id: "p3", text: "Re-caulk tub edge", done: false }, { id: "p4", text: "Adjust vanity door", done: false }],
      photos: { before: 12, progress: 22, after: 4 }, invoices: [{ id: "INV-305", amount: 6900, status: "paid", date: "2026-10-12" }],
    },
    {
      id: "PW-1046", propertyId: "prop_3", unit: "Units 4 & 7", title: "Two-unit make-ready", service: "rental-turnovers", stage: "proposal", contractType: "fixed-price",
      pm: "Coordinator B", subs: [], estimate: 11200, contractValue: 0, costToDate: 0, forecastCost: 7650, start: "2026-11-09", due: "2026-11-20",
      changeOrders: [], punch: [], photos: { before: 26, progress: 0, after: 0 }, invoices: [],
    },
    {
      id: "PW-1029", propertyId: "prop_4", unit: "Building B common areas", title: "Stairwell paint + LVP corridors", service: "capital-improvements", stage: "scheduled", contractType: "cost-plus-gmp",
      pm: "Coordinator B", subs: ["sub_paint", "sub_floor"], estimate: 42000, contractValue: 44500, costToDate: 0, forecastCost: 36900, start: "2026-11-16", due: "2026-12-11",
      changeOrders: [{ id: "CO-2", description: "Add stair nosing replacement, 3 flights", amount: 2500, status: "pending", requestedAt: "2026-10-30" }],
      punch: [], photos: { before: 31, progress: 0, after: 0 }, invoices: [{ id: "INV-298", amount: 8900, status: "paid", date: "2026-10-20" }],
    },
    {
      id: "PW-1017", propertyId: "prop_4", unit: "Unit 12", title: "Full unit renovation", service: "full-rehab", stage: "paid", contractType: "fixed-price",
      pm: "Coordinator A", subs: ["sub_plumb", "sub_elec", "sub_floor", "sub_paint"], estimate: 31500, contractValue: 33100, costToDate: 24200, forecastCost: 24200, start: "2026-08-18", due: "2026-09-26",
      changeOrders: [{ id: "CO-3", description: "Upgrade to quartz counters", amount: 1600, status: "approved", requestedAt: "2026-08-29" }],
      punch: [{ id: "p5", text: "All items closed", done: true }], photos: { before: 20, progress: 44, after: 24 }, invoices: [{ id: "INV-270", amount: 33100, status: "paid", date: "2026-09-30" }],
    },
  ] as Project[],
  subcontractors: [
    { id: "sub_paint", name: "Painting crew (demo)", trade: "Painting & drywall", markets: ["massachusetts"], licenseOnFile: true, coiExpires: "2027-03-01", onTimeRate: 0.94, callbackRate: 0.03, activeJobs: 2 },
    { id: "sub_floor", name: "Flooring installer (demo)", trade: "Flooring", markets: ["massachusetts"], licenseOnFile: true, coiExpires: "2026-12-15", onTimeRate: 0.9, callbackRate: 0.05, activeJobs: 2 },
    { id: "sub_plumb", name: "Licensed plumber (demo)", trade: "Plumbing", markets: ["massachusetts"], licenseOnFile: true, coiExpires: "2027-01-31", onTimeRate: 0.86, callbackRate: 0.04, activeJobs: 1 },
    { id: "sub_tile", name: "Tile setter (demo)", trade: "Tile", markets: ["massachusetts"], licenseOnFile: true, coiExpires: "2026-11-20", onTimeRate: 0.92, callbackRate: 0.02, activeJobs: 1 },
    { id: "sub_elec", name: "Licensed electrician (demo)", trade: "Electrical", markets: ["massachusetts"], licenseOnFile: true, coiExpires: "2027-05-10", onTimeRate: 0.95, callbackRate: 0.01, activeJobs: 0 },
  ] as Subcontractor[],
};

/* ───── Access-scoped queries (customer side) ───── */
export const accountProperties = (accountId: string) => demoData.properties.filter((p) => p.accountId === accountId);
export function accountProjects(accountId: string) {
  const ids = new Set(accountProperties(accountId).map((p) => p.id));
  return demoData.projects.filter((p) => ids.has(p.propertyId));
}
export const accountOwners = (accountId: string) => demoData.owners.filter((o) => o.accountId === accountId);

/* ───── Admin metrics ───── */
export const margin = (p: Project) => {
  const rev = p.contractValue + p.changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  return { revenue: rev, cost: p.forecastCost, gm: rev - p.forecastCost, gmPct: rev ? (rev - p.forecastCost) / rev : 0 };
};

export const STAGES: ProjectStage[] = ["requested", "estimating", "proposal", "approved", "scheduled", "in-progress", "punch-list", "complete", "invoiced", "paid"];
