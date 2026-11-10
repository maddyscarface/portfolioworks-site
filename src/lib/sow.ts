/**
 * Scope-of-work / proposal generator for the three packaged offers.
 * Produces Markdown that can be pasted into GHL Documents & Contracts or rendered to PDF.
 * State-specific clauses are placeholders that MUST be reviewed by counsel per state.
 */
import type { LineItem } from "@/lib/calculators";
import type { MarketId } from "@/config/markets";
import { site } from "@/config/site";

export type Offer = "single-unit-turnover" | "rental-rehab" | "portfolio-partner";
export type Agreement = "fixed-price" | "time-and-materials" | "cost-plus-gmp";

export interface SowInput {
  offer: Offer;
  agreement: Agreement;
  market: MarketId;
  client: { name: string; contact: string; email: string };
  property: { address: string; unit?: string; yearBuilt?: number };
  lines: (LineItem & { price: number; qty?: number; unit?: string })[];
  allowances?: { label: string; amount: number }[];
  exclusions?: string[];
  startDate: string;
  completionDate: string;
  contingencyPct?: number; // rehab
  gmp?: number; // cost-plus
  feePct?: number; // cost-plus
  nte?: number; // T&M
  laborRate?: number; // T&M
  materialMarkupPct?: number; // T&M
  rateCard?: { item: string; price: string }[]; // partner
  pilot?: { property: string; criteria: string[] }; // partner
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const stateClauses: Record<MarketId, string[]> = {
  massachusetts: [
    "[COUNSEL REVIEW] Home Improvement Contractor registration no. {{MA_HIC}} — include where M.G.L. c.142A applies (1–4 unit owner-occupied residential).",
    "[COUNSEL REVIEW] Deposit, payment schedule, start/substantial completion dates and cancellation rights per c.142A where applicable.",
    "Lead-safe renovation practices apply to work disturbing painted surfaces in pre-1978 housing.",
  ],
  florida: [
    "[COUNSEL REVIEW] Florida contractor license no. {{FL_LICENSE}}.",
    "[COUNSEL REVIEW] Florida Homeowners' Construction Recovery Fund notice and construction lien law notice where required.",
  ],
  maine: ["[COUNSEL REVIEW] Terms required by the Maine Home Construction Contracts Act for residential work over $3,000."],
};

const defaultExclusions = [
  "Hazardous material abatement (asbestos, mold remediation) unless separately scoped",
  "Work concealed in walls/floors not visible at walkthrough — addressed by change order",
  "Permit and inspection fees unless listed",
  "Appliance purchase unless listed",
  "Tenant relocation and personal property moving",
];

export function generateSow(i: SowInput): string {
  const sub = i.lines.reduce((s, l) => s + l.price, 0);
  const allow = (i.allowances ?? []).reduce((s, a) => s + a.amount, 0);
  const contingency = i.offer === "rental-rehab" && i.contingencyPct ? Math.round((sub + allow) * (i.contingencyPct / 100)) : 0;
  const total = sub + allow + contingency;
  const title = { "single-unit-turnover": "Single-Unit Turnover Proposal", "rental-rehab": "Rental Rehab Proposal", "portfolio-partner": "Portfolio Partner Proposal" }[i.offer];

  const out: string[] = [];
  out.push(`# ${title}`, `**${site.legalName}** · ${site.tagline}`, "");
  out.push(`**Client:** ${i.client.name} — ${i.client.contact} (${i.client.email})`);
  out.push(`**Property:** ${i.property.address}${i.property.unit ? `, ${i.property.unit}` : ""}${i.property.yearBuilt ? ` · built ${i.property.yearBuilt}` : ""}`);
  out.push(`**Agreement type:** ${i.agreement}`, `**Schedule:** start ${i.startDate} · target completion ${i.completionDate}`, "");

  if (i.offer === "portfolio-partner") {
    out.push("## 1. Relationship structure", "- One coordinator as single point of contact", "- Work requested through the client portal; each request receives a written scope", "- Approval thresholds per user; above-threshold items route to the owner entity", "- Quarterly business review: spend, cycle times, open items", "");
    if (i.pilot) {
      out.push("## 2. Pilot", `Pilot property: ${i.pilot.property}`, "Success criteria:", ...i.pilot.criteria.map((c) => `- ${c}`), "");
    }
    if (i.rateCard?.length) {
      out.push("## 3. Rate card", "| Item | Price |", "|---|---|", ...i.rateCard.map((r) => `| ${r.item} | ${r.price} |`), "");
    }
    out.push("## 4. Term", "Master service agreement for 12 months after a successful pilot; either party may terminate on 30 days' written notice. Individual projects remain governed by their approved scope.", "");
  }

  if (i.lines.length) {
    out.push(`## ${i.offer === "portfolio-partner" ? "5" : "1"}. Scope of work`, "| # | Category | Description | Price |", "|---|---|---|---|");
    i.lines.forEach((l, n) => out.push(`| ${n + 1} | ${l.category} | ${l.label}${l.qty ? ` (${l.qty} ${l.unit ?? "ea"})` : ""} | ${usd(l.price)} |`));
    if (i.allowances?.length) i.allowances.forEach((a) => out.push(`| A | Allowance | ${a.label} | ${usd(a.amount)} |`));
    if (contingency) out.push(`| C | Contingency | ${i.contingencyPct}% — used only by approved change order | ${usd(contingency)} |`);
    out.push(`| | | **Total** | **${usd(total)}** |`, "");
  }

  out.push("## Pricing terms");
  if (i.agreement === "fixed-price") out.push(`Fixed price of ${usd(total)} for the scope above. Each line may be approved, deferred or removed individually before signing.`);
  if (i.agreement === "time-and-materials") out.push(`Labor at ${usd(i.laborRate ?? 0)}/hour; materials at cost plus ${i.materialMarkupPct ?? 0}%. Not-to-exceed ${usd(i.nte ?? 0)} without a signed change order. Daily logs and receipts provided.`);
  if (i.agreement === "cost-plus-gmp") out.push(`Actual cost of the work plus a fee of ${i.feePct ?? 0}%, with a guaranteed maximum price of ${usd(i.gmp ?? total)}. Open-book reporting of all costs and subcontractor invoices.`);
  out.push("");

  const sched =
    i.offer === "rental-rehab"
      ? ["10% on signing", "Progress payments at milestones: demolition complete, rough-in/inspection passed, finishes complete", "Final 10% at punch-list completion"]
      : ["50% on scheduling", "50% on completion"];
  out.push("## Payment schedule", ...sched.map((s) => `- ${s}`), "[COUNSEL REVIEW] Confirm deposit limits for the applicable state and contract type.", "");
  out.push("## Change orders", "Work outside this scope requires a written change order describing the work, reason, price and schedule impact, approved before work begins (emergency make-safe excepted and documented).", "");
  out.push("## Exclusions", ...[...(i.exclusions ?? []), ...defaultExclusions].map((e) => `- ${e}`), "");
  out.push("## Deliverables at completion", "- Before/after photo set by room", "- Completion record: work performed, products, paint colors, SKUs", "- Signed change orders and final invoice tied to this scope", "");
  out.push("## Licensing & insurance", "Licensed trade work is performed by appropriately licensed contractors. Certificate of insurance provided on request.", ...stateClauses[i.market].map((c) => `- ${c}`), "");
  out.push("## Acceptance", "Client signature / date: ____________________", "PortfolioWorks signature / date: ____________________");
  return out.join("\n");
}
