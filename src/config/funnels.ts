import type { FunnelConfig } from "@/components/templates";
import { site } from "@/config/site";

/** Dedicated paid-traffic conversion pages. Map ads → these URLs (see docs/08 & 09). */
export const funnels: Record<string, FunnelConfig & { title: string; description: string }> = {
  "rental-turnover": {
    title: "Get Your Unit Ready for the Next Tenant | PortfolioWorks",
    description: "Request a rental turnover scope, price and schedule from one accountable contractor in Greater Boston, including access notes, trade sequence and closeout.",
    funnel: "turnover",
    eyebrow: "Funnel A · Rental turnovers",
    offer: "Get Your Unit Ready for the Next Tenant.",
    sub: "Tell us about the unit and send a few photos. We'll scope it line by line, give you a schedule and run every trade to a documented, rent-ready finish.",
    bullets: ["Line-item turnover estimate", "One coordinator for paint, floors, fixtures, repairs and cleaning", "Change orders approved in writing before work", "Before/after photo record for every unit"],
    proof: [
      { t: "Scope from photos", d: "Light and moderate turns can often be scoped without waiting for a site visit." },
      { t: "Sequenced trades", d: "Repairs, paint, floors, fixtures and cleaning run in order—no trade waits on another." },
      { t: "Records for next time", d: "Paint colors and flooring products saved to your property so the next turn matches." },
    ],
    defaultServices: ["rental-turnovers"],
    defaultType: "landlord",
  },
  "portfolio-partnership": {
    title: "One Vendor Relationship for Your Portfolio | PortfolioWorks",
    description: "Discuss a portfolio partnership: a pilot unit, a documented rate card, approved-vendor setup, and recurring turnover and renovation work across your units.",
    funnel: "portfolio",
    eyebrow: "Funnel B · Portfolio partnerships",
    offer: "One Vendor Relationship for Your Portfolio's Renovation Needs.",
    sub: "For owners and managers with recurring turnovers and improvements. Start with a single pilot unit; expand only if it meets your standard.",
    bullets: ["Discovery call and portfolio review", "Pilot unit before any agreement", "Agreed rate card and standard unit packages", "Portal access with owner-separated records and invoicing"],
    proof: [
      { t: "No retainer to start", d: "The pilot unit is priced like any other job." },
      { t: "Approval thresholds", d: "Your team approves within limits; larger items route to the owner." },
      { t: "Quarterly reviews", d: "Spend, cycle times and open items reviewed with you each quarter." },
    ],
    defaultServices: ["property-maintenance", "rental-turnovers"],
    defaultType: "property-manager",
  },
  "value-add-rehab": {
    title: "Turn a Renovation Plan Into a Scope | PortfolioWorks",
    description: "Turn a renovation plan into an executable rehab scope, budget and schedule for value-add and acquisition work, with line items, allowances and exclusions.",
    funnel: "rehab",
    eyebrow: "Funnel C · Value-add investors",
    offer: "Turn Your Renovation Plan Into an Executable Scope.",
    sub: "Share the property, your business plan and budget. We'll review the scope, walk the site and deliver a proposal with schedule, milestones and contingency.",
    bullets: ["Pre- or post-acquisition scope review", "Budget with allowances and contingency", "Milestone schedule and draw-friendly payment terms", "Weekly photo reporting and change-order log"],
    proof: [
      { t: "Underwrite with real numbers", d: "Scope before closing to support your offer and lender package." },
      { t: "Unit packages", d: "Fixed per-unit pricing for repeatable interior upgrades." },
      { t: "Open-book option", d: "Cost-plus with a guaranteed maximum price where conditions are uncertain." },
    ],
    defaultServices: ["full-rehab"],
    defaultType: "investor",
  },
  "trade-work": {
    title: "Need One Trade or a Full Rehab? Start Here. | PortfolioWorks",
    description: "Request painting, flooring, bathrooms, carpentry or a full renovation from one team, whether you need a single trade or a complete coordinated scope.",
    funnel: "trade",
    eyebrow: "Funnel D · À la carte",
    offer: "Need One Trade or a Full Rehab? Start Here.",
    sub: "Painting, flooring, bathrooms, carpentry or a full renovation—tell us what you need and we'll price exactly that.",
    bullets: ["Book a single trade with a written estimate", "Add trades later without starting over", "Licensed plumbing, electrical and HVAC coordinated", "Same documentation standard as full projects"],
    proof: [
      { t: "Exactly what you asked for", d: "No upselling a full renovation when you need a repaint." },
      { t: "Itemized pricing", d: "Every item priced so you can approve or defer." },
      { t: "Upgrade path", d: "If more work turns up, you get a separate written option—never a surprise." },
    ],
  },
  "urgent-turnover": {
    title: "Time-Sensitive Rental Turnover | PortfolioWorks",
    description: "If a move-in date is approaching, submit the unit for a rapid availability and scope review. Timing depends on access, materials and current schedule.",
    funnel: "urgent",
    eyebrow: "Funnel E · Time-sensitive turnovers",
    offer: "Move-in Date Coming Up? Get a Rapid Scope Review.",
    sub: site.urgentTurnoverStaffed
      ? `${site.urgentResponseCopy}. Submit the unit details and photos now.`
      : "Submit the unit, photos and your deadline. A coordinator reviews time-sensitive requests first and tells you honestly what can be completed by your date.",
    bullets: ["Deadline-first review of your request", "Scope prioritized: what must be done vs. what can wait", "Honest answer on what's achievable by your date", "No emergency fees promised or charged without written agreement"],
    proof: [
      { t: "Prioritized scope", d: "We separate move-in critical items from cosmetic items so the deadline is protected." },
      { t: "Clear commitments", d: "We only commit to dates we can staff." },
      { t: "Same standard", d: "Rushed doesn't mean undocumented—photos and records still apply." },
    ],
    defaultServices: ["rental-turnovers"],
  },
};
