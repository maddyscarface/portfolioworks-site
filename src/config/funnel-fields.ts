/**
 * Funnel-specific qualification fields (specs/03 §2). Rendered by LeadForm on the property/project step,
 * validated server-side against this list (unknown keys dropped), stored on the lead, written to GHL as
 * `pw_d_<key>` custom fields + the opportunity note. Never sent to ad platforms or intent vendors.
 */
export type DetailField = {
  key: string;
  label: string;
  type: "select" | "text" | "textarea" | "chips";
  options?: [string, string][];
  placeholder?: string;
  full?: boolean;
};
export type FunnelGroup = "turnover" | "rehab" | "portfolio";

const OCCUPANCY: [string, string][] = [["vacant", "Vacant"], ["tenant-leaving", "Occupied — tenant moving out"], ["occupied", "Occupied — tenant staying"]];

export const FUNNEL_FIELDS: Record<FunnelGroup, DetailField[]> = {
  // Unit Turnover: location, units, occupancy/vacancy dates, unit size, scope, condition/photos, access,
  // budget, next tenant date, who approves work, current property manager.
  turnover: [
    { key: "occupancy", label: "Occupancy", type: "select", options: OCCUPANCY },
    { key: "unit_size", label: "Unit size", type: "select", options: [["studio", "Studio"], ["1br", "1 bedroom"], ["2br", "2 bedrooms"], ["3br", "3 bedrooms"], ["4br-plus", "4+ bedrooms"], ["mixed", "Several / mixed"]] },
    { key: "access", label: "Access", type: "select", options: [["lockbox", "Lockbox / keys on site"], ["pm-lets-in", "Property manager lets us in"], ["tenant", "Tenant present — coordinate"], ["owner", "Owner meets us"], ["tbd", "To be arranged"]] },
    { key: "approver", label: "Who approves the work?", type: "select", options: [["me", "I do"], ["owner", "The owner"], ["pm", "Property manager"], ["board", "Board / committee"], ["lender", "Lender / investor group"]] },
    { key: "current_pm", label: "Current property manager (if any)", type: "text", placeholder: "Company or name — optional", full: true },
  ],
  // Rehab/Renovation: address, property type, occupied vs vacant, scope + trade dependencies, budget,
  // earliest start, design/permit status, plans, photos.
  rehab: [
    { key: "property_type", label: "Property type", type: "select", options: [["single-family", "Single-family"], ["2-4-family", "2–4 family"], ["multifamily", "Multifamily (5+ units)"], ["condo", "Condo unit"], ["mixed-use", "Mixed-use"]] },
    { key: "occupancy", label: "Occupied or vacant during work?", type: "select", options: [["vacant", "Vacant"], ["occupied", "Occupied"], ["partial", "Some units occupied"]] },
    { key: "design_status", label: "Design / permit status", type: "select", options: [["none", "No plans yet"], ["sketches", "Sketches / scope list"], ["drawings", "Architect or designer drawings"], ["permit-ready", "Permit-ready set"], ["permitted", "Permit issued"]] },
    { key: "trade_dependencies", label: "Trade dependencies or constraints", type: "text", placeholder: "e.g. structural before kitchen, HOA approval" },
  ],
  // Portfolio Program: company/contact, geography, doors/units, turns/year, project mix, preferred SLA,
  // procurement/onboarding/insurance requirements, current service gaps. Consultation before proposal.
  portfolio: [
    { key: "geography", label: "Geography (towns / submarkets)", type: "text", placeholder: "e.g. Quincy, Dorchester, Brookline", full: true },
    { key: "turns_per_year", label: "Average turns per year", type: "select", options: [["lt-5", "Fewer than 5"], ["5-20", "5–20"], ["20-50", "20–50"], ["50-150", "50–150"], ["150-plus", "150+"]] },
    { key: "project_mix", label: "Project mix", type: "chips", options: [["turnovers", "Turnovers"], ["maintenance", "Recurring maintenance"], ["capex", "Capital improvements"], ["rehab", "Rehabs"], ["exterior", "Exterior"]] },
    { key: "preferred_sla", label: "Preferred response standard", type: "select", options: [["24h", "Reply within 1 business day"], ["48h-scope", "Scope within 48h of access"], ["weekly", "Weekly scheduling cadence"], ["discuss", "Let's discuss"]] },
    { key: "procurement", label: "Procurement, onboarding or insurance requirements", type: "text", placeholder: "e.g. COI limits, W-9, vendor portal, background checks", full: true },
    { key: "service_gaps", label: "Current service gaps", type: "textarea", placeholder: "What isn't working with current vendors?", full: true },
  ],
};

export function funnelGroup(funnel: string): FunnelGroup | null {
  if (funnel === "turnover" || funnel === "urgent") return "turnover";
  if (funnel === "rehab") return "rehab";
  if (funnel === "portfolio") return "portfolio";
  return null;
}

/** Keep only known keys/options for the lead's funnel; trim free text. */
export function sanitizeDetails(funnel: string, raw: Record<string, unknown> | undefined): Record<string, string> {
  const g = funnelGroup(funnel);
  if (!g || !raw) return {};
  const out: Record<string, string> = {};
  for (const f of FUNNEL_FIELDS[g]) {
    const v = raw[f.key];
    if (v == null || v === "") continue;
    if (f.type === "select") { if (typeof v === "string" && f.options!.some(([o]) => o === v)) out[f.key] = v; }
    else if (f.type === "chips") {
      const arr = (Array.isArray(v) ? v : String(v).split(",")).map(String).filter((x) => f.options!.some(([o]) => o === x));
      if (arr.length) out[f.key] = arr.join(",");
    } else out[f.key] = String(v).trim().slice(0, f.type === "textarea" ? 1200 : 300);
  }
  return out;
}

export function detailLabel(funnel: string, key: string, value: string) {
  const g = funnelGroup(funnel);
  const f = g ? FUNNEL_FIELDS[g].find((x) => x.key === key) : undefined;
  if (!f) return `${key}: ${value}`;
  const v = f.options ? value.split(",").map((x) => f.options!.find(([o]) => o === x)?.[1] ?? x).join(", ") : value;
  return `${f.label}: ${v}`;
}
